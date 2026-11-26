-- Découverte des amis par les contacts du téléphone, sans jamais transmettre les contacts en clair.
-- Le téléphone envoie des empreintes SHA-256 (numéros au format international, e-mails en minuscules) ;
-- le serveur ne stocke que les empreintes des identifiants de ses utilisateurs.
CREATE TABLE user_identifiers (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('email', 'phone')),
  hash text NOT NULL CHECK (hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, hash)
);
CREATE INDEX user_identifiers_hash_idx ON user_identifiers (hash);
REVOKE ALL ON user_identifiers FROM oneera_app;
ALTER TABLE user_identifiers ENABLE ROW LEVEL SECURITY;

-- Correspondance : utilisateurs dont une empreinte figure dans la liste, avec l'état d'amitié vu par l'appelant.
CREATE OR REPLACE FUNCTION app.match_contacts(hashes text[])
RETURNS TABLE (user_id uuid, display_name text, avatar jsonb, status text, requested_by_me boolean, matched text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (u.id) u.id, u.display_name, u.avatar,
         coalesce(f.status, 'none'), coalesce(f.requested_by = app.current_user_id(), false), i.hash
  FROM user_identifiers i
  JOIN users u ON u.id = i.user_id AND u.deleted_at IS NULL
  LEFT JOIN friendships f ON f.user_a = least(u.id, app.current_user_id()) AND f.user_b = greatest(u.id, app.current_user_id())
  WHERE i.hash = ANY (hashes) AND u.id <> app.current_user_id() AND coalesce(f.status, '') <> 'blocked'
  ORDER BY u.id
$$;
GRANT EXECUTE ON FUNCTION app.match_contacts(text[]) TO oneera_app;

-- Demande d'ami : crée une demande en attente, ou accepte directement si l'autre m'avait déjà demandé.
CREATE OR REPLACE FUNCTION app.request_friend(target uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id(); f friendships;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non authentifié' USING ERRCODE = '42501'; END IF;
  IF target = me OR NOT EXISTS (SELECT 1 FROM users WHERE id = target AND deleted_at IS NULL) THEN RETURN 'invalid'; END IF;
  SELECT * INTO f FROM friendships WHERE user_a = least(me, target) AND user_b = greatest(me, target) FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO friendships (user_a, user_b, status, requested_by) VALUES (least(me, target), greatest(me, target), 'pending', me);
    RETURN 'pending';
  ELSIF f.status = 'pending' AND f.requested_by <> me THEN
    UPDATE friendships SET status = 'accepted' WHERE user_a = f.user_a AND user_b = f.user_b;
    RETURN 'accepted';
  END IF;
  RETURN f.status;
END $$;
GRANT EXECUTE ON FUNCTION app.request_friend(uuid) TO oneera_app;
