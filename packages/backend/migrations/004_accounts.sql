-- Comptes e-mail + mot de passe (version de test réelle), codes d'invitation courts, événement de démonstration.

-- L'API se connecte avec le propriétaire de la base (non superutilisateur chez un hébergeur) :
-- elle doit pouvoir endosser le rôle applicatif soumis à la RLS.
GRANT oneera_app TO CURRENT_USER;

-- Identifiants : lus et écrits UNIQUEMENT par l'API en mode système (jamais exposés au rôle applicatif).
CREATE TABLE user_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  password_hash text NOT NULL,      -- scrypt (sel aléatoire), format « scrypt$N$r$p$sel$hash »
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX user_credentials_email_idx ON user_credentials (lower(email));
REVOKE ALL ON user_credentials FROM oneera_app;
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;

-- Code d'invitation court, lisible et saisissable à la main (6 caractères sans 0/O/1/I).
CREATE OR REPLACE FUNCTION app.new_invite_code() RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id(); code text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non authentifié' USING ERRCODE = '42501'; END IF;
  -- Un code actif à la fois par personne : l'ancien est remplacé.
  DELETE FROM friend_invites WHERE inviter = me AND used_by IS NULL;
  LOOP
    code := '';
    FOR i IN 1..6 LOOP code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); END LOOP;
    BEGIN
      INSERT INTO friend_invites (token, inviter, expires_at) VALUES (code, me, now() + interval '7 days');
      RETURN code;
    EXCEPTION WHEN unique_violation THEN -- rare : on retire un autre code
    END;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION app.new_invite_code() TO oneera_app;

-- Amis visibles avec leur nom et leur avatar (lecture limitée aux amitiés de l'utilisateur courant).
CREATE OR REPLACE FUNCTION app.my_friends()
RETURNS TABLE (user_id uuid, display_name text, avatar jsonb, status text, requested_by_me boolean, since timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.display_name, u.avatar, f.status, f.requested_by = app.current_user_id(), f.created_at
  FROM friendships f
  JOIN users u ON u.id = CASE WHEN f.user_a = app.current_user_id() THEN f.user_b ELSE f.user_a END
  WHERE app.current_user_id() IN (f.user_a, f.user_b) AND f.status <> 'blocked' AND u.deleted_at IS NULL
$$;
GRANT EXECUTE ON FUNCTION app.my_friends() TO oneera_app;

-- Événement de démonstration (carte « Le Bal des Fous » du prototype, coordonnées en % du plan).
INSERT INTO tenants (slug, name) VALUES ('oneera', 'ONEERA') ON CONFLICT (slug) DO NOTHING;
DO $$
DECLARE t uuid; o uuid; v uuid; m uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM events WHERE access_code = 'BDF-DEMO') THEN RETURN; END IF;
  SELECT id INTO t FROM tenants WHERE slug = 'oneera';
  INSERT INTO organizations (tenant_id, name) VALUES (t, 'ONEERA — démonstration') RETURNING id INTO o;
  INSERT INTO venues (organization_id, name, kind) VALUES (o, 'Le Bal des Fous (démo)', 'festival') RETURNING id INTO v;
  INSERT INTO venue_maps (venue_id, organization_id, version, definition, published_at)
    VALUES (v, o, 1, '{"coords":"percent","floors":[{"id":"L0","name":"Plan"}]}', now()) RETURNING id INTO m;
  INSERT INTO events (venue_id, organization_id, map_id, name, during, access_code)
    VALUES (v, o, m, 'Le Bal des Fous (démo)', tstzrange(now() - interval '1 day', now() + interval '2 years'), 'BDF-DEMO');
END $$;
