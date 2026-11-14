-- ONEERA V2 — schéma initial
-- Principes : isolement par établissement appliqué PAR LA BASE (Row-Level Security),
-- séparation stricte entre partage de position entre amis (individuel, volontaire, révocable)
-- et indicateurs organisateur (agrégés, k-anonymes). Coordonnées des plans en repère local métrique
-- (SRID 0) ; la géoréférence WGS84 est portée par le lieu.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app;

-- Contexte de requête posé par l'API à chaque transaction (SET LOCAL).
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION app.current_org_id() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.org_id', true), '')::uuid $$;

-- ------------------------------------------------------------------ organisations et lieux

CREATE TABLE tenants (            -- marque : ONEERA ou marque blanche
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  branding jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE organizations (      -- exploitant (club, organisateur de festival)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('club', 'festival', 'private_event', 'multi_level', 'outdoor', 'mixed')),
  georef_origin geography(Point, 4326),
  georef_rotation_deg double precision NOT NULL DEFAULT 0,
  timezone text NOT NULL DEFAULT 'Europe/Paris'
);

CREATE TABLE venue_maps (         -- versions successives du plan (jamais modifiées une fois publiées)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version int NOT NULL,
  definition jsonb NOT NULL,       -- VenueDef (@oneera/positioning) : étages, praticable, murs, portails
  published_at timestamptz,
  UNIQUE (venue_id, version)
);

CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id uuid NOT NULL REFERENCES venue_maps(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key text NOT NULL,               -- identifiant stable dans la définition (ex. 'bar')
  name text NOT NULL,
  kind text NOT NULL,
  floor_id text NOT NULL,
  area geometry(Polygon, 0) NOT NULL,
  capacity int,
  restricted boolean NOT NULL DEFAULT false,
  UNIQUE (map_id, key)
);

CREATE TABLE beacons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id uuid NOT NULL REFERENCES venue_maps(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ibeacon_uuid uuid NOT NULL,
  major int NOT NULL CHECK (major BETWEEN 0 AND 65535),
  minor int NOT NULL CHECK (minor BETWEEN 0 AND 65535),
  floor_id text NOT NULL,
  pos geometry(Point, 0) NOT NULL,
  tx_power_1m smallint NOT NULL DEFAULT -59,
  last_seen_at timestamptz,
  battery_mv int,
  UNIQUE (map_id, ibeacon_uuid, major, minor)
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  map_id uuid NOT NULL REFERENCES venue_maps(id),
  name text NOT NULL,
  during tstzrange NOT NULL,       -- une soirée peut chevaucher minuit
  expected_attendance int,
  access_code text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex') -- contenu du QR
);
CREATE INDEX events_during_idx ON events USING gist (during);

-- ------------------------------------------------------------------ personnes

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 40),
  avatar jsonb NOT NULL DEFAULT '{}',
  is_guest boolean NOT NULL DEFAULT true,     -- session invitée créée au scan du QR
  auth_provider text,                         -- apple | google | email_link
  auth_subject text,
  birth_year smallint,                        -- âge minimal ; aucune date de naissance complète
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (auth_provider, auth_subject)
);

CREATE TABLE consents (           -- une ligne par finalité ; retrait = withdrawn_at
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('location_friends', 'location_venue_stats', 'notifications', 'marketing')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  policy_version text NOT NULL,
  PRIMARY KEY (user_id, purpose, granted_at)
);

CREATE TABLE friendships (        -- paire ordonnée (a < b)
  user_a uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE TABLE friend_invites (     -- QR / lien d'invitation, usage unique, expirant
  token text PRIMARY KEY DEFAULT encode(gen_random_bytes(16), 'base64'),
  inviter uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  used_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE location_shares (    -- partage volontaire, limité dans le temps, révocable instantanément
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audience_user_id uuid REFERENCES users(id) ON DELETE CASCADE,  -- NULL = tous mes amis
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,         -- NULL = partout où ONEERA est actif
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > starts_at)
);
CREATE INDEX location_shares_owner_idx ON location_shares (owner_id) WHERE revoked_at IS NULL;

-- ------------------------------------------------------------------ positions

-- Dernière position qualifiée par utilisateur et événement (chemin chaud, lu par les amis).
CREATE TABLE live_positions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  seq bigint NOT NULL,             -- numéro de séquence émis par le téléphone (anti-rejeu, ordre)
  measured_at timestamptz NOT NULL,
  floor_id text NOT NULL,
  pos geometry(Point, 0) NOT NULL,
  r68 real NOT NULL,
  zone_key text,
  zone_prob real,
  quality text NOT NULL CHECK (quality IN ('precise', 'zone', 'coarse')),
  PRIMARY KEY (user_id, event_id)
);

