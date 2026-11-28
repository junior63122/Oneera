-- 008 — Exploitation réelle : signalements du public, staff (invitations, rôles, révocation),
-- statistiques agrégées minute par minute (replay, comparaison, alertes) et programmation.
-- Principe : les nouvelles tables ne sont jamais lues directement par l'API ; tout passe par des
-- fonctions qui vérifient l'appelant (même schéma que la messagerie, migration 006).

-- ------------------------------------------------------------------ signalements du public
-- Les 3 choix exacts du cahier V1 MAP : « Quelqu'un a besoin d'aide ici » (help),
-- « Zone bondée / danger potentiel » (crowd), « Objets perdus / retrouvés » (lost_found).
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_category_check;
ALTER TABLE incidents ADD CONSTRAINT incidents_category_check
  CHECK (category IN ('help', 'medical', 'security', 'crowd', 'lost_found', 'technical', 'other'));
ALTER TABLE incidents ADD COLUMN zone_key text CHECK (length(zone_key) <= 40);
ALTER TABLE incidents ADD COLUMN first_response_at timestamptz;
ALTER TABLE incidents ADD COLUMN resolved_at timestamptz;
CREATE INDEX incidents_event_time_idx ON incidents (event_id, created_at DESC);
CREATE INDEX incidents_reporter_idx ON incidents (reported_by, created_at DESC);

-- Historique de chaque signalement (qui, quoi, quand) : temps de réponse, bilan staff.
CREATE TABLE incident_updates (
  id bigserial PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL,
  note text CHECK (char_length(note) <= 500),
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incident_updates_idx ON incident_updates (incident_id, id);
REVOKE ALL ON incident_updates FROM oneera_app;
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app.incident_json(i incidents) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', i.id, 'eventId', i.event_id, 'category', i.category, 'priority', i.priority,
    'status', i.status, 'zone', i.zone_key, 'floor', i.floor_id,
    'x', CASE WHEN i.pos IS NULL THEN NULL ELSE round(ST_X(i.pos)::numeric, 2) END,
    'y', CASE WHEN i.pos IS NULL THEN NULL ELSE round(ST_Y(i.pos)::numeric, 2) END,
    'description', i.description, 'assignedTo', i.assigned_to,
    'createdAt', i.created_at, 'updatedAt', i.updated_at, 'firstResponseAt', i.first_response_at, 'resolvedAt', i.resolved_at)
$$;

-- Création par un visiteur. Anti-spam du cahier : pas de doublon (même catégorie) en 3 min,
-- 3 signalements au plus en 10 min. Idempotent : un envoi différé rejoué n'est créé qu'une fois.
CREATE OR REPLACE FUNCTION app.report_incident(ev uuid, cat text, cid text, floor text, x double precision, y double precision, zone text, descr text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id(); i incidents; n int; prio text;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté' USING ERRCODE = '42501'; END IF;
  IF cat NOT IN ('help', 'crowd', 'lost_found', 'other') THEN RAISE EXCEPTION 'catégorie' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM events WHERE id = ev AND upper(during) + interval '6 hours' > now() AND lower(during) - interval '6 hours' < now()) THEN
    RAISE EXCEPTION 'événement inactif' USING ERRCODE = 'OE404';
  END IF;
  SELECT * INTO i FROM incidents WHERE event_id = ev AND client_id = cid AND reported_by = me;
  IF FOUND THEN RETURN app.incident_json(i) || jsonb_build_object('duplicate', true); END IF;
  SELECT * INTO i FROM incidents WHERE reported_by = me AND event_id = ev AND category = cat
    AND created_at > now() - interval '3 minutes' AND status NOT IN ('resolved', 'cancelled') ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN RETURN app.incident_json(i) || jsonb_build_object('duplicate', true); END IF;
  SELECT count(*) INTO n FROM incidents WHERE reported_by = me AND created_at > now() - interval '10 minutes';
  IF n >= 3 THEN RAISE EXCEPTION 'trop de signalements' USING ERRCODE = 'OE429'; END IF;
  prio := CASE cat WHEN 'help' THEN 'critical' WHEN 'crowd' THEN 'high' WHEN 'lost_found' THEN 'info' ELSE 'normal' END;
  INSERT INTO incidents (event_id, category, priority, reported_by, floor_id, pos, zone_key, description, client_id)
  VALUES (ev, cat, prio, me, floor, CASE WHEN x IS NULL OR y IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint(x, y), 0) END, zone, descr, cid)
  RETURNING * INTO i;
  INSERT INTO incident_updates (incident_id, actor_id, status) VALUES (i.id, me, 'open');
  PERFORM pg_notify('incident', jsonb_build_object('id', i.id, 'org', i.organization_id, 'event', i.event_id, 'reporter', me, 'status', i.status, 'new', true)::text);
  RETURN app.incident_json(i) || jsonb_build_object('duplicate', false);
