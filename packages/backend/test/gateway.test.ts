import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { Pool, withContext, withSystem } from '../src/db';
import { Gateway, issueToken, ServerMsg } from '../src/gateway';
import { Fixture, freshDb, seed, TEST_URL } from './helpers';

const DB = 'oneera_test_gateway';
const secret = new TextEncoder().encode('test-secret-not-for-production-0123456789');
let pool: Pool;
let f: Fixture;
let gw: Gateway;
let port: number;

class TestClient {
  readonly msgs: ServerMsg[] = [];
  constructor(readonly ws: WebSocket) {
    ws.on('message', (d) => this.msgs.push(JSON.parse(d.toString())));
  }
  static async open(userId: string, eventId: string, autoPong = true): Promise<TestClient> {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/rt?token=${await issueToken(secret, userId, eventId)}`, { autoPong });
    const c = new TestClient(ws);
    await new Promise((r, j) => { ws.once('open', r); ws.once('error', j); });
    await c.waitFor((m) => m.type === 'snapshot');
    return c;
  }
  async waitFor(pred: (m: ServerMsg) => boolean, ms = 3000): Promise<ServerMsg> {
    const t0 = Date.now();
    for (;;) {
      const m = this.msgs.find(pred);
      if (m) return m;
      if (Date.now() - t0 > ms) throw new Error('délai dépassé');
      await new Promise((r) => setTimeout(r, 10));
    }
  }
  pos(seq: number, x = 3, y = 4) {
    this.ws.send(JSON.stringify({ type: 'pos', seq, t: Date.now(), floorId: 'L0', x, y, r68: 2.5, zoneKey: 'bar', zoneProb: 0.9, quality: 'precise' }));
  }
  close() { this.ws.close(); }
}

beforeAll(async () => {
  pool = await freshDb(DB);
  f = await seed(pool);
  const url = new URL(TEST_URL);
  url.pathname = `/${DB}`;
  gw = new Gateway({ pool, listenUrl: url.toString(), secret, maxRate: 5, flushMs: 100, pingMs: 150, offlineGraceMs: 300 });
  port = await gw.listen(0);
  // Alice ↔ Bob amis ; Carol inconnue. Alice consent au partage amis.
  await withSystem(pool, (c) => c.query(
    "INSERT INTO friendships (user_a, user_b, status, requested_by) VALUES (least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid), 'accepted', $1)", [f.alice, f.bob]));
  for (const u of [f.alice, f.bob]) {
    await withContext(pool, { userId: u }, (c) => c.query("INSERT INTO consents (user_id, purpose, policy_version) VALUES ($1, 'location_friends', 'v2-draft')", [u]));
  }
});
afterAll(async () => {
  await gw?.close();
  await pool?.end();
});

const shareAlice = () => withContext(pool, { userId: f.alice }, (c) =>
  c.query("INSERT INTO location_shares (owner_id, event_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')", [f.alice, f.eventA]));

describe('passerelle temps réel', () => {
  it('refuse une connexion sans jeton valide', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/rt?token=faux`);
    const code = await new Promise<number>((r) => ws.on('close', (c) => r(c)));
    expect(code).toBe(4401);
  });

  it("diffuse la position aux seuls amis autorisés", async () => {
    await shareAlice();
    const alice = await TestClient.open(f.alice, f.eventA);
    const bob = await TestClient.open(f.bob, f.eventA);
    const carol = await TestClient.open(f.carol, f.eventA);
    alice.pos(1);
    const m = await bob.waitFor((x) => x.type === 'friend');
    expect(m.type === 'friend' && m.pos.userId).toBe(f.alice);
    expect(m.type === 'friend' && m.pos.r68).toBe(2.5);
    await new Promise((r) => setTimeout(r, 200));
    expect(carol.msgs.filter((x) => x.type === 'friend')).toHaveLength(0);
    [alice, bob, carol].forEach((c) => c.close());
  });

  it('rejette les messages invalides et ignore les séquences anciennes', async () => {
    const alice = await TestClient.open(f.alice, f.eventA);
    const bob = await TestClient.open(f.bob, f.eventA);
    alice.ws.send(JSON.stringify({ type: 'pos', seq: 50, t: Date.now(), floorId: 'L0', x: 1e9, y: 0, r68: 1, quality: 'precise' }));
    await alice.waitFor((m) => m.type === 'error' && m.code === 'invalid');
    alice.pos(100);
    alice.pos(99);
    await bob.waitFor((m) => m.type === 'friend' && m.pos.seq === 100);
    await new Promise((r) => setTimeout(r, 200));
    expect(bob.msgs.some((m) => m.type === 'friend' && m.pos.seq === 99)).toBe(false);
    alice.close();
    bob.close();
  });

  it('limite le débit par connexion', async () => {
    const alice = await TestClient.open(f.alice, f.eventA);
    for (let i = 0; i < 30; i++) alice.pos(1000 + i);
    await alice.waitFor((m) => m.type === 'error' && m.code === 'rate_limited');
    alice.close();
  });

  it("persiste la dernière position et l'envoie à la connexion d'un ami", async () => {
    const alice = await TestClient.open(f.alice, f.eventA);
    alice.pos(5000, 7, 8);
    await new Promise((r) => setTimeout(r, 400));
    await gw.flush();
    const bob = await TestClient.open(f.bob, f.eventA);
    const snap = bob.msgs.find((m) => m.type === 'snapshot');
    expect(snap && snap.type === 'snapshot' && snap.friends.find((p) => p.userId === f.alice)?.x).toBe(7);
    alice.close();
    bob.close();
  });

  it("arrêt du partage : l'ami est notifié en moins de 2 s et ne reçoit plus rien", async () => {
    const alice = await TestClient.open(f.alice, f.eventA);
    const bob = await TestClient.open(f.bob, f.eventA);
    alice.pos(6000);
    await bob.waitFor((m) => m.type === 'friend' && m.pos.seq === 6000);
    const t0 = Date.now();
    await withContext(pool, { userId: f.alice }, (c) => c.query('UPDATE location_shares SET revoked_at = now() WHERE owner_id = $1', [f.alice]));
    await bob.waitFor((m) => m.type === 'gone' && m.userId === f.alice, 2000);
    expect(Date.now() - t0).toBeLessThan(2000);
    alice.pos(6001);
    await new Promise((r) => setTimeout(r, 300));
    expect(bob.msgs.some((m) => m.type === 'friend' && m.pos.seq === 6001)).toBe(false);
    alice.close();
    bob.close();
  });

  describe('présence', () => {
    // Laisse expirer le délai de grâce des connexions fermées par les tests précédents.
    beforeEach(() => new Promise((r) => setTimeout(r, 450)));
    it("annonce « en ligne » puis « hors ligne » aux seuls amis autorisés", async () => {
      await shareAlice();
      const bob = await TestClient.open(f.bob, f.eventA);
      const carol = await TestClient.open(f.carol, f.eventA);
      const alice = await TestClient.open(f.alice, f.eventA);
      await bob.waitFor((m) => m.type === 'presence' && m.userId === f.alice && m.online);
      const t0 = Date.now();
      alice.close();
      await bob.waitFor((m) => m.type === 'presence' && m.userId === f.alice && !m.online, 2000);
      expect(Date.now() - t0).toBeGreaterThanOrEqual(250); // délai de grâce respecté
      await new Promise((r) => setTimeout(r, 100));
      expect(carol.msgs.some((m) => m.type === 'presence')).toBe(false);
      bob.close();
      carol.close();
    });

    it('une reconnexion rapide (changement de réseau) ne fait pas clignoter « hors ligne »', async () => {
      const bob = await TestClient.open(f.bob, f.eventA);
      const a1 = await TestClient.open(f.alice, f.eventA);
      await bob.waitFor((m) => m.type === 'presence' && m.userId === f.alice && m.online);
      a1.close();
      await new Promise((r) => setTimeout(r, 80));
      const a2 = await TestClient.open(f.alice, f.eventA);
      await new Promise((r) => setTimeout(r, 500));
      expect(bob.msgs.some((m) => m.type === 'presence' && m.userId === f.alice && !m.online)).toBe(false);
      a2.close();
      bob.close();
    });

    it("le battement de cœur coupe une connexion morte et l'ami la voit hors ligne", async () => {
      const bob = await TestClient.open(f.bob, f.eventA);
      const dead = await TestClient.open(f.alice, f.eventA, false); // ne répond plus aux pings
      await bob.waitFor((m) => m.type === 'presence' && m.userId === f.alice && m.online);
      const closed = new Promise<void>((r) => dead.ws.on('close', () => r()));
      await closed;
      await bob.waitFor((m) => m.type === 'presence' && m.userId === f.alice && !m.online, 2000);
      expect(gw.stats.deadConnections).toBeGreaterThan(0);
      bob.close();
    });

    it("l'instantané initial indique qui est connecté", async () => {
      const alice = await TestClient.open(f.alice, f.eventA);
      alice.pos(7000, 2, 2);
      await new Promise((r) => setTimeout(r, 250));
      await gw.flush();
      const bob = await TestClient.open(f.bob, f.eventA);
      const snap = bob.msgs.find((m) => m.type === 'snapshot');
      expect(snap && snap.type === 'snapshot' && snap.friends.find((p) => p.userId === f.alice)?.online).toBe(true);
      alice.close();
      bob.close();
    });
  });
});
