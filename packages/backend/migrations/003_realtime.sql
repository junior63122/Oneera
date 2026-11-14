-- Notifications temps réel : toute modification pouvant changer qui voit la position de quelqu'un
-- est signalée aux passerelles (LISTEN share_changed), qui invalident leurs droits en cache
-- et retirent immédiatement la position chez les amis qui n'y ont plus accès.

CREATE OR REPLACE FUNCTION app.notify_share_changed() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  r := coalesce(NEW, OLD);
  IF TG_TABLE_NAME = 'location_shares' THEN
    PERFORM pg_notify('share_changed', r.owner_id::text);
  ELSIF TG_TABLE_NAME = 'consents' THEN
    PERFORM pg_notify('share_changed', r.user_id::text);
  ELSIF TG_TABLE_NAME = 'friendships' THEN
    PERFORM pg_notify('share_changed', r.user_a::text);
    PERFORM pg_notify('share_changed', r.user_b::text);
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER notify_share AFTER INSERT OR UPDATE OR DELETE ON location_shares FOR EACH ROW EXECUTE FUNCTION app.notify_share_changed();
CREATE TRIGGER notify_share AFTER INSERT OR UPDATE OR DELETE ON consents FOR EACH ROW EXECUTE FUNCTION app.notify_share_changed();
CREATE TRIGGER notify_share AFTER INSERT OR UPDATE OR DELETE ON friendships FOR EACH ROW EXECUTE FUNCTION app.notify_share_changed();

-- Qui peut voir la position de `owner` pour cet événement, maintenant ? (utilisé par la passerelle)
CREATE OR REPLACE FUNCTION app.audience_of(owner uuid, ev uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v FROM (
    SELECT CASE WHEN f.user_a = owner THEN f.user_b ELSE f.user_a END AS v
    FROM friendships f
    WHERE f.status = 'accepted' AND owner IN (f.user_a, f.user_b)
  ) x WHERE app.is_shared_with(owner, x.v, ev)
$$;

-- Écriture groupée des positions (une requête pour un lot de messages).
CREATE OR REPLACE FUNCTION app.ingest_positions(batch jsonb) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  INSERT INTO live_positions (user_id, event_id, organization_id, seq, measured_at, floor_id, pos, r68, zone_key, zone_prob, quality)
  SELECT DISTINCT ON (b.u, b.e) b.u, b.e, NULL, b.seq, b.t, b.floor, ST_MakePoint(b.x, b.y), b.r68, b.zone, b.zp, b.q
  FROM jsonb_to_recordset(batch) AS b(u uuid, e uuid, seq bigint, t timestamptz, floor text, x float8, y float8, r68 real, zone text, zp real, q text)
  ORDER BY b.u, b.e, b.seq DESC
  ON CONFLICT (user_id, event_id) DO UPDATE SET
    seq = EXCLUDED.seq, measured_at = EXCLUDED.measured_at, floor_id = EXCLUDED.floor_id, pos = EXCLUDED.pos,
    r68 = EXCLUDED.r68, zone_key = EXCLUDED.zone_key, zone_prob = EXCLUDED.zone_prob, quality = EXCLUDED.quality;
  INSERT INTO position_fixes (user_id, event_id, organization_id, measured_at, floor_id, pos, r68, zone_key)
  SELECT b.u, b.e, NULL, b.t, b.floor, ST_MakePoint(b.x, b.y), b.r68, b.zone
  FROM jsonb_to_recordset(batch) AS b(u uuid, e uuid, t timestamptz, floor text, x float8, y float8, r68 real, zone text)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
