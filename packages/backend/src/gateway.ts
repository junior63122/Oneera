/**
 * Passerelle temps réel ONEERA (WebSocket).
 *
 * - Authentification par jeton signé (sub = utilisateur, ev = événement).
 * - Le téléphone publie une position DÉJÀ qualifiée par le moteur (pas de recalcul serveur).
 * - Chaque message est validé (format, bornes, débit, séquence) puis :
 *     1) diffusé immédiatement aux seuls amis autorisés connectés (audience calculée par la base) ;
 *     2) écrit par lots en base (dernière position + historique à rétention courte).
 * - Toute modification de partage/consentement/amitié (NOTIFY share_changed) invalide l'audience
 *   et retire la position chez ceux qui n'y ont plus droit.
 *
 * Limite actuelle : diffusion intra-instance. Le passage multi-instances se fait via un bus
 * (Redis pub/sub par événement) derrière l'interface `Bus` — à implémenter avant la charge cible.
 */
import { createServer, IncomingMessage, Server } from 'node:http';
import { jwtVerify, SignJWT } from 'jose';
import pg from 'pg';
import { WebSocket, WebSocketServer } from 'ws';
import { Pool, withContext } from './db';

export interface PositionMsg {
  type: 'pos';
  seq: number;
  /** Horodatage de la mesure (ms epoch, horloge du téléphone). */
  t: number;
  floorId: string;
  x: number;
  y: number;
  r68: number;
  zoneKey?: string;
  zoneProb?: number;
  quality: 'precise' | 'zone' | 'coarse';
}

/** Messages serveur → client. */
export type ServerMsg =
  | { type: 'snapshot'; friends: FriendPosition[] }
  | { type: 'friend'; pos: FriendPosition }
  | { type: 'gone'; userId: string; reason: 'share_stopped' }
  | { type: 'error'; code: string };

export interface FriendPosition {
  userId: string;
  seq: number;
  t: number;
  floorId: string;
  x: number;
  y: number;
  r68: number;
  zoneKey?: string;
  zoneProb?: number;
  quality: string;
  /** Horodatage serveur d'émission (ms) — permet de mesurer la latence et l'obsolescence. */
  sentAt: number;
}

export interface GatewayOptions {
  pool: Pool;
  /** Chaîne de connexion dédiée à LISTEN (connexion persistante). */
  listenUrl: string;
  secret: Uint8Array;
  /** Débit maximal accepté par client (messages/s). */
  maxRate?: number;
  /** Intervalle d'écriture groupée (ms). */
  flushMs?: number;
  /** Durée de vie du cache d'audience (ms) — filet de sécurité en plus de NOTIFY. */
  audienceTtlMs?: number;
}

interface Conn {
  ws: WebSocket;
  userId: string;
  eventId: string;
  lastSeq: number;
  tokens: number;
  lastRefill: number;
}

