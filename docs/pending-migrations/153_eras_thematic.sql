-- 153_eras_thematic.sql  (PREPARED by Cowork; the OWNER holds the SQL gate.)
--
-- Consolidate the BTS `eras` table from 15 per-album rows into 6 THEMATIC chapters,
-- matching the validated home "story so far" and the 6 era PAGES Cowork already published
-- (school-trilogy, hyyh-wings, love-yourself, map-of-the-soul, dynamite-be, japanese-releases,
--  bound to era ids 1..6). This makes the home timeline (getEras) show the 6 chapters instead
-- of 15 near-duplicate album-eras. Deletes era rows 7..15 (hard delete -> owner runs this).
--
-- Independent of 152_purge_arirang.sql: this sets the ARIRANG album's era_id to NULL and
-- deletes the ARIRANG era (id 15) so neither blocks the other, in any order.

BEGIN;

-- 1) repurpose era ids 1..6 as the 6 thematic chapters
UPDATE eras SET name='The school trilogy', slug='school-trilogy',
  period_start=DATE '2013-06-13', period_end=DATE '2014-08-20', scaffolded=false WHERE id=1;
UPDATE eras SET name='The Most Beautiful Moment in Life & WINGS', slug='hyyh-wings',
  period_start=DATE '2015-04-29', period_end=DATE '2016-10-10', scaffolded=false WHERE id=2;
UPDATE eras SET name='Love Yourself', slug='love-yourself',
  period_start=DATE '2017-09-18', period_end=DATE '2018-05-18', scaffolded=false WHERE id=3;
UPDATE eras SET name='Map of the Soul', slug='map-of-the-soul',
  period_start=DATE '2019-04-12', period_end=DATE '2020-02-21', scaffolded=false WHERE id=4;
UPDATE eras SET name='Dynamite & BE', slug='dynamite-be',
  period_start=DATE '2020-08-21', period_end=DATE '2020-11-20', scaffolded=false WHERE id=5;
-- Japanese releases: cross-cutting -> NULL period so getEras sorts it last (nulls last).
UPDATE eras SET name='Japanese releases', slug='japanese-releases',
  period_start=NULL, period_end=NULL, scaffolded=false WHERE id=6;

-- 2) re-point every album to its thematic era (match by exact title, group_id=1)
UPDATE albums SET era_id=1 WHERE group_id=1 AND title IN ('O!RUL8,2?','Skool Luv Affair','DARK&WILD');
UPDATE albums SET era_id=2 WHERE group_id=1 AND title IN ('화양연화 pt.1','화양연화 pt.2','WINGS');
UPDATE albums SET era_id=3 WHERE group_id=1 AND title IN ('LOVE YOURSELF 承 ‘Her’','LOVE YOURSELF 轉 ‘Tear’');
UPDATE albums SET era_id=4 WHERE group_id=1 AND title IN ('MAP OF THE SOUL : PERSONA','MAP OF THE SOUL : 7','BTS WORLD: Original Soundtrack');
UPDATE albums SET era_id=5 WHERE group_id=1 AND title IN ('Dynamite','BE');
UPDATE albums SET era_id=6 WHERE group_id=1 AND title IN ('WAKE UP','YOUTH','FACE YOURSELF','MAP OF THE SOUL : 7 〜 THE JOURNEY 〜');
-- junk ARIRANG: detach (it is deleted by 152); NULL so deleting its era does not FK-block
UPDATE albums SET era_id=NULL WHERE group_id=1 AND title='ARIRANG';

-- 3) drop the now-unused per-album era rows (7..15)
DELETE FROM eras WHERE id BETWEEN 7 AND 15;

COMMIT;

-- VERIFY AFTER APPLY:
--   SELECT id,name,slug,period_start FROM eras WHERE group_id=1 ORDER BY period_start DESC NULLS LAST;  -- 6 rows
--   SELECT e.name, count(a.id) FROM eras e LEFT JOIN albums a ON a.era_id=e.id WHERE e.group_id=1 GROUP BY e.name;
--   -- home /verse/bts "story so far" should now show the 6 chapters, newest first, Japanese last.
