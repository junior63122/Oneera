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
 * - Présence : « en ligne » à la première connexion, « hors ligne » après un délai de grâce quand la dernière
 *   connexion se ferme ; battement de cœur (ping/pong) pour détecter les connexions mobiles mortes.
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
  /** Activité estimée par le téléphone (avatar vivant) : danse, marche, immobile. */
  act?: 'dance' | 'walk' | 'still';
  /** Batterie du téléphone en % (facultatif) : l'avatar s'endort quand elle est presque vide. */
  bat?: number;
}

/** Messages serveur → client. */
export type ServerMsg =
  | { type: 'snapshot'; friends: FriendPosition[] }
  | { type: 'friend'; pos: FriendPosition }
  | { type: 'gone'; userId: string; reason: 'share_stopped' }
  /** Présence d'un ami (connecté / hors ligne), envoyée aux seuls spectateurs autorisés. */
  | { type: 'presence'; userId: string; online: boolean; at: number }
  | { type: 'refresh'; what: 'friends' | 'programme' }
  /** Signalement nouveau ou mis à jour : envoyé au staff de l'organisation. */
  | { type: 'incident'; id: string; eventId: string; status: string; isNew: boolean }
  /** Suivi de son propre signalement (Reçue → En route → Sur place → Résolue). */
  | { type: 'report'; id: string; status: string }
  /** Message d'un ami (ou envoyé depuis un autre appareil du même compte). */
  | { type: 'message'; message: ChatMessage }
  | { type: 'error'; code: string };

export interface ChatMessage { id: number; from: string; to: string; kind: string; body: string; loc: unknown; at: string }

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
  /** Connecté en ce moment (instantané uniquement ; ensuite, messages `presence`). */
  online?: boolean;
  act?: 'dance' | 'walk' | 'still';
  bat?: number;
}

export interface GatewayOptions {
  pool: Pool;
  /** Chaîne de connexion dédiée à LISTEN (connexion persistante). */
  listenUrl: string;
  secret: Uint8Array;
  /** Débit maximal accepté par client (messages/s). */
  maxRate?: number;
  /** Connexions simultanées maximales sur ce serveur : au-delà, on refuse proprement (code 1013, « réessaie ») au lieu de saturer
   *  les descripteurs de fichiers et de perdre la base pour tout le monde. Défaut 15 000. */
  maxConnections?: number;
  /** Intervalle d'écriture groupée (ms). */
  flushMs?: number;
  /** Durée de vie du cache d'audience (ms) — filet de sécurité en plus de NOTIFY. */
  audienceTtlMs?: number;
  /** Intervalle du battement de cœur WebSocket (ms) : une connexion qui ne répond pas à deux pings est coupée. */
  pingMs?: number;
  /** Gestionnaire des requêtes HTTP de l'API (chemins /v1/…), servi sur le même port que le temps réel. */
  http?: (req: IncomingMessage, res: import('node:http').ServerResponse) => void | Promise<void>;
  /** Délai avant d'annoncer « hors ligne » (ms) : évite le clignotement lors d'un changement de réseau (Wi-Fi ↔ 4G). */
  offlineGraceMs?: number;
}

interface Conn {
  ws: WebSocket;
  userId: string;
  eventId: string;
  lastSeq: number;
  tokens: number;
  lastRefill: number;
  alive: boolean;
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
  if (p.act !== undefined && !['dance', 'walk', 'still'].includes(p.act as string)) return null;
  if (p.bat !== undefined && (!num(p.bat, 0, 100) || !Number.isInteger(p.bat))) return null;
  return p as unknown as PositionMsg;
}

export class Gateway {
  readonly server: Server;
  private readonly wss: WebSocketServer;
  private readonly conns = new Map<string, Set<Conn>>(); // userId → connexions
  /** Dernier état « vivant » connu (activité, batterie) par utilisateur, en mémoire seulement (jamais stocké). */
  private readonly live = new Map<string, { act?: 'dance' | 'walk' | 'still'; bat?: number; at: number }>();
  private readonly audience = new Map<string, { viewers: Set<string>; at: number }>(); // owner|event → viewers
  private pending: Record<string, unknown>[] = [];
  private flushTimer?: NodeJS.Timeout;
  private listener?: pg.Client;
  private pingTimer?: NodeJS.Timeout;
  private readonly offlineTimers = new Map<string, NodeJS.Timeout>(); // user|event → annonce différée
  readonly stats: { received: number; rejected: number; delivered: number; flushed: number; flushErrors: number; presence: number; deadConnections: number; refusedFull?: number } = { received: 0, rejected: 0, delivered: 0, flushed: 0, flushErrors: 0, presence: 0, deadConnections: 0, refusedFull: 0 };