export async function issueToken(secret: Uint8Array, userId: string, eventId: string, ttl = '12h'): Promise<string> {
  return new SignJWT({ ev: eventId }).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt().setExpirationTime(ttl).sign(secret);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validatePosition(m: unknown): PositionMsg | null {
  if (!m || typeof m !== 'object') return null;
  const p = m as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  if (p.type !== 'pos') return null;
  if (!num(p.seq, 0, Number.MAX_SAFE_INTEGER) || !Number.isInteger(p.seq)) return null;
  if (!num(p.t, 1.6e12, 4e12)) return null;
  if (typeof p.floorId !== 'string' || p.floorId.length > 32) return null;
  if (!num(p.x, -5000, 5000) || !num(p.y, -5000, 5000) || !num(p.r68, 0, 1000)) return null;
  if (!['precise', 'zone', 'coarse'].includes(p.quality as string)) return null;
  if (p.zoneKey !== undefined && (typeof p.zoneKey !== 'string' || p.zoneKey.length > 64)) return null;
  if (p.zoneProb !== undefined && !num(p.zoneProb, 0, 1)) return null;
  return p as unknown as PositionMsg;
}

export class Gateway {
  readonly server: Server;
  private readonly wss: WebSocketServer;
  private readonly conns = new Map<string, Set<Conn>>(); // userId → connexions
  private readonly audience = new Map<string, { viewers: Set<string>; at: number }>(); // owner|event → viewers
  private pending: Record<string, unknown>[] = [];
  private flushTimer?: NodeJS.Timeout;
  private listener?: pg.Client;
  readonly stats = { received: 0, rejected: 0, delivered: 0, flushed: 0, flushErrors: 0 };

  constructor(private readonly opts: GatewayOptions) {
    this.server = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, connections: this.connectionCount, ...this.stats }));
    });
    this.wss = new WebSocketServer({ server: this.server, maxPayload: 4096 });
    this.wss.on('connection', (ws, req) => void this.onConnection(ws, req));
  }

  get connectionCount(): number {
    let n = 0;
    for (const s of this.conns.values()) n += s.size;
    return n;
  }

  async listen(port = 0): Promise<number> {
    this.listener = new pg.Client({ connectionString: this.opts.listenUrl });
    await this.listener.connect();
    await this.listener.query('LISTEN share_changed');
    this.listener.on('notification', (n) => {
      if (n.channel === 'share_changed' && n.payload) void this.onShareChanged(n.payload);
    });
    this.flushTimer = setInterval(() => void this.flush(), this.opts.flushMs ?? 300);
    await new Promise<void>((r) => this.server.listen(port, r));
    const addr = this.server.address();
    return typeof addr === 'object' && addr ? addr.port : port;
  }

  async close(): Promise<void> {
    clearInterval(this.flushTimer);
    await this.flush();
    for (const ws of this.wss.clients) ws.terminate();
    await new Promise<void>((r) => this.wss.close(() => r()));
    await new Promise<void>((r) => this.server.close(() => r()));
    await this.listener?.end();
  }

  // ------------------------------------------------------------------ connexion

  private async onConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    let userId: string;
    let eventId: string;
    try {
      const token = new URL(req.url ?? '', 'http://x').searchParams.get('token') ?? '';
      const { payload } = await jwtVerify(token, this.opts.secret, { algorithms: ['HS256'] });
      if (typeof payload.sub !== 'string' || !UUID.test(payload.sub) || typeof payload.ev !== 'string' || !UUID.test(payload.ev)) throw new Error('jeton');
      userId = payload.sub;
      eventId = payload.ev;
    } catch {
      ws.close(4401, 'unauthorized');
      return;
    }
    const conn: Conn = { ws, userId, eventId, lastSeq: -1, tokens: this.opts.maxRate ?? 2, lastRefill: Date.now() };
    let set = this.conns.get(userId);
    if (!set) this.conns.set(userId, (set = new Set()));
    set.add(conn);
    ws.on('close', () => {
      set!.delete(conn);
      if (!set!.size) this.conns.delete(userId);
    });
    ws.on('message', (data) => this.onMessage(conn, data.toString()));
    // Instantané initial : lu AVEC les droits du lecteur (RLS) → uniquement les partages actifs.
    try {
      const rows = await withContext(this.opts.pool, { userId }, async (c) =>
        (await c.query(
          `SELECT user_id, seq, measured_at, floor_id, ST_X(pos) AS x, ST_Y(pos) AS y, r68, zone_key, zone_prob, quality
           FROM live_positions WHERE event_id = $1 AND user_id <> $2`, [eventId, userId])).rows);
      const now = Date.now();
      this.send(ws, {
        type: 'snapshot',
        friends: rows.map((r) => ({
          userId: r.user_id, seq: Number(r.seq), t: new Date(r.measured_at).getTime(), floorId: r.floor_id, x: r.x, y: r.y,
          r68: r.r68, zoneKey: r.zone_key ?? undefined, zoneProb: r.zone_prob ?? undefined, quality: r.quality, sentAt: now,
        })),
      });
    } catch {
      this.send(ws, { type: 'error', code: 'snapshot_failed' });
    }
  }

  private onMessage(conn: Conn, raw: string): void {
    this.stats.received++;
    // Seau à jetons : débit maximal par connexion.
    const now = Date.now();
    const rate = this.opts.maxRate ?? 2;
    conn.tokens = Math.min(rate * 2, conn.tokens + ((now - conn.lastRefill) / 1000) * rate);
    conn.lastRefill = now;
    if (conn.tokens < 1) {
      this.stats.rejected++;
      return this.send(conn.ws, { type: 'error', code: 'rate_limited' });
    }
    conn.tokens -= 1;
    let msg: PositionMsg | null = null;
    try {
      msg = validatePosition(JSON.parse(raw));
    } catch {
      msg = null;
    }
    if (!msg) {
      this.stats.rejected++;
      return this.send(conn.ws, { type: 'error', code: 'invalid' });
    }
    if (msg.seq <= conn.lastSeq) {
      this.stats.rejected++;
      return; // message ancien ou rejoué : ignoré silencieusement
    }
    conn.lastSeq = msg.seq;
    this.pending.push({
      u: conn.userId, e: conn.eventId, seq: msg.seq, t: new Date(msg.t).toISOString(), floor: msg.floorId,
      x: msg.x, y: msg.y, r68: msg.r68, zone: msg.zoneKey ?? null, zp: msg.zoneProb ?? null, q: msg.quality,
    });
    void this.fanOut(conn, msg);
  }

  // ------------------------------------------------------------------ diffusion

  private async audienceOf(owner: string, eventId: string): Promise<Set<string>> {
    const key = `${owner}|${eventId}`;
    const hit = this.audience.get(key);
    const ttl = this.opts.audienceTtlMs ?? 15_000;
    if (hit && Date.now() - hit.at < ttl) return hit.viewers;
    const rows = (await this.opts.pool.query('SELECT app.audience_of($1, $2) AS v', [owner, eventId])).rows;
    const viewers = new Set<string>(rows.map((r) => r.v));
    this.audience.set(key, { viewers, at: Date.now() });
    return viewers;
  }

  private async fanOut(conn: Conn, msg: PositionMsg): Promise<void> {
    let viewers: Set<string>;
    try {
      viewers = await this.audienceOf(conn.userId, conn.eventId);
    } catch {
      return; // en cas de doute, on ne diffuse pas
    }
    const pos: FriendPosition = {
      userId: conn.userId, seq: msg.seq, t: msg.t, floorId: msg.floorId, x: msg.x, y: msg.y, r68: msg.r68,
      zoneKey: msg.zoneKey, zoneProb: msg.zoneProb, quality: msg.quality, sentAt: Date.now(),
    };
    for (const v of viewers) {
      const set = this.conns.get(v);
      if (!set) continue;
      for (const c of set) {
        if (c.eventId !== conn.eventId) continue;
        this.send(c.ws, { type: 'friend', pos });
        this.stats.delivered++;
      }
    }
  }

  /** Un partage, un consentement ou une amitié de `owner` a changé. */
  private async onShareChanged(owner: string): Promise<void> {
    const affected = [...this.audience.entries()].filter(([k]) => k.startsWith(owner + '|'));
    for (const [key, { viewers: before }] of affected) {
      this.audience.delete(key);
      const eventId = key.split('|')[1];
      let after: Set<string>;
      try {
        after = await this.audienceOf(owner, eventId);
      } catch {
        after = new Set();
      }
      for (const v of before) {
        if (after.has(v)) continue;
        for (const c of this.conns.get(v) ?? []) {
          if (c.eventId === eventId) this.send(c.ws, { type: 'gone', userId: owner, reason: 'share_stopped' });
        }
      }
    }
    // L'audience inverse (ce que `owner` voit) peut aussi changer : on purge les entrées où il est spectateur.
    for (const [key, entry] of this.audience) if (entry.viewers.has(owner)) this.audience.delete(key);
  }

  // ------------------------------------------------------------------ persistance

  async flush(): Promise<void> {
    if (!this.pending.length) return;
    const batch = this.pending;
    this.pending = [];
    try {
      await this.opts.pool.query('SELECT app.ingest_positions($1::jsonb)', [JSON.stringify(batch)]);
      this.stats.flushed += batch.length;
    } catch {
      this.stats.flushErrors++;
    }
  }

  private send(ws: WebSocket, m: ServerMsg): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  }
}
