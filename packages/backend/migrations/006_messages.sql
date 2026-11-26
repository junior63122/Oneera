-- Messagerie entre amis (version réelle) : messages texte, position partagée, « rejoins-moi ici ».
-- Seuls deux amis acceptés peuvent s'écrire. Aucune lecture directe de la table : tout passe par des
-- fonctions qui vérifient l'appelant (Row-Level Security activée, aucun droit accordé au rôle applicatif).
CREATE TABLE messages (
  id bigserial PRIMARY KEY,
  sender uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'loc', 'meet')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  loc jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (sender <> recipient)
);
CREATE INDEX messages_pair_idx ON messages (least(sender, recipient), greatest(sender, recipient), id DESC);
CREATE INDEX messages_unread_idx ON messages (recipient, sender) WHERE read_at IS NULL;
REVOKE ALL ON messages FROM oneera_app;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app.are_friends(a uuid, b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM friendships WHERE user_a = least(a, b) AND user_b = greatest(a, b) AND status = 'accepted')
$$;

-- Envoi : ami accepté obligatoire ; la passerelle temps réel est prévenue (NOTIFY message_new).
CREATE OR REPLACE FUNCTION app.send_message(target uuid, k text, txt text, l jsonb)
RETURNS TABLE (id bigint, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id(); m messages;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non authentifié' USING ERRCODE = '42501'; END IF;
  IF target = me OR NOT app.are_friends(me, target) THEN RAISE EXCEPTION 'pas ami' USING ERRCODE = '42501'; END IF;
  INSERT INTO messages (sender, recipient, kind, body, loc) VALUES (me, target, k, txt, l) RETURNING * INTO m;
  PERFORM pg_notify('message_new', jsonb_build_object('id', m.id, 'from', m.sender, 'to', m.recipient, 'kind', m.kind,
    'body', m.body, 'loc', m.loc, 'at', m.created_at)::text);
  RETURN QUERY SELECT m.id, m.created_at;
END $$;
GRANT EXECUTE ON FUNCTION app.send_message(uuid, text, text, jsonb) TO oneera_app;

-- Fil avec un ami (du plus récent au plus ancien, pagination par identifiant).
CREATE OR REPLACE FUNCTION app.messages_with(other uuid, before_id bigint, lim int)
RETURNS TABLE (id bigint, mine boolean, kind text, body text, loc jsonb, created_at timestamptz, read_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.sender = app.current_user_id(), m.kind, m.body, m.loc, m.created_at, m.read_at
  FROM messages m
  WHERE least(m.sender, m.recipient) = least(other, app.current_user_id())
    AND greatest(m.sender, m.recipient) = greatest(other, app.current_user_id())
    AND app.current_user_id() IS NOT NULL AND other <> app.current_user_id()
    AND (before_id IS NULL OR m.id < before_id)
  ORDER BY m.id DESC
  LIMIT greatest(1, least(lim, 200))
$$;
GRANT EXECUTE ON FUNCTION app.messages_with(uuid, bigint, int) TO oneera_app;

-- Liste des discussions : dernier message et non-lus par ami.
CREATE OR REPLACE FUNCTION app.my_conversations()
RETURNS TABLE (friend_id uuid, last_id bigint, last_mine boolean, last_kind text, last_body text, last_at timestamptz, unread int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT app.current_user_id() AS u),
  pairs AS (
    SELECT DISTINCT ON (CASE WHEN m.sender = me.u THEN m.recipient ELSE m.sender END)
      CASE WHEN m.sender = me.u THEN m.recipient ELSE m.sender END AS friend_id, m.id, m.sender = me.u AS mine, m.kind, m.body, m.created_at
    FROM messages m, me WHERE me.u IN (m.sender, m.recipient)
    ORDER BY CASE WHEN m.sender = me.u THEN m.recipient ELSE m.sender END, m.id DESC)
  SELECT p.friend_id, p.id, p.mine, p.kind, p.body, p.created_at,
    (SELECT count(*)::int FROM messages x, me WHERE x.recipient = me.u AND x.sender = p.friend_id AND x.read_at IS NULL)
  FROM pairs p JOIN users u ON u.id = p.friend_id AND u.deleted_at IS NULL
  ORDER BY p.id DESC
$$;
GRANT EXECUTE ON FUNCTION app.my_conversations() TO oneera_app;

CREATE OR REPLACE FUNCTION app.mark_read(other uuid) RETURNS int
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (UPDATE messages SET read_at = now() WHERE recipient = app.current_user_id() AND sender = other AND read_at IS NULL RETURNING 1)
  SELECT count(*)::int FROM u
$$;
GRANT EXECUTE ON FUNCTION app.mark_read(uuid) TO oneera_app;

-- Les messages font partie de l'export des données personnelles.
CREATE OR REPLACE FUNCTION app.export_my_messages() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'from', sender, 'to', recipient, 'kind', kind, 'body', body, 'at', created_at) ORDER BY id), '[]')
  FROM messages WHERE app.current_user_id() IN (sender, recipient)
$$;
GRANT EXECUTE ON FUNCTION app.export_my_messages() TO oneera_app;