  constructor(private readonly opts: GatewayOptions) {
    this.server = createServer((req, res) => {
      if (this.opts.http && (req.url ?? '').startsWith('/v1/')) return void this.opts.http(req, res);
      res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
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
    await this.listener.query('LISTEN message_new');
    await this.listener.query('LISTEN incident');
    await this.listener.query('LISTEN programme_changed');
    this.listener.on('notification', (n) => {
      if (n.channel === 'incident' && n.payload) void this.onIncident(n.payload).catch((e) => console.error('[gateway] incident', (e as Error).message));
      if (n.channel === 'programme_changed' && n.payload) this.onProgramme(n.payload);
      if (n.channel === 'share_changed' && n.payload) void this.onShareChanged(n.payload);
      if (n.channel === 'message_new' && n.payload) this.onChatMessage(n.payload);
    });
    this.flushTimer = setInterval(() => void this.flush(), this.opts.flushMs ?? 300);
    this.pingTimer = setInterval(() => this.heartbeat(), this.opts.pingMs ?? 15_000);
    await new Promise<void>((r) => this.server.listen(port, r));
    const addr = this.server.address();
    return typeof addr === 'object' && addr ? addr.port : port;
  }

  async close(): Promise<void> {
    clearInterval(this.flushTimer);
    clearInterval(this.pingTimer);
    for (const t of this.offlineTimers.values()) clearTimeout(t);
    this.offlineTimers.clear();
    await this.flush();
    for (const ws of this.wss.clients) ws.terminate();
    await new Promise<void>((r) => this.wss.close(() => r()));
    await new Promise<void>((r) => this.server.close(() => r()));
    await this.listener?.end();
  }

  // ------------------------------------------------------------------ connexion

  private async onConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    if (this.wss.clients.size > (this.opts.maxConnections ?? 15000)) { this.stats.refusedFull = (this.stats.refusedFull ?? 0) + 1; ws.close(1013, 'server_full'); return; } // serveur plein : les connectés restent servis
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
    const conn: Conn = { ws, userId, eventId, lastSeq: -1, tokens: this.opts.maxRate ?? 2, lastRefill: Date.now(), alive: true };
    const wasOnline = this.isOnline(userId, eventId);
    let set = this.conns.get(userId);
    if (!set) this.conns.set(userId, (set = new Set()));
    set.add(conn);
    ws.on('pong', () => { conn.alive = true; });
    ws.on('close', () => {
      set!.delete(conn);
      if (!set!.size) this.conns.delete(userId);
      if (!this.isOnline(userId, eventId)) this.scheduleOffline(userId, eventId);
    });
    // Reconnexion pendant le délai de grâce : rien n'est annoncé.
    const pendingOff = this.offlineTimers.get(`${userId}|${eventId}`);
    if (pendingOff) { clearTimeout(pendingOff); this.offlineTimers.delete(`${userId}|${eventId}`); }
    else if (!wasOnline) void this.announcePresence(userId, eventId, true);
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
          online: this.isOnline(r.user_id, eventId),
          ...this.liveOf(r.user_id),
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
      ...(msg.act ? { act: msg.act } : {}), ...(msg.bat !== undefined ? { bat: msg.bat } : {}),
    };
    if (msg.act || msg.bat !== undefined) this.live.set(conn.userId, { act: msg.act, bat: msg.bat, at: Date.now() });
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

  /** État vivant récent (< 2 min) d'un utilisateur, pour l'instantané initial. */
  private liveOf(userId: string): { act?: 'dance' | 'walk' | 'still'; bat?: number } {
    const l = this.live.get(userId);
    if (!l || Date.now() - l.at > 120_000) return {};
    return { ...(l.act ? { act: l.act } : {}), ...(l.bat !== undefined ? { bat: l.bat } : {}) };
  }

  /** Nouveau message entre amis : livré en direct au destinataire et aux autres appareils de l'expéditeur. */
  private onChatMessage(payload: string): void {
    let m: ChatMessage;
    try { m = JSON.parse(payload); } catch { return; }
    const msg: ServerMsg = { type: 'message', message: { id: m.id, from: m.from, to: m.to, kind: m.kind, body: m.body, loc: m.loc ?? null, at: m.at } };
    for (const uid of new Set([m.to, m.from])) for (const c of this.conns.get(uid) ?? []) this.send(c.ws, msg);
  }

  /** Signalement : le staff actif de l'organisation est prévenu en direct, l'auteur suit l'état. */
  private async onIncident(payload: string): Promise<void> {
    let m: { id: string; org: string; event: string; reporter: string | null; status: string; new: boolean };
    try { m = JSON.parse(payload); } catch { return; }
    const staff = (await this.opts.pool.query('SELECT user_id FROM app.active_staff($1)', [m.org])).rows as { user_id: string }[];
    const msg: ServerMsg = { type: 'incident', id: m.id, eventId: m.event, status: m.status, isNew: !!m.new };
    for (const { user_id } of staff) for (const c of this.conns.get(user_id) ?? []) this.send(c.ws, msg);
    if (m.reporter && !m.new) for (const c of this.conns.get(m.reporter) ?? []) this.send(c.ws, { type: 'report', id: m.id, status: m.status });
  }

  /** Programmation modifiée : chaque téléphone de l'événement recharge (statut, annulation, horaires). */
  private onProgramme(payload: string): void {
    let m: { event: string };
    try { m = JSON.parse(payload); } catch { return; }
    for (const set of this.conns.values()) for (const c of set) if (c.eventId === m.event) this.send(c.ws, { type: 'refresh', what: 'programme' });
  }

  /** Un partage, un consentement ou une amitié de `owner` a changé. */
  private async onShareChanged(owner: string): Promise<void> {
    // Amitiés / partages modifiés : l'app de l'intéressé recharge sa liste (demande reçue, ami accepté…).
    for (const c of this.conns.get(owner) ?? []) this.send(c.ws, { type: 'refresh', what: 'friends' });
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

  // ------------------------------------------------------------------ présence

  /** Vrai si l'utilisateur a au moins une connexion ouverte sur cet événement (limite : instance courante). */
  isOnline(userId: string, eventId: string): boolean {
    for (const c of this.conns.get(userId) ?? []) if (c.eventId === eventId) return true;
    return false;
  }

  private scheduleOffline(userId: string, eventId: string): void {
    const key = `${userId}|${eventId}`;
    if (this.offlineTimers.has(key)) return;
    this.offlineTimers.set(key, setTimeout(() => {
      this.offlineTimers.delete(key);
      if (!this.isOnline(userId, eventId)) void this.announcePresence(userId, eventId, false);
    }, this.opts.offlineGraceMs ?? 10_000));
  }

  /** Annonce la présence aux seuls spectateurs autorisés (même audience que les positions). */
  private async announcePresence(userId: string, eventId: string, online: boolean): Promise<void> {
    let viewers: Set<string>;
    try {
      viewers = await this.audienceOf(userId, eventId);
    } catch {
      return;
    }
    const at = Date.now();
    for (const v of viewers) for (const c of this.conns.get(v) ?? []) {
      if (c.eventId !== eventId) continue;
      this.send(c.ws, { type: 'presence', userId, online, at });
      this.stats.presence++;
    }
  }

  /** Battement de cœur : coupe les connexions mobiles mortes (réseau perdu sans fermeture propre). */
  private heartbeat(): void {
    for (const set of this.conns.values()) for (const c of set) {
      if (!c.alive) {
        this.stats.deadConnections++;
        c.ws.terminate(); // déclenche « close » → annonce hors ligne après le délai de grâce
        continue;
      }
      c.alive = false;
      try { c.ws.ping(); } catch { /* fermée entre-temps */ }
    }
  }

  // ------------------------------------------------------------------ persistance

  async flush(): Promise<void> {
    if (!this.pending.length) return;
    const batch = this.pending;
    this.pending = [];
    try {
      await this.opts.pool.query('SELECT app.ingest_positions($1::jsonb)', [JSON.stringify(batch)]);
      this.stats.flushed += batch.length;
    } catch (e) {
      this.stats.flushErrors++;
      if (this.stats.flushErrors <= 3) console.error('[oneera] enregistrement des positions impossible :', (e as Error).message, `(${batch.length} positions)`); // visible dans les journaux
    }
  }

  private send(ws: WebSocket, m: ServerMsg): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m));
  }
}