END $$;
GRANT EXECUTE ON FUNCTION app.report_incident(uuid, text, text, text, double precision, double precision, text, text) TO oneera_app;

-- Suivi par le visiteur : ses propres signalements et leur historique.
CREATE OR REPLACE FUNCTION app.my_reports(ev uuid) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app.incident_json(i) || jsonb_build_object('history',
    (SELECT coalesce(jsonb_agg(jsonb_build_object('status', u.status, 'at', u.at) ORDER BY u.id), '[]') FROM incident_updates u WHERE u.incident_id = i.id))
  FROM incidents i WHERE i.reported_by = app.current_user_id() AND (ev IS NULL OR i.event_id = ev)
  ORDER BY i.created_at DESC LIMIT 50
$$;
GRANT EXECUTE ON FUNCTION app.my_reports(uuid) TO oneera_app;

-- Organisation d'un événement, si l'appelant en fait partie (sinon accès refusé).
CREATE OR REPLACE FUNCTION app.staff_org_of_event(ev uuid, roles text[] DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid;
BEGIN
  SELECT organization_id INTO org FROM events WHERE id = ev;
  IF org IS NULL OR NOT app.is_staff_of(org, roles) THEN RAISE EXCEPTION 'accès refusé' USING ERRCODE = '42501'; END IF;
  RETURN org;
END $$;

-- Liste pour le staff (tous les rôles de l'organisation).
CREATE OR REPLACE FUNCTION app.staff_incidents(ev uuid, only_open boolean DEFAULT false) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM app.staff_org_of_event(ev);
  RETURN QUERY SELECT app.incident_json(i) FROM incidents i
    WHERE i.event_id = ev AND (NOT only_open OR i.status NOT IN ('resolved', 'cancelled'))
    ORDER BY (i.status IN ('resolved', 'cancelled')), array_position(ARRAY['critical','high','normal','info'], i.priority), i.created_at DESC
    LIMIT 500;
END $$;
GRANT EXECUTE ON FUNCTION app.staff_incidents(uuid, boolean) TO oneera_app;

-- Changement d'état : Reçue (open) → En route (assigned) → Sur place (in_progress) → Résolue (resolved).
-- Retour en arrière interdit ; « cancelled » réservé à la sécurité, aux managers et au propriétaire.
CREATE OR REPLACE FUNCTION app.set_incident_status(inc uuid, st text, note text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id(); i incidents; rank_old int; rank_new int;
BEGIN
  SELECT * INTO i FROM incidents WHERE id = inc FOR UPDATE;
  IF NOT FOUND OR NOT app.is_staff_of(i.organization_id, ARRAY['owner','manager','security','staff']) THEN
    RAISE EXCEPTION 'accès refusé' USING ERRCODE = '42501';
  END IF;
  rank_old := array_position(ARRAY['open','assigned','in_progress','resolved'], i.status);
  rank_new := array_position(ARRAY['open','assigned','in_progress','resolved'], st);
  IF st = 'cancelled' THEN
    IF NOT app.is_staff_of(i.organization_id, ARRAY['owner','manager','security']) THEN RAISE EXCEPTION 'accès refusé' USING ERRCODE = '42501'; END IF;
    IF i.status IN ('resolved', 'cancelled') THEN RAISE EXCEPTION 'déjà clos' USING ERRCODE = 'OE409'; END IF;
  ELSIF rank_new IS NULL OR rank_old IS NULL OR rank_new <= rank_old THEN
    RAISE EXCEPTION 'transition' USING ERRCODE = 'OE409';
  END IF;
  UPDATE incidents SET status = st, updated_at = now(),
    assigned_to = CASE WHEN st IN ('assigned', 'in_progress') AND assigned_to IS NULL THEN me ELSE assigned_to END,
    first_response_at = coalesce(first_response_at, CASE WHEN st <> 'open' THEN now() END),
    resolved_at = CASE WHEN st IN ('resolved', 'cancelled') THEN now() ELSE resolved_at END
  WHERE id = inc RETURNING * INTO i;
  INSERT INTO incident_updates (incident_id, actor_id, status, note) VALUES (inc, me, st, nullif(left(note, 500), ''));
  INSERT INTO audit_log (organization_id, actor_id, action, target) VALUES (i.organization_id, me, 'incident.' || st, inc::text);
  PERFORM pg_notify('incident', jsonb_build_object('id', i.id, 'org', i.organization_id, 'event', i.event_id, 'reporter', i.reported_by, 'status', i.status, 'new', false)::text);
  RETURN app.incident_json(i);
END $$;
GRANT EXECUTE ON FUNCTION app.set_incident_status(uuid, text, text) TO oneera_app;

-- ------------------------------------------------------------------ staff : invitations, rôles, révocation
-- Rôles du cahier : staff standard (staff), sécurité (security), manager/superviseur (manager),
-- administrateur festival (owner) ; analyst et readonly pour le tableau de bord en lecture.
CREATE TABLE staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('manager', 'security', 'staff', 'analyst', 'readonly')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  max_uses int NOT NULL CHECK (max_uses BETWEEN 1 AND 500),
  uses int NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON staff_invites FROM oneera_app;
ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;

-- Pas d'auto-attribution de droits : un manager n'invite que des rôles inférieurs au sien.
CREATE OR REPLACE FUNCTION app.create_staff_invite(org uuid, r text, hours int, uses int) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id(); code text; inv staff_invites;
BEGIN
  IF NOT app.is_staff_of(org, ARRAY['owner','manager']) THEN RAISE EXCEPTION 'accès refusé' USING ERRCODE = '42501'; END IF;
  IF r = 'manager' AND NOT app.is_staff_of(org, ARRAY['owner']) THEN RAISE EXCEPTION 'accès refusé' USING ERRCODE = '42501'; END IF;
  IF r NOT IN ('manager', 'security', 'staff', 'analyst', 'readonly') THEN RAISE EXCEPTION 'rôle' USING ERRCODE = '22023'; END IF;
  code := upper(substr(encode(gen_random_bytes(10), 'hex'), 1, 12));
  INSERT INTO staff_invites (organization_id, code_hash, role, created_by, expires_at, max_uses)
  VALUES (org, encode(digest(code, 'sha256'), 'hex'), r, me, now() + make_interval(hours => greatest(1, least(hours, 24 * 30))), greatest(1, least(uses, 500)))
  RETURNING * INTO inv;
  INSERT INTO audit_log (organization_id, actor_id, action, target, details) VALUES (org, me, 'staff.invite', inv.id::text, jsonb_build_object('role', r, 'uses', inv.max_uses));
  RETURN jsonb_build_object('id', inv.id, 'code', code, 'role', r, 'expiresAt', inv.expires_at, 'maxUses', inv.max_uses);
END $$;
GRANT EXECUTE ON FUNCTION app.create_staff_invite(uuid, text, int, int) TO oneera_app;

CREATE OR REPLACE FUNCTION app.accept_staff_invite(code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id(); inv staff_invites; cur staff_memberships;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non connecté' USING ERRCODE = '42501'; END IF;
  SELECT * INTO inv FROM staff_invites WHERE code_hash = encode(digest(upper(code), 'sha256'), 'hex') FOR UPDATE;
  IF NOT FOUND OR inv.revoked_at IS NOT NULL OR inv.expires_at < now() OR inv.uses >= inv.max_uses THEN
    RAISE EXCEPTION 'code invalide' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO cur FROM staff_memberships WHERE user_id = me AND organization_id = inv.organization_id;
  IF FOUND AND cur.revoked_at IS NULL THEN
    RETURN jsonb_build_object('organizationId', inv.organization_id, 'role', cur.role, 'already', true);
  END IF;
  INSERT INTO staff_memberships (user_id, organization_id, role) VALUES (me, inv.organization_id, inv.role)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role, revoked_at = NULL;
  UPDATE staff_invites SET uses = uses + 1 WHERE id = inv.id;
  INSERT INTO audit_log (organization_id, actor_id, action, target, details) VALUES (inv.organization_id, me, 'staff.join', inv.id::text, jsonb_build_object('role', inv.role));
  RETURN jsonb_build_object('organizationId', inv.organization_id, 'role', inv.role, 'already', false);
END $$;
GRANT EXECUTE ON FUNCTION app.accept_staff_invite(text) TO oneera_app;

-- Suspension / révocation immédiate (is_staff_of relit la table à chaque requête).
CREATE OR REPLACE FUNCTION app.set_staff_access(org uuid, member uuid, active boolean, new_role text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id(); cur staff_memberships;
BEGIN
  IF NOT app.is_staff_of(org, ARRAY['owner','manager']) OR member = me THEN RAISE EXCEPTION 'accès refusé' USING ERRCODE = '42501'; END IF;
  SELECT * INTO cur FROM staff_memberships WHERE user_id = member AND organization_id = org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'inconnu' USING ERRCODE = 'OE404'; END IF;
  -- Un manager ne touche ni au propriétaire ni à un autre manager, et ne nomme pas de manager.
  IF NOT app.is_staff_of(org, ARRAY['owner']) AND (cur.role IN ('owner', 'manager') OR new_role IN ('owner', 'manager')) THEN
    RAISE EXCEPTION 'accès refusé' USING ERRCODE = '42501';
  END IF;
  IF new_role IS NOT NULL AND new_role NOT IN ('manager', 'security', 'staff', 'analyst', 'readonly') THEN RAISE EXCEPTION 'rôle' USING ERRCODE = '22023'; END IF;
  UPDATE staff_memberships SET revoked_at = CASE WHEN active THEN NULL ELSE now() END, role = coalesce(new_role, role)
  WHERE user_id = member AND organization_id = org RETURNING * INTO cur;
  INSERT INTO audit_log (organization_id, actor_id, action, target, details)
  VALUES (org, me, CASE WHEN active THEN 'staff.update' ELSE 'staff.revoke' END, member::text, jsonb_build_object('role', cur.role));
  RETURN jsonb_build_object('userId', member, 'role', cur.role, 'active', cur.revoked_at IS NULL);
END $$;
GRANT EXECUTE ON FUNCTION app.set_staff_access(uuid, uuid, boolean, text) TO oneera_app;

CREATE OR REPLACE FUNCTION app.my_staff_roles() RETURNS TABLE (organization_id uuid, organization text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.organization_id, o.name, m.role FROM staff_memberships m JOIN organizations o ON o.id = m.organization_id
  WHERE m.user_id = app.current_user_id() AND m.revoked_at IS NULL ORDER BY o.name
$$;
GRANT EXECUTE ON FUNCTION app.my_staff_roles() TO oneera_app;

CREATE OR REPLACE FUNCTION app.staff_members(org uuid) RETURNS TABLE (user_id uuid, display_name text, role text, active boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT app.is_staff_of(org, ARRAY['owner','manager']) THEN RAISE EXCEPTION 'accès refusé' USING ERRCODE = '42501'; END IF;
  RETURN QUERY SELECT m.user_id, u.display_name, m.role, m.revoked_at IS NULL FROM staff_memberships m JOIN users u ON u.id = m.user_id
    WHERE m.organization_id = org ORDER BY m.revoked_at IS NOT NULL, m.role, u.display_name;
END $$;
GRANT EXECUTE ON FUNCTION app.staff_members(uuid) TO oneera_app;

-- ------------------------------------------------------------------ statistiques agrégées (replay 10 ans)
-- Seuls des comptages par zone et par minute sont conservés durablement ; les positions brutes
-- restent purgées (purge_positions). Seuil k : une case de moins de k personnes n'est jamais montrée.
-- (zones.capacity existe depuis 001)

CREATE TABLE zone_minute_stats (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  minute timestamptz NOT NULL,
  zone_key text NOT NULL,
  devices int NOT NULL CHECK (devices >= 0),
  PRIMARY KEY (event_id, minute, zone_key)
);
CREATE TABLE zone_flow_minute (
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  minute timestamptz NOT NULL,
  from_zone text NOT NULL,
  to_zone text NOT NULL,
  n int NOT NULL CHECK (n >= 0),
  PRIMARY KEY (event_id, minute, from_zone, to_zone)
);
REVOKE ALL ON zone_minute_stats, zone_flow_minute FROM oneera_app;
ALTER TABLE zone_minute_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_flow_minute ENABLE ROW LEVEL SECURITY;

-- Calcul (système) des minutes [since, until[ d'un événement, à partir des positions consenties.
-- Rejouable : recalcule et remplace les minutes concernées.
CREATE OR REPLACE FUNCTION app.rollup_minutes(ev uuid, since timestamptz, until timestamptz) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  since := date_trunc('minute', since); until := date_trunc('minute', until);
  DELETE FROM zone_minute_stats WHERE event_id = ev AND minute >= since AND minute < until;
  DELETE FROM zone_flow_minute WHERE event_id = ev AND minute >= since AND minute < until;
  -- Zone de chaque personne à chaque minute = sa dernière position de la minute.
  CREATE TEMP TABLE _m ON COMMIT DROP AS
    SELECT DISTINCT ON (f.user_id, date_trunc('minute', f.measured_at)) f.user_id, date_trunc('minute', f.measured_at) AS minute, f.zone_key
    FROM position_fixes f
    WHERE f.event_id = ev AND f.for_venue_stats AND f.zone_key IS NOT NULL
      AND f.measured_at >= since - interval '5 minutes' AND f.measured_at < until
    ORDER BY f.user_id, date_trunc('minute', f.measured_at), f.measured_at DESC;
  INSERT INTO zone_minute_stats (event_id, minute, zone_key, devices)
    SELECT ev, minute, zone_key, count(*) FROM _m WHERE minute >= since GROUP BY minute, zone_key;
  GET DIAGNOSTICS n = ROW_COUNT;
  -- Passage d'une zone à une autre entre deux minutes observées (écart ≤ 5 min).
  INSERT INTO zone_flow_minute (event_id, minute, from_zone, to_zone, n)
    SELECT ev, minute, prev_zone, zone_key, count(*) FROM (
      SELECT minute, zone_key, lag(zone_key) OVER w AS prev_zone, lag(minute) OVER w AS prev_minute
      FROM _m WINDOW w AS (PARTITION BY user_id ORDER BY minute)) t
    WHERE minute >= since AND prev_zone IS NOT NULL AND prev_zone <> zone_key AND minute - prev_minute <= interval '5 minutes'
    GROUP BY minute, prev_zone, zone_key;
  DROP TABLE _m;
  RETURN n;
END $$;

-- Lecture (tout rôle staff de l'organisation) : série minute par minute, cases < k masquées.
CREATE OR REPLACE FUNCTION app.zone_timeline(ev uuid, t0 timestamptz, t1 timestamptz, k int DEFAULT 5)
RETURNS TABLE (minute timestamptz, zone_key text, devices int, masked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM app.staff_org_of_event(ev);
  k := greatest(k, 5);
  RETURN QUERY SELECT s.minute, s.zone_key, CASE WHEN s.devices < k THEN NULL ELSE s.devices END, s.devices < k
    FROM zone_minute_stats s WHERE s.event_id = ev AND s.minute >= t0 AND s.minute < t1 ORDER BY s.minute, s.zone_key;
END $$;
GRANT EXECUTE ON FUNCTION app.zone_timeline(uuid, timestamptz, timestamptz, int) TO oneera_app;

-- Flux cumulés sur une période (par case de passage zone → zone), masqués sous k.
CREATE OR REPLACE FUNCTION app.zone_flows(ev uuid, t0 timestamptz, t1 timestamptz, k int DEFAULT 5)
RETURNS TABLE (from_zone text, to_zone text, n int, masked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM app.staff_org_of_event(ev);
  k := greatest(k, 5);
  RETURN QUERY SELECT f.from_zone, f.to_zone, CASE WHEN sum(f.n) < k THEN NULL ELSE sum(f.n)::int END, sum(f.n) < k
    FROM zone_flow_minute f WHERE f.event_id = ev AND f.minute >= t0 AND f.minute < t1
    GROUP BY f.from_zone, f.to_zone ORDER BY sum(f.n) DESC;
END $$;
GRANT EXECUTE ON FUNCTION app.zone_flows(uuid, timestamptz, timestamptz, int) TO oneera_app;

-- Synthèse par zone sur une période (comparaison de dates / d'heures / d'éditions).
CREATE OR REPLACE FUNCTION app.zone_summary(ev uuid, t0 timestamptz, t1 timestamptz, k int DEFAULT 5)
RETURNS TABLE (zone_key text, name text, capacity int, peak int, peak_at timestamptz, avg_devices numeric, masked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM app.staff_org_of_event(ev);
  k := greatest(k, 5);
  RETURN QUERY
  WITH s AS (SELECT z.zone_key, max(z.devices) AS peak, avg(z.devices) AS av,
               (array_agg(z.minute ORDER BY z.devices DESC, z.minute))[1] AS peak_at
             FROM zone_minute_stats z WHERE z.event_id = ev AND z.minute >= t0 AND z.minute < t1 GROUP BY z.zone_key)
  SELECT s.zone_key, zn.name, zn.capacity,
    CASE WHEN s.peak < k THEN NULL ELSE s.peak END, CASE WHEN s.peak < k THEN NULL ELSE s.peak_at END,
    CASE WHEN s.peak < k THEN NULL ELSE round(s.av, 1) END, s.peak < k
  FROM s LEFT JOIN events e ON e.id = ev LEFT JOIN zones zn ON zn.map_id = e.map_id AND zn.key = s.zone_key
  ORDER BY s.peak DESC;
END $$;
GRANT EXECUTE ON FUNCTION app.zone_summary(uuid, timestamptz, timestamptz, int) TO oneera_app;

-- Alertes automatiques agrégées : densité (≥ 90 % de la capacité, critique ≥ 100 %) et flux anormal
-- (arrivées des 5 dernières minutes ≥ 3 × la moyenne des 30 minutes précédentes, et ≥ k).
-- L'immobilité prolongée d'une personne est une donnée individuelle : non calculée ici (décision RGPD).
CREATE OR REPLACE FUNCTION app.event_alerts(ev uuid, at timestamptz DEFAULT now(), k int DEFAULT 5)
RETURNS TABLE (kind text, level text, zone_key text, value numeric, threshold numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE last_minute timestamptz;
BEGIN
  PERFORM app.staff_org_of_event(ev);
  k := greatest(k, 5);
  SELECT max(minute) INTO last_minute FROM zone_minute_stats WHERE event_id = ev AND minute <= at AND minute > at - interval '5 minutes';
  RETURN QUERY
  SELECT 'density'::text, CASE WHEN s.devices >= zn.capacity THEN 'critical' ELSE 'warning' END, s.zone_key,
         round(100.0 * s.devices / zn.capacity, 1), 90::numeric
  FROM zone_minute_stats s JOIN events e ON e.id = s.event_id JOIN zones zn ON zn.map_id = e.map_id AND zn.key = s.zone_key
  WHERE s.event_id = ev AND s.minute = last_minute AND zn.capacity IS NOT NULL AND s.devices >= k AND s.devices >= 0.9 * zn.capacity;
  RETURN QUERY
  WITH recent AS (SELECT f.to_zone, sum(f.n) AS n FROM zone_flow_minute f WHERE f.event_id = ev AND f.minute > at - interval '5 minutes' AND f.minute <= at GROUP BY f.to_zone),
       base AS (SELECT f.to_zone, sum(f.n) / 6.0 AS n FROM zone_flow_minute f WHERE f.event_id = ev AND f.minute > at - interval '35 minutes' AND f.minute <= at - interval '5 minutes' GROUP BY f.to_zone)
  SELECT 'flow'::text, 'warning'::text, r.to_zone, r.n::numeric, round(3 * greatest(coalesce(b.n, 0), 1), 1)
  FROM recent r LEFT JOIN base b ON b.to_zone = r.to_zone
  WHERE r.n >= k AND r.n >= 3 * greatest(coalesce(b.n, 0), 1);
END $$;
GRANT EXECUTE ON FUNCTION app.event_alerts(uuid, timestamptz, int) TO oneera_app;

-- ------------------------------------------------------------------ programmation
CREATE TABLE programme_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  kind text NOT NULL CHECK (kind IN ('dj', 'concert', 'show', 'screening', 'fireworks', 'talk', 'other')),
  stage_key text NOT NULL CHECK (char_length(stage_key) BETWEEN 1 AND 40),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  description text CHECK (char_length(description) <= 1000),
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at AND ends_at - starts_at <= interval '24 hours')
);
CREATE INDEX programme_event_idx ON programme_items (event_id, starts_at);
CREATE TRIGGER fill_org BEFORE INSERT OR UPDATE OF event_id ON programme_items FOR EACH ROW EXECUTE FUNCTION app.fill_org_from_event();
REVOKE ALL ON programme_items FROM oneera_app;
ALTER TABLE programme_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app.programme_json(p programme_items, at timestamptz DEFAULT now()) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', p.id, 'title', p.title, 'kind', p.kind, 'stage', p.stage_key, 'startsAt', p.starts_at, 'endsAt', p.ends_at,
    'description', p.description, 'updatedAt', p.updated_at,
    'status', CASE WHEN p.cancelled_at IS NOT NULL THEN 'cancelled' WHEN at < p.starts_at THEN 'upcoming' WHEN at < p.ends_at THEN 'live' ELSE 'done' END)
$$;

-- Lecture publique (toute personne connectée) de la programmation d'un événement publié.
CREATE OR REPLACE FUNCTION app.programme(ev uuid) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT app.programme_json(p) FROM programme_items p JOIN events e ON e.id = p.event_id JOIN venue_maps m ON m.id = e.map_id
  WHERE p.event_id = ev AND m.published_at IS NOT NULL ORDER BY p.starts_at, p.stage_key
$$;
GRANT EXECUTE ON FUNCTION app.programme(uuid) TO oneera_app;

CREATE OR REPLACE FUNCTION app.programme_upsert(ev uuid, item uuid, t text, k text, stage text, s timestamptz, e timestamptz, descr text, cancelled boolean)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid := app.staff_org_of_event(ev, ARRAY['owner','manager']); p programme_items;
BEGIN
  IF item IS NULL THEN
    INSERT INTO programme_items (event_id, title, kind, stage_key, starts_at, ends_at, description, cancelled_at)
    VALUES (ev, t, k, stage, s, e, descr, CASE WHEN cancelled THEN now() END) RETURNING * INTO p;
  ELSE
    UPDATE programme_items SET title = t, kind = k, stage_key = stage, starts_at = s, ends_at = e, description = descr,
      cancelled_at = CASE WHEN cancelled THEN coalesce(cancelled_at, now()) ELSE NULL END, updated_at = now()
    WHERE id = item AND event_id = ev RETURNING * INTO p;
    IF NOT FOUND THEN RAISE EXCEPTION 'inconnu' USING ERRCODE = 'OE404'; END IF;
  END IF;
  INSERT INTO audit_log (organization_id, actor_id, action, target) VALUES (org, app.current_user_id(), 'programme.save', p.id::text);
  PERFORM pg_notify('programme_changed', jsonb_build_object('event', ev, 'id', p.id)::text);
  RETURN app.programme_json(p);
END $$;
GRANT EXECUTE ON FUNCTION app.programme_upsert(uuid, uuid, text, text, text, timestamptz, timestamptz, text, boolean) TO oneera_app;

CREATE OR REPLACE FUNCTION app.programme_delete(ev uuid, item uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE org uuid := app.staff_org_of_event(ev, ARRAY['owner','manager']);
BEGIN
  DELETE FROM programme_items WHERE id = item AND event_id = ev;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO audit_log (organization_id, actor_id, action, target) VALUES (org, app.current_user_id(), 'programme.delete', item::text);
  PERFORM pg_notify('programme_changed', jsonb_build_object('event', ev, 'id', item)::text);
  RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION app.programme_delete(uuid, uuid) TO oneera_app;

-- Conflits d'horaires (admin) : deux passages qui se chevauchent sur la même scène.
CREATE OR REPLACE FUNCTION app.programme_conflicts(ev uuid) RETURNS TABLE (a uuid, b uuid, stage text, overlap_minutes int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM app.staff_org_of_event(ev);
  RETURN QUERY SELECT p.id, q.id, p.stage_key,
    (extract(epoch FROM least(p.ends_at, q.ends_at) - greatest(p.starts_at, q.starts_at)) / 60)::int
  FROM programme_items p JOIN programme_items q ON q.event_id = p.event_id AND q.stage_key = p.stage_key AND p.id < q.id
  WHERE p.event_id = ev AND p.cancelled_at IS NULL AND q.cancelled_at IS NULL
    AND p.starts_at < q.ends_at AND q.starts_at < p.ends_at;
END $$;
GRANT EXECUTE ON FUNCTION app.programme_conflicts(uuid) TO oneera_app;

-- Le staff de l'organisation : liste des membres actifs (diffusion temps réel des signalements).
CREATE OR REPLACE FUNCTION app.active_staff(org uuid) RETURNS TABLE (user_id uuid, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, m.role FROM staff_memberships m WHERE m.organization_id = org AND m.revoked_at IS NULL
$$;

-- Avancement du calcul des minutes par événement (rattrapage après une coupure du serveur).
CREATE TABLE rollup_progress (
  event_id uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  done_until timestamptz NOT NULL
);
REVOKE ALL ON rollup_progress FROM oneera_app;
ALTER TABLE rollup_progress ENABLE ROW LEVEL SECURITY;

-- Calcule les minutes terminées de tous les événements en cours ou récemment finis (6 h max par appel et
-- par événement). Les 5 dernières minutes sont recalculées pour intégrer les positions envoyées en différé.
CREATE OR REPLACE FUNCTION app.rollup_due(at timestamptz DEFAULT now()) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e record; t0 timestamptz; t1 timestamptz; total int := 0;
BEGIN
  FOR e IN SELECT ev.id, lower(ev.during) AS s, upper(ev.during) AS f, p.done_until FROM events ev LEFT JOIN rollup_progress p ON p.event_id = ev.id
           WHERE lower(ev.during) < at AND (p.done_until IS NULL OR p.done_until < upper(ev.during) + interval '1 hour') LOOP
    t0 := greatest(date_trunc('minute', e.s), coalesce(e.done_until - interval '5 minutes', '-infinity'));
    t1 := least(date_trunc('minute', at), date_trunc('minute', e.f + interval '1 hour'), t0 + interval '6 hours');
    CONTINUE WHEN t1 <= t0;
    total := total + app.rollup_minutes(e.id, t0, t1);
    INSERT INTO rollup_progress (event_id, done_until) VALUES (e.id, t1) ON CONFLICT (event_id) DO UPDATE SET done_until = EXCLUDED.done_until;
  END LOOP;
  RETURN total;
END $$;
