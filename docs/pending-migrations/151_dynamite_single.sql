-- 151_dynamite_single.sql  (PREPARED by the worker; the OWNER holds the SQL gate.)
--
-- PROBLEM. BTS "Dynamite" is filed in the DB only as a track on the album BE
-- (album_tracks id 2815 -> albums id 7 "BE", release_date 2020-11-20). In reality
-- Dynamite was a STANDALONE digital single released 2020-08-21 (BTS's first
-- Billboard Hot 100 #1); it was ADDED to BE months later. So any release-date the
-- Verse derives for Dynamite reads 2020-11-20, which is wrong for the single.
--
-- SCHEMA TODAY. There is no singles/releases/release_types table: releases are
-- rows in `albums` (type in the observed set {'ep','album'}) with tracks in
-- `album_tracks(album_id, title, position, song_id)`. So the only faithful
-- representation of a standalone single is a new `albums` row of a 'single' type
-- plus its `album_tracks` link. Dynamite genuinely appears on BOTH the single and
-- BE, so the BE track row is KEPT; this migration only ADDS the missing single.
--
-- OWNER PRE-STEP (verify + run only if a CHECK restricts albums.type). The values
-- in use are 'ep'/'album'; if a CHECK constraint forbids 'single', widen it first
-- (confirm the real constraint name; the guess is albums_type_check):
--   ALTER TABLE albums DROP CONSTRAINT IF EXISTS albums_type_check;
--   ALTER TABLE albums ADD CONSTRAINT albums_type_check
--     CHECK (type IN ('album','ep','single','compilation','mixtape'));
-- If there is no such constraint, skip this pre-step. (Left OUT of the transaction
-- below so the owner runs it consciously.)

BEGIN;

-- 1) The standalone single release row. Idempotent (guarded on group+title+type).
--    group_id 1 = BTS. region 'kr' matches the group's other rows.
INSERT INTO albums (group_id, title, release_date, type, region)
SELECT 1, 'Dynamite', DATE '2020-08-21', 'single', 'kr'
WHERE NOT EXISTS (
  SELECT 1 FROM albums WHERE group_id = 1 AND title = 'Dynamite' AND type = 'single'
);

-- 2) Link the Dynamite recording to the single. song_id is copied from the
--    existing BE track so both point at the same recording. Idempotent.
INSERT INTO album_tracks (album_id, title, position, song_id)
SELECT s.id, 'Dynamite', 1, be.song_id
FROM albums s
JOIN albums beal ON beal.group_id = 1 AND beal.title = 'BE' AND beal.type = 'album'
JOIN album_tracks be ON be.album_id = beal.id AND be.title = 'Dynamite'
WHERE s.group_id = 1 AND s.title = 'Dynamite' AND s.type = 'single'
  AND NOT EXISTS (
    SELECT 1 FROM album_tracks x
    JOIN albums a ON a.id = x.album_id
    WHERE a.group_id = 1 AND a.title = 'Dynamite' AND a.type = 'single' AND x.title = 'Dynamite'
  );

-- 3) OPTIONAL (owner's call). Re-point the Verse "dynamite" page (id 133) to the
--    single's album_tracks row, so its DB-DERIVED fact rail shows Aug 21, 2020
--    instead of the BE date. The page's prose already states the truth, so this is
--    cosmetic. Left COMMENTED; uncomment to apply:
-- UPDATE pages SET entity_id = (
--   SELECT x.id FROM album_tracks x
--   JOIN albums a ON a.id = x.album_id
--   WHERE a.group_id = 1 AND a.title = 'Dynamite' AND a.type = 'single' AND x.title = 'Dynamite'
--   LIMIT 1
-- ), updated_at = now()
-- WHERE space_id = 1 AND slug = 'dynamite';

COMMIT;

-- VERIFY AFTER APPLY (should show the single 2020-08-21 as the earliest Dynamite release):
--   SELECT a.title, a.type, a.release_date
--   FROM albums a JOIN album_tracks t ON t.album_id = a.id
--   WHERE t.title = 'Dynamite' AND a.group_id = 1 ORDER BY a.release_date;