-- Historique brut (rétention courte, purgé automatiquement) — sert aux agrégats et au récap personnel.
CREATE TABLE position_fixes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  measured_at timestamptz NOT NULL,
  floor_id text NOT NULL,
  pos geometry(Point, 0) NOT NULL,
  r68 real NOT NULL,
  zone_key text,
  for_venue_stats boolean NOT NULL,    -- consentement 'location_venue_stats' au moment de la mesure
  PRIMARY KEY (user_id, event_id, measured_at)
);
CREATE INDEX position_fixes_event_time_idx ON position_fixes (event_id, measured_at);

-- ------------------------------------------------------------------ exploitation

CREATE TABLE staff_memberships (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'security', 'staff', 'analyst', 'readonly')),
  revoked_at timestamptz,
  PRIMARY KEY (user_id, organization_id)
);

CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('medical', 'security', 'crowd', 'lost_found', 'technical', 'other')),
  priority text NOT NULL CHECK (priority IN ('critical', 'high', 'normal', 'info')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'cancelled')),
  reported_by uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  floor_id text,
  pos geometry(Point, 0),
  description text CHECK (length(description) <= 1000),
  client_id text NOT NULL,         -- idempotence : un signalement rejoué hors ligne n'est créé qu'une fois
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, client_id)
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  organization_id uuid,
  actor_id uuid,
  action text NOT NULL,
  target text,
  at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'
);

-- ------------------------------------------------------------------ fonctions d'autorisation

CREATE OR REPLACE FUNCTION app.are_friends(a uuid, b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM friendships
    WHERE user_a = least(a, b) AND user_b = greatest(a, b) AND status = 'accepted')
$$;

