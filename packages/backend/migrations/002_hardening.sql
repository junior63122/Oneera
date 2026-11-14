-- Durcissement : le client ne peut ni s'auto-accepter en ami, ni choisir l'établissement d'une donnée,
-- ni décider lui-même si une position alimente les statistiques organisateur.

-- Amitiés ---------------------------------------------------------------------------
DROP POLICY member ON friendships;
CREATE POLICY member_read ON friendships FOR SELECT USING (app.current_user_id() IN (user_a, user_b));
CREATE POLICY request ON friendships FOR INSERT
  WITH CHECK (requested_by = app.current_user_id() AND app.current_user_id() IN (user_a, user_b) AND status = 'pending');
CREATE POLICY respond ON friendships FOR UPDATE
  USING (app.current_user_id() IN (user_a, user_b))
  WITH CHECK (app.current_user_id() IN (user_a, user_b) AND (status <> 'accepted' OR requested_by <> app.current_user_id()));
CREATE POLICY remove ON friendships FOR DELETE USING (app.current_user_id() IN (user_a, user_b));

-- Invitation par QR / lien : le jeton prouve l'accord de l'invitant.
CREATE OR REPLACE FUNCTION app.accept_invite(tok text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := app.current_user_id(); inv friend_invites;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'non authentifié' USING ERRCODE = '42501'; END IF;
  SELECT * INTO inv FROM friend_invites WHERE token = tok FOR UPDATE;
  IF NOT FOUND OR inv.used_by IS NOT NULL OR inv.expires_at < now() OR inv.inviter = me THEN
    RAISE EXCEPTION 'invitation invalide ou expirée' USING ERRCODE = '22023';
  END IF;
  UPDATE friend_invites SET used_by = me WHERE token = tok;
  INSERT INTO friendships (user_a, user_b, status, requested_by)
  VALUES (least(me, inv.inviter), greatest(me, inv.inviter), 'accepted', inv.inviter)
  ON CONFLICT (user_a, user_b) DO UPDATE SET status = 'accepted' WHERE friendships.status = 'pending';
  RETURN inv.inviter;
END $$;
GRANT EXECUTE ON FUNCTION app.accept_invite(text) TO oneera_app;

-- Établissement déduit de l'événement --------------------------------------------------
CREATE OR REPLACE FUNCTION app.fill_org_from_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT organization_id INTO NEW.organization_id FROM events WHERE id = NEW.event_id;
  IF NEW.organization_id IS NULL THEN RAISE EXCEPTION 'événement inconnu' USING ERRCODE = '23503'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER fill_org BEFORE INSERT OR UPDATE OF event_id ON live_positions FOR EACH ROW EXECUTE FUNCTION app.fill_org_from_event();
CREATE TRIGGER fill_org BEFORE INSERT OR UPDATE OF event_id ON position_fixes FOR EACH ROW EXECUTE FUNCTION app.fill_org_from_event();
CREATE TRIGGER fill_org BEFORE INSERT OR UPDATE OF event_id ON incidents FOR EACH ROW EXECUTE FUNCTION app.fill_org_from_event();

-- Statistiques organisateur : seulement avec le consentement actif au moment de la mesure.
CREATE OR REPLACE FUNCTION app.fill_stats_consent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.for_venue_stats := EXISTS (SELECT 1 FROM consents c WHERE c.user_id = NEW.user_id
    AND c.purpose = 'location_venue_stats' AND c.withdrawn_at IS NULL);
  RETURN NEW;
END $$;
CREATE TRIGGER fill_stats BEFORE INSERT ON position_fixes FOR EACH ROW EXECUTE FUNCTION app.fill_stats_consent();
ALTER TABLE position_fixes ALTER COLUMN for_venue_stats SET DEFAULT false;

-- Le statut d'un incident n'est modifiable que par le staff ; le visiteur ne peut que créer.
DROP POLICY reporter_insert ON incidents;
CREATE POLICY reporter_insert ON incidents FOR INSERT
  WITH CHECK (reported_by = app.current_user_id() AND status = 'open' AND assigned_to IS NULL);

-- Accès public minimal à un événement via le code du QR (aucune donnée d'exploitation).
CREATE OR REPLACE FUNCTION app.event_by_code(code text)
RETURNS TABLE (event_id uuid, name text, during tstzrange, map_definition jsonb, map_version int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.id, e.name, e.during, m.definition, m.version
  FROM events e JOIN venue_maps m ON m.id = e.map_id
  WHERE e.access_code = code AND m.published_at IS NOT NULL
$$;
GRANT EXECUTE ON FUNCTION app.event_by_code(text) TO oneera_app;

-- Numéro de séquence strictement croissant pour la position en direct (anti-rejeu / désordre réseau).
CREATE OR REPLACE FUNCTION app.reject_stale_seq() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.seq <= OLD.seq THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER monotonic_seq BEFORE UPDATE ON live_positions FOR EACH ROW EXECUTE FUNCTION app.reject_stale_seq();
