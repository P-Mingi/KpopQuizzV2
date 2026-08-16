-- 152_purge_arirang.sql  (PREPARED by Cowork; the OWNER holds the SQL gate.)
--
-- PROBLEM. albums id 2 "ARIRANG" (group_id=1 = BTS, type 'album', region 'kr',
-- release_date 2026-03-20) is JUNK wrongly attributed to BTS. Its 14 tracks are not
-- BTS songs (e.g. "they don't know 'bout us", "One More Night", "Hooligan", "Aliens").
-- It leaks onto BTS surfaces that read the `albums` table directly: the legacy
-- /verse/[slug]/albums/[album] route, sitemap.ts (emits /verse/bts/albums/arirang),
-- and the Verse "releases" count. Cowork has already TRASHED the 15 Verse tree pages
-- built from it (release page id 49 + 14 track pages ids 57-70); this migration removes
-- the underlying music-DB rows so it stops leaking everywhere else too.
--
-- SAFETY. FKs into albums: album_tracks.album_id (14 rows) and photocards.album_id
-- (0 rows for this album, verified). Nothing FKs album_tracks.id. So deleting the 14
-- track rows then the album row is clean. Guarded so it ONLY fires on the exact junk
-- row (title ARIRANG + the 2026-03-20 date), never a real album. Idempotent.
--
-- REVERSIBILITY NOTE. This is a hard delete of shared music data. If you would rather
-- keep it recoverable, reassign group_id to a placeholder / non-BTS group instead of
-- deleting (swap the DELETEs for an UPDATE albums SET group_id=<placeholder>). Cowork's
-- recommendation is deletion: it is junk, and no real feature needs it.

BEGIN;

-- 1) remove the junk tracklist (guarded to the exact junk album)
DELETE FROM album_tracks
WHERE album_id = (
  SELECT id FROM albums
  WHERE id = 2 AND group_id = 1 AND title = 'ARIRANG' AND release_date = DATE '2026-03-20'
);

-- 2) remove the junk album row itself (same guard)
DELETE FROM albums
WHERE id = 2 AND group_id = 1 AND title = 'ARIRANG' AND release_date = DATE '2026-03-20';

COMMIT;

-- VERIFY AFTER APPLY (both should be 0):
--   SELECT count(*) FROM albums WHERE id = 2;
--   SELECT count(*) FROM album_tracks WHERE album_id = 2;
-- And BTS release count should drop from 17 to 16 real albums.
