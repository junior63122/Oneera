/**
 * API HTTP ONEERA (version de test réelle) : comptes, profil + avatar, amis par code, partage de position.
 *
 * - Mots de passe : scrypt avec sel aléatoire ; jamais stockés ni journalisés en clair.
 * - Jetons : JWT HS256 (30 jours) pour l'API ; jeton court lié à un événement pour la passerelle temps réel.
 * - Toutes les lectures/écritures « métier » passent par `withContext` → Row-Level Security de la base.
 * - CORS ouvert (l'app charge son interface depuis un fichier local : origine « null »).
 */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { promisify } from 'node:util';
import { createRemoteJWKSet, JWTVerifyGetKey, jwtVerify, SignJWT } from 'jose';
import { Pool, withContext, withSystem } from './db';
import { issueToken } from './gateway';
import { isOffensive } from './moderation';

/** Stickers du chat : identifiants autorisés (l'app dessine l'avatar de l'expéditeur avec la légende). */
export const STICKERS = ['arrive', 'bar', 'ouestu', 'danse', 'top', 'dodo', 'love', 'merci', 'scene', 'retard'] as const;

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const POLICY = 'test-2026-11';
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('base64')}$${h.toString('base64')}`;
}
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, N, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const h = await scrypt(pw, Buffer.from(salt, 'base64'), expected.length, { N: +N, r: +r, p: +p });
  return h.length === expected.length && timingSafeEqual(h, expected);
}

/** Numéro au format international (+33612345678). Par défaut France ; null si invalide. Identique côté app. */
export function normalizePhone(raw: string, cc = '33'): string | null {
  let s = String(raw ?? '').trim().replace(/[\s.\-()/]/g, '');
  if (!s) return null;
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) {
    if (!/^\d+$/.test(s)) return null;
    if (s.startsWith('0') && s.length === 10) s = '+' + cc + s.slice(1);
    else if (s.length === 9 && cc === '33') s = '+33' + s;
    else return null;
  }
  if (!/^\+\d{8,15}$/.test(s)) return null;
  if (s.startsWith('+330')) s = '+33' + s.slice(4); // « +33 0 6… »
  return s;
}
export const sha256 = (v: string) => createHash('sha256').update(v, 'utf8').digest('hex');
const HEX64 = /^[0-9a-f]{64}$/;

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message?: string) { super(message ?? code); }
}

export interface ApiOptions {
  pool: Pool; secret: Uint8Array; publicWsUrl?: string;
  /** Identifiants d'app acceptés pour « Se connecter avec Apple » (bundle iOS). */
  appleAudiences?: string[];
  /** Identifiants client OAuth Google acceptés (client iOS, Android, web). */
  googleAudiences?: string[];
  /** Clés publiques (tests) ; par défaut celles d'Apple et de Google, téléchargées et mises en cache. */
  jwks?: { apple?: JWTVerifyGetKey; google?: JWTVerifyGetKey };
  /** Tentatives d'inscription / connexion par adresse IP et par minute (10 par défaut ; les tests l'augmentent). */
  authPerMinute?: number;
}

type User = { id: string; displayName: string; avatar: unknown };

export function createApi(opts: ApiOptions) {
  const { pool, secret } = opts;
  const hits = new Map<string, { n: number; t: number }>(); // limitation de débit des routes d'authentification

  const signApi = (userId: string) => new SignJWT({ typ: 'api' }).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt().setExpirationTime('30d').sign(secret);
  async function auth(req: IncomingMessage): Promise<string> {
    const h = req.headers.authorization ?? '';
    if (!h.startsWith('Bearer ')) throw new HttpError(401, 'unauthorized');
    try {
      const { payload } = await jwtVerify(h.slice(7), secret, { algorithms: ['HS256'] });
      if (payload.typ !== 'api' || typeof payload.sub !== 'string' || !UUID.test(payload.sub)) throw new Error();
      // Compte supprimé entre-temps → jeton refusé.
      const ok = (await pool.query('SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL', [payload.sub])).rowCount;
      if (!ok) throw new Error();
      return payload.sub;
    } catch {
      throw new HttpError(401, 'unauthorized');
    }
  }
  function limit(req: IncomingMessage, max = opts.authPerMinute ?? 10) {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() || req.socket.remoteAddress || '?';
    const now = Date.now(), e = hits.get(ip);
    if (!e || now - e.t > 60_000) { hits.set(ip, { n: 1, t: now }); return; }
    if (++e.n > max) throw new HttpError(429, 'too_many_requests', 'Trop de tentatives, réessaie dans une minute.');
  }
  async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
    let size = 0; const chunks: Buffer[] = [];
    for await (const c of req) { size += (c as Buffer).length; if (size > 64_000) throw new HttpError(413, 'too_large'); chunks.push(c as Buffer); }
    if (!chunks.length) return {};
    try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); return v && typeof v === 'object' ? v : {}; } catch { throw new HttpError(400, 'invalid_json'); }
  }
  const appleKeys = opts.jwks?.apple ?? createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  const googleKeys = opts.jwks?.google ?? createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  /** Connexion ou inscription par un fournisseur d'identité : le jeton est vérifié (signature, émetteur, destinataire, expiration). */
  async function social(provider: 'apple' | 'google', idToken: string, nameHint: unknown) {
    const aud = provider === 'apple' ? opts.appleAudiences ?? [] : opts.googleAudiences ?? [];
    if (!aud.length) throw new HttpError(503, 'provider_disabled', `Connexion ${provider === 'apple' ? 'Apple' : 'Google'} pas encore configurée.`);
    let p: Record<string, unknown>;
    try {
      p = (await jwtVerify(idToken, provider === 'apple' ? appleKeys : googleKeys, {
        issuer: provider === 'apple' ? 'https://appleid.apple.com' : ['https://accounts.google.com', 'accounts.google.com'], audience: aud,
      })).payload as Record<string, unknown>;
    } catch {
      throw new HttpError(401, 'invalid_identity', 'Connexion refusée : identité non vérifiée. Réessaie.');
    }
    const sub = String(p.sub ?? ''); if (!sub) throw new HttpError(401, 'invalid_identity');
    const email = typeof p.email === 'string' ? p.email.toLowerCase() : '';
    const found = await withSystem(pool, async (c) => (await c.query('SELECT id FROM users WHERE auth_provider = $1 AND auth_subject = $2 AND deleted_at IS NULL', [provider, sub])).rows[0]);
    const usableEmail = email && p.email_verified !== false && p.email_verified !== 'false' && !email.endsWith('privaterelay.appleid.com') ? email : '';
    if (found) { if (usableEmail) await addIdentifier(found.id, 'email', usableEmail); return { token: await signApi(found.id), user: await me(found.id), isNew: false }; }
    const hint = typeof nameHint === 'string' && nameHint.trim() ? nameHint : typeof p.given_name === 'string' ? p.given_name : typeof p.name === 'string' ? p.name : email && !email.endsWith('privaterelay.appleid.com') ? email.split('@')[0] : 'Moi';
    const name = [...String(hint).normalize('NFC').replace(/[<>"&`\\\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim().replace(/\s+/g, ' ')].slice(0, 40).join('') || 'Moi';
    const id = await withSystem(pool, async (c) => {
      const t = (await c.query("SELECT id FROM tenants WHERE slug = 'oneera'")).rows[0].id;
      return (await c.query('INSERT INTO users (tenant_id, display_name, is_guest, auth_provider, auth_subject) VALUES ($1, $2, false, $3, $4) RETURNING id', [t, name, provider, sub])).rows[0].id as string;
    });
    if (usableEmail) await addIdentifier(id, 'email', usableEmail);
    return { token: await signApi(id), user: await me(id), isNew: true };
  }

  /** Empreinte d'un identifiant de l'utilisateur (e-mail ou téléphone) : seule l'empreinte est stockée. */
  const addIdentifier = (userId: string, kind: 'email' | 'phone', value: string) => withSystem(pool, (c) => c.query('INSERT INTO user_identifiers (user_id, kind, hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [userId, kind, sha256(value)]));
  const perUser = new Map<string, { n: number; t: number }>();
  const limitUser = (user: string, max: number, bucket = 'default') => { const u = bucket + '|' + user; const now = Date.now(), e = perUser.get(u); if (!e || now - e.t > 60_000) { perUser.set(u, { n: 1, t: now }); return; } if (++e.n > max) throw new HttpError(429, 'too_many_requests', 'Trop de demandes, réessaie dans une minute.'); };

  const me = (userId: string) => withContext(pool, { userId }, async (c) => {
    const r = (await c.query('SELECT id, display_name, avatar FROM users WHERE id = $1', [userId])).rows[0];
    const consent = (await c.query("SELECT 1 FROM consents WHERE user_id = $1 AND purpose = 'location_friends' AND withdrawn_at IS NULL", [userId])).rowCount;
    const share = (await c.query('SELECT expires_at FROM location_shares WHERE owner_id = $1 AND revoked_at IS NULL AND now() < expires_at ORDER BY expires_at DESC LIMIT 1', [userId])).rows[0];
    return { id: r.id, displayName: r.display_name, avatar: r.avatar, locationConsent: !!consent, sharingUntil: share?.expires_at ?? null };
  });
  // Prénom : texte simple uniquement (aucun caractère de balisage ni caractère invisible / de contrôle).
  const cleanName = (v: unknown) => { const s = typeof v === 'string' ? v.normalize('NFC').replace(/[<>"&`\\\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim().replace(/\s+/g, ' ') : ''; if ([...s].length < 1 || [...s].length > 40) throw new HttpError(400, 'invalid_name', 'Le prénom doit faire entre 1 et 40 caractères.'); return s; };
  // Avatar : objet de réglages simples uniquement (identifiants courts, nombres, booléens, listes courtes).
  const TOKEN = /^[A-Za-z0-9_-]{0,24}$/, HEXC = /^#[0-9a-fA-F]{6}$/;
  const cleanAvatar = (v: unknown) => {
    if (v === undefined) return undefined;
    if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new HttpError(400, 'invalid_avatar', 'Avatar invalide.');
    const out: Record<string, unknown> = {};
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length > 40) throw new HttpError(400, 'invalid_avatar', 'Avatar invalide.');
    for (const [k, x] of entries) {
      if (!TOKEN.test(k) || !k) continue;
      if (k === 'text') { if (typeof x !== 'string') continue; // texte sur le haut de l'avatar : court, propre, sans insulte
        const t = x.normalize('NFC').replace(/[<>"&`\\\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').trim().replace(/\s+/g, ' ');
        if ([...t].length > 14) throw new HttpError(400, 'invalid_text', 'Texte trop long (14 caractères maximum).');
        if (isOffensive(t)) throw new HttpError(400, 'offensive_text', 'Ce texte n’est pas autorisé : il sera visible par d’autres personnes.');
        if (t) out[k] = t;
      }
      else if (typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 1000) out[k] = x;
      else if (typeof x === 'boolean') out[k] = x;
      else if (typeof x === 'string' && TOKEN.test(x)) out[k] = x;
      else if (typeof x === 'string' && HEXC.test(x)) out[k] = x.toUpperCase(); // couleur libre (#RRGGBB)
      else if (Array.isArray(x) && x.length <= 12 && x.every((y) => typeof y === 'string' && TOKEN.test(y))) out[k] = x;
    }
    return JSON.stringify(out);
  };

  const routes: Record<string, (req: IncomingMessage, m: RegExpMatchArray) => Promise<unknown>> = {
    'GET /v1/health': async () => ({ ok: true }),

    'POST /v1/auth/signup': async (req) => {
      limit(req);
      const b = await body(req);
      const email = String(b.email ?? '').trim().toLowerCase();
      const password = String(b.password ?? '');
      if (!EMAIL.test(email)) throw new HttpError(400, 'invalid_email', 'Adresse e-mail invalide.');
      if (password.length < 8 || password.length > 200) throw new HttpError(400, 'weak_password', 'Le mot de passe doit faire au moins 8 caractères.');
      const name = cleanName(b.displayName);
      const avatar = cleanAvatar(b.avatar) ?? '{}';
      const hash = await hashPassword(password);
      const userId = await withSystem(pool, async (c) => {
        if ((await c.query('SELECT 1 FROM user_credentials WHERE lower(email) = $1', [email])).rowCount) throw new HttpError(409, 'email_taken', 'Un compte existe déjà avec cette adresse.');
        const t = (await c.query("SELECT id FROM tenants WHERE slug = 'oneera'")).rows[0].id;
        const id = (await c.query("INSERT INTO users (tenant_id, display_name, avatar, is_guest, auth_provider, auth_subject) VALUES ($1, $2, $3::jsonb, false, 'email', $4) RETURNING id", [t, name, avatar, email])).rows[0].id as string;
        await c.query('INSERT INTO user_credentials (user_id, email, password_hash) VALUES ($1, $2, $3)', [id, email, hash]);
        if (b.locationConsent === true) await c.query("INSERT INTO consents (user_id, purpose, policy_version) VALUES ($1, 'location_friends', $2)", [id, POLICY]);
        return id;
      });
      await addIdentifier(userId, 'email', email);
      return { token: await signApi(userId), user: await me(userId) };
    },

    'POST /v1/auth/login': async (req) => {
      limit(req);
      const b = await body(req);
      const email = String(b.email ?? '').trim().toLowerCase();
      const row = await withSystem(pool, async (c) => (await c.query('SELECT k.user_id, k.password_hash FROM user_credentials k JOIN users u ON u.id = k.user_id WHERE lower(k.email) = $1 AND u.deleted_at IS NULL', [email])).rows[0]);
      // Même réponse que l'adresse existe ou non (pas d'énumération des comptes).
      if (!row || !(await verifyPassword(String(b.password ?? ''), row.password_hash))) throw new HttpError(401, 'bad_credentials', 'E-mail ou mot de passe incorrect.');
      await withSystem(pool, (c) => c.query('UPDATE user_credentials SET last_login_at = now() WHERE user_id = $1', [row.user_id]));
      return { token: await signApi(row.user_id), user: await me(row.user_id) };
    },

    'POST /v1/auth/apple': async (req) => { limit(req, 20); const b = await body(req); return social('apple', String(b.identityToken ?? ''), b.fullName); },
    'POST /v1/auth/google': async (req) => { limit(req, 20); const b = await body(req); return social('google', String(b.idToken ?? ''), b.name); },
    'GET /v1/auth/providers': async () => ({ apple: !!opts.appleAudiences?.length, google: !!opts.googleAudiences?.length }),

    'GET /v1/me': async (req) => me(await auth(req)),

    'PATCH /v1/me': async (req) => {
      const u = await auth(req); const b = await body(req);
      await withContext(pool, { userId: u }, async (c) => {
        if (b.displayName !== undefined) await c.query('UPDATE users SET display_name = $2 WHERE id = $1', [u, cleanName(b.displayName)]);
        const av = cleanAvatar(b.avatar);
        if (av !== undefined) await c.query('UPDATE users SET avatar = $2::jsonb WHERE id = $1', [u, av]);
      });
      return me(u);
    },

    'POST /v1/me/phone': async (req) => {
      const u = await auth(req); const b = await body(req);
      const ph = normalizePhone(String(b.phone ?? ''));
      if (!ph) throw new HttpError(400, 'invalid_phone', 'Numéro invalide. Exemple : 06 12 34 56 78 ou +33 6 12 34 56 78.');
      await withSystem(pool, async (c) => { await c.query("DELETE FROM user_identifiers WHERE user_id = $1 AND kind = 'phone'", [u]); await c.query("INSERT INTO user_identifiers (user_id, kind, hash) VALUES ($1, 'phone', $2) ON CONFLICT DO NOTHING", [u, sha256(ph)]); });
      return { ok: true, phoneSet: true };
    },
    'DELETE /v1/me/phone': async (req) => { const u = await auth(req); await withSystem(pool, (c) => c.query("DELETE FROM user_identifiers WHERE user_id = $1 AND kind = 'phone'", [u])); return { ok: true, phoneSet: false }; },

    'POST /v1/contacts/match': async (req) => {
      const u = await auth(req); limitUser(u, 6); const b = await body(req);
      const hashes = Array.isArray(b.hashes) ? [...new Set(b.hashes.map(String).filter((h) => HEX64.test(h)))] : [];
      if (hashes.length > 5000) throw new HttpError(400, 'too_many', 'Trop de contacts en une fois.');
      if (!hashes.length) return { users: [] };
      const rows = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT * FROM app.match_contacts($1::text[])', [hashes])).rows);
      return { users: rows.map((r) => ({ id: r.user_id, displayName: r.display_name, avatar: r.avatar, status: r.status, requestedByMe: r.requested_by_me, matched: r.matched })) };
    },

    'POST /v1/friends/requests': async (req) => {
      const u = await auth(req); const b = await body(req);
      const ids = Array.isArray(b.userIds) ? [...new Set(b.userIds.map(String).filter((x) => UUID.test(x)))].slice(0, 500) : [];
      const results: Record<string, string> = {};
      await withContext(pool, { userId: u }, async (c) => { for (const id of ids) results[id] = (await c.query('SELECT app.request_friend($1) AS s', [id])).rows[0].s; });
      return { results };
    },
    'POST /v1/friends/(?<id>[0-9a-f-]{36})/accept': async (req, m) => {
      const u = await auth(req);
      const st = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT app.request_friend($1) AS s', [m.groups!.id])).rows[0].s);
      return { status: st };
    },
    'POST /v1/friends/(?<id>[0-9a-f-]{36})/decline': async (req, m) => {
      const u = await auth(req); const id = m.groups!.id;
      await withContext(pool, { userId: u }, (c) => c.query("DELETE FROM friendships WHERE user_a = least($1::uuid, $2::uuid) AND user_b = greatest($1::uuid, $2::uuid) AND status = 'pending'", [u, id]));
      return { declined: true };
    },

    // Droit d'accès / portabilité (RGPD) : toutes les données personnelles du compte, en JSON.
    'GET /v1/me/export': async (req) => {
      const u = await auth(req); limitUser(u, 3, 'export');
      return withContext(pool, { userId: u }, async (c) => {
        const d = (await c.query('SELECT app.export_my_data() AS d')).rows[0].d;
        const messages = (await c.query('SELECT app.export_my_messages() AS m')).rows[0].m;
        return { exportedAt: new Date().toISOString(), format: 'oneera-export-1', ...d, messages };
      });
    },
    'DELETE /v1/me': async (req) => {
      const u = await auth(req);
      await withContext(pool, { userId: u }, (c) => c.query('SELECT app.delete_my_account()'));
      return { deleted: true };
    },

    'POST /v1/consents': async (req) => {
      const u = await auth(req); const b = await body(req);
      if (b.purpose !== 'location_friends') throw new HttpError(400, 'invalid_purpose');
      await withContext(pool, { userId: u }, async (c) => {
        if (b.granted === true) {
          const has = (await c.query("SELECT 1 FROM consents WHERE user_id = $1 AND purpose = 'location_friends' AND withdrawn_at IS NULL", [u])).rowCount;
          if (!has) await c.query("INSERT INTO consents (user_id, purpose, policy_version) VALUES ($1, 'location_friends', $2)", [u, POLICY]);
        } else {
          await c.query("UPDATE consents SET withdrawn_at = now() WHERE user_id = $1 AND purpose = 'location_friends' AND withdrawn_at IS NULL", [u]);
        }
      });
      return me(u);
    },

    'POST /v1/invites': async (req) => {
      const u = await auth(req);
      const code = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT app.new_invite_code() AS code')).rows[0].code as string);
      return { code, expiresInDays: 7 };
    },

    'POST /v1/invites/accept': async (req) => {
      const u = await auth(req); const b = await body(req);
      const code = String(b.code ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (code.length !== 6) throw new HttpError(400, 'invalid_code', 'Le code fait 6 caractères.');
      try {
        const inviter = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT app.accept_invite($1) AS id', [code])).rows[0].id as string);
        const friend = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT * FROM app.my_friends() WHERE user_id = $1', [inviter])).rows[0]);
        return { friend: friendOut(friend) };
      } catch (e) {
        if ((e as { code?: string }).code === '22023') throw new HttpError(400, 'invalid_code', 'Code invalide, expiré ou déjà utilisé.');
        throw e;
      }
    },

    'GET /v1/friends': async (req) => {
      const u = await auth(req);
      const rows = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT * FROM app.my_friends() ORDER BY since')).rows);
      return { friends: rows.map(friendOut) };
    },

    // ---------- Messagerie entre amis ----------
    'GET /v1/conversations': async (req) => {
      const u = await auth(req);
      const rows = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT * FROM app.my_conversations()')).rows);
      return { conversations: rows.map((r) => ({ friendId: r.friend_id, last: { id: Number(r.last_id), mine: r.last_mine, kind: r.last_kind, body: r.last_body, at: r.last_at }, unread: r.unread })) };
    },
    'GET /v1/messages/(?<id>[0-9a-f-]{36})': async (req, m) => {
      const u = await auth(req);
      const q = new URL(req.url ?? '/', 'http://x').searchParams; const before = q.get('before'); const lim = Math.min(200, Math.max(1, Number(q.get('limit')) || 50));
      const beforeId = before && /^\d{1,18}$/.test(before) ? before : null;
      const rows = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT * FROM app.messages_with($1, $2, $3)', [m.groups!.id, beforeId, lim])).rows);
      return { messages: rows.reverse().map((r) => ({ id: Number(r.id), mine: r.mine, kind: r.kind, body: r.body, loc: r.loc, at: r.created_at, readAt: r.read_at })) };
    },
    'POST /v1/messages': async (req) => {
      const u = await auth(req); limitUser(u, 40, 'msg'); const b = await body(req);
      const to = String(b.to ?? ''); if (!UUID.test(to)) throw new HttpError(400, 'invalid_recipient');
      const kind = b.kind === 'loc' || b.kind === 'meet' || b.kind === 'sticker' ? b.kind : 'text';
      if (kind === 'sticker' && !(STICKERS as readonly string[]).includes(String(b.body))) throw new HttpError(400, 'invalid_sticker');
      const text = typeof b.body === 'string' ? b.body.normalize('NFC').replace(/[\u0000-\u0008\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim() : '';
      if (!text || [...text].length > 1000) throw new HttpError(400, 'invalid_message', 'Message vide ou trop long (1000 caractères maximum).');
      let loc: object | null = null;
      if (kind === 'loc' || kind === 'meet') {
        const l = (b.loc ?? {}) as Record<string, unknown>; const x = Number(l.x), y = Number(l.y);
        if (!(x >= 0 && x <= 100 && y >= 0 && y <= 100)) throw new HttpError(400, 'invalid_location');
        const floor = typeof l.floor === 'string' && TOKEN.test(l.floor) ? l.floor : '';
        const label = typeof l.label === 'string' ? l.label.replace(/[<>"&`\\\u0000-\u001f\u007f]/g, '').trim().slice(0, 60) : '';
        loc = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, floor, label };
      }
      const r = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT * FROM app.send_message($1, $2, $3, $4)', [to, kind, text, loc])).rows[0]);
      return { id: Number(r.id), at: r.created_at };
    },
    'POST /v1/messages/(?<id>[0-9a-f-]{36})/read': async (req, m) => {
      const u = await auth(req);
      const n = await withContext(pool, { userId: u }, async (c) => (await c.query('SELECT app.mark_read($1) AS n', [m.groups!.id])).rows[0].n);
      return { read: n };
    },

    'DELETE /v1/friends/(?<id>[0-9a-f-]{36})': async (req, m) => {
      const u = await auth(req); const id = m.groups!.id;
      await withContext(pool, { userId: u }, (c) => c.query('DELETE FROM friendships WHERE user_a = least($1::uuid, $2::uuid) AND user_b = greatest($1::uuid, $2::uuid)', [u, id]));
      return { removed: true };
    },

    'POST /v1/share': async (req) => {
      const u = await auth(req); const b = await body(req);
      const hours = Math.min(24, Math.max(0.25, Number(b.hours ?? 12) || 12));
      await withContext(pool, { userId: u }, async (c) => {
        await c.query('UPDATE location_shares SET revoked_at = now() WHERE owner_id = $1 AND revoked_at IS NULL', [u]);
        await c.query("INSERT INTO location_shares (owner_id, expires_at) VALUES ($1, now() + make_interval(secs => $2))", [u, Math.round(hours * 3600)]);
      });
      return me(u);
    },

    'DELETE /v1/share': async (req) => {
      const u = await auth(req);
      await withContext(pool, { userId: u }, (c) => c.query('UPDATE location_shares SET revoked_at = now() WHERE owner_id = $1 AND revoked_at IS NULL', [u]));
      return me(u);
    },

    'GET /v1/events/(?<code>[A-Za-z0-9-]{3,40})': async (_req, m) => {
      const ev = await withContext(pool, {}, async (c) => (await c.query('SELECT event_id, name, map_version FROM app.event_by_code($1)', [m.groups!.code])).rows[0]);
      if (!ev) throw new HttpError(404, 'event_not_found', 'Événement introuvable.');
      return { id: ev.event_id, name: ev.name, mapVersion: ev.map_version };
    },

    'POST /v1/realtime-token': async (req) => {
      const u = await auth(req); const b = await body(req);
      const eventId = String(b.eventId ?? '');
      if (!UUID.test(eventId)) throw new HttpError(400, 'invalid_event');
      const ok = (await pool.query('SELECT 1 FROM events WHERE id = $1', [eventId])).rowCount;
      if (!ok) throw new HttpError(404, 'event_not_found');
      return { token: await issueToken(secret, u, eventId, '12h'), url: opts.publicWsUrl ?? null };
    },
  };
  const compiled = Object.entries(routes).map(([k, fn]) => { const [method, path] = k.split(' '); return { method, re: new RegExp(`^${path}$`), fn }; });

  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    const path = (req.url ?? '/').split('?')[0];
    const route = compiled.find((r) => r.method === req.method && r.re.test(path));
    try {
      if (!route) throw new HttpError(404, 'not_found');
      const out = await route.fn(req, path.match(route.re)!);
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(out));
    } catch (e) {
      const pgCode = (e as { code?: string }).code;
      const he = e instanceof HttpError ? e : pgCode === '42501' ? new HttpError(403, 'forbidden', 'Action réservée à tes amis.') : pgCode === '23514' || pgCode === '22001' || pgCode === '22P02' ? new HttpError(400, 'invalid_input', 'Donnée invalide : vérifie ce que tu as saisi.') : null;
      if (!he) console.error('[api]', req.method, path, (e as Error).message);
      res.writeHead(he?.status ?? 500, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: he?.code ?? 'server_error', message: he?.message ?? 'Erreur serveur, réessaie.' }));
    }
  };
}

function friendOut(r: { user_id: string; display_name: string; avatar: unknown; status: string; requested_by_me: boolean }): User & { status: string; requestedByMe: boolean } {
  return { id: r.user_id, displayName: r.display_name, avatar: r.avatar, status: r.status, requestedByMe: !!r.requested_by_me };
}