-- Le propriétaire partage-t-il en ce moment sa position avec le lecteur pour cet événement ?
CREATE OR REPLACE FUNCTION app.is_shared_with(owner uuid, viewer uuid, ev uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app.are_friends(owner, viewer) AND EXISTS (
    SELECT 1 FROM location_shares s
    WHERE s.owner_id = owner
      AND (s.audience_user_id IS NULL OR s.audience_user_id = viewer)
      AND (s.event_id IS NULL OR s.event_id = ev)
      AND s.revoked_at IS NULL
      AND now() >= s.starts_at AND now() < s.expires_at)
  AND EXISTS (
    SELECT 1 FROM consents c WHERE c.user_id = owner AND c.purpose = 'location_friends' AND c.withdrawn_at IS NULL)
$$;

CREATE OR REPLACE FUNCTION app.is_staff_of(org uuid, roles text[] DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_memberships m
    WHERE m.user_id = app.current_user_id() AND m.organization_id = org AND m.revoked_at IS NULL
      AND (roles IS NULL OR m.role = ANY (roles)))
$$;

-- ------------------------------------------------------------------ Row-Level Security

-- Rôle utilisé par l'API (jamais propriétaire des tables → RLS toujours appliquée).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'oneera_app') THEN
    CREATE ROLE oneera_app NOLOGIN;
  END IF;
END $$;
GRANT USAGE ON SCHEMA public, app TO oneera_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO oneera_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO oneera_app;
REVOKE ALL ON audit_log FROM oneera_app;
GRANT INSERT ON audit_log TO oneera_app;

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE venue_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacons ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_fixes ENABLE ROW LEVEL SECURITY;

-- Données d'exploitation : visibles uniquement par le staff de l'organisation courante.
CREATE POLICY org_scope ON organizations USING (id = app.current_org_id() AND app.is_staff_of(id));
CREATE POLICY org_scope ON venues USING (organization_id = app.current_org_id() AND app.is_staff_of(organization_id));
CREATE POLICY org_scope ON venue_maps USING (organization_id = app.current_org_id() AND app.is_staff_of(organization_id));
CREATE POLICY org_scope ON zones USING (organization_id = app.current_org_id() AND app.is_staff_of(organization_id));
CREATE POLICY org_scope ON beacons USING (organization_id = app.current_org_id() AND app.is_staff_of(organization_id, ARRAY['owner','manager']));
CREATE POLICY org_scope ON events USING (organization_id = app.current_org_id() AND app.is_staff_of(organization_id));
CREATE POLICY org_scope ON staff_memberships USING (organization_id = app.current_org_id() AND app.is_staff_of(organization_id, ARRAY['owner','manager']));
CREATE POLICY staff_scope ON incidents USING (organization_id = app.current_org_id() AND app.is_staff_of(organization_id));
-- Un visiteur peut créer un signalement et relire les siens.
CREATE POLICY reporter_insert ON incidents FOR INSERT WITH CHECK (reported_by = app.current_user_id());
CREATE POLICY reporter_read ON incidents FOR SELECT USING (reported_by = app.current_user_id());

-- Données personnelles : chacun les siennes.
CREATE POLICY self ON users USING (id = app.current_user_id());
CREATE POLICY friends_read ON users FOR SELECT USING (app.are_friends(id, app.current_user_id()));
CREATE POLICY self ON consents USING (user_id = app.current_user_id());
CREATE POLICY member ON friendships USING (app.current_user_id() IN (user_a, user_b));
CREATE POLICY self ON friend_invites USING (inviter = app.current_user_id());
CREATE POLICY self ON location_shares USING (owner_id = app.current_user_id());
CREATE POLICY self ON position_fixes USING (user_id = app.current_user_id());

-- Positions en direct : soi-même, ou un ami avec un partage actif. AUCUNE politique organisateur.
CREATE POLICY self ON live_positions USING (user_id = app.current_user_id());
CREATE POLICY shared_with_me ON live_positions FOR SELECT
  USING (app.is_shared_with(user_id, app.current_user_id(), event_id));

-- ------------------------------------------------------------------ agrégats organisateur (k-anonymes)

-- Occupation par zone sur une fenêtre récente. Les comptes < k sont masqués (NULL),
-- la couverture est toujours renvoyée. Aucune identité, aucune trajectoire.
CREATE OR REPLACE FUNCTION app.zone_occupancy(ev uuid, window_s int DEFAULT 60, k int DEFAULT 5)
RETURNS TABLE (zone_key text, devices int, devices_masked boolean, located_total int, expected_attendance int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid;
BEGIN
  SELECT organization_id INTO org FROM events WHERE id = ev;
  IF org IS NULL OR org <> app.current_org_id() OR NOT app.is_staff_of(org) THEN
    RAISE EXCEPTION 'accès refusé' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH recent AS (
    SELECT DISTINCT ON (f.user_id) f.user_id, f.zone_key
    FROM position_fixes f
    WHERE f.event_id = ev AND f.for_venue_stats AND f.measured_at > now() - make_interval(secs => window_s)
    ORDER BY f.user_id, f.measured_at DESC
  ), totals AS (SELECT count(*)::int AS n FROM recent)
  SELECT r.zone_key,
         CASE WHEN count(*) >= k THEN count(*)::int END,
         count(*) < k,
         (SELECT n FROM totals),
         (SELECT e.expected_attendance FROM events e WHERE e.id = ev)
  FROM recent r WHERE r.zone_key IS NOT NULL
  GROUP BY r.zone_key;
END $$;
GRANT EXECUTE ON FUNCTION app.zone_occupancy(uuid, int, int) TO oneera_app;

-- ------------------------------------------------------------------ RGPD : purge et suppression

-- Purge des positions brutes au-delà de la durée de conservation (durée à valider juridiquement).
CREATE OR REPLACE FUNCTION app.purge_positions(retention interval DEFAULT interval '7 days') RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  DELETE FROM position_fixes WHERE measured_at < now() - retention;
  GET DIAGNOSTICS n = ROW_COUNT;
  DELETE FROM live_positions WHERE measured_at < now() - interval '12 hours';
  RETURN n;
END $$;

-- Suppression de compte : effacement réel (cascade), trace d'audit sans donnée personnelle.
CREATE OR REPLACE FUNCTION app.delete_my_account() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non authentifié' USING ERRCODE = '42501'; END IF;
  DELETE FROM users WHERE id = me;
  INSERT INTO audit_log (action, details) VALUES ('account_deleted', '{}');
END $$;
GRANT EXECUTE ON FUNCTION app.delete_my_account() TO oneera_app;

-- Export des données personnelles (droit d'accès / portabilité).
CREATE OR REPLACE FUNCTION app.export_my_data() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'profile', (SELECT to_jsonb(u) - 'auth_subject' FROM users u WHERE u.id = app.current_user_id()),
    'consents', (SELECT coalesce(jsonb_agg(c), '[]') FROM consents c WHERE c.user_id = app.current_user_id()),
    'friendships', (SELECT coalesce(jsonb_agg(f), '[]') FROM friendships f WHERE app.current_user_id() IN (f.user_a, f.user_b)),
    'shares', (SELECT coalesce(jsonb_agg(s), '[]') FROM location_shares s WHERE s.owner_id = app.current_user_id()),
    'positions', (SELECT coalesce(jsonb_agg(jsonb_build_object('t', p.measured_at, 'floor', p.floor_id,
                   'x', ST_X(p.pos), 'y', ST_Y(p.pos), 'zone', p.zone_key)), '[]')
                  FROM position_fixes p WHERE p.user_id = app.current_user_id())
  )
$$;
GRANT EXECUTE ON FUNCTION app.export_my_data() TO oneera_app;
GRANT EXECUTE ON FUNCTION app.current_user_id(), app.current_org_id() TO oneera_app;
