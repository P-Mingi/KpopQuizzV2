-- WHAT: correct songs.year where the stored year is the act's debut year, not the release year
-- WHY: generate now serves year ranges (kpop-hits-2026, kpop-hits-2025, recent-hits, kpop-legends). The year column
--   is NULL on 3,964 of 4,120 songs, and the 156 rows the ingestion script wrote before V12 carry the act's debut
--   year instead of the release year (growth v12, SYSTEM.md 3; v11 decision 33).
-- ROWS: 98 update(s) of songs.year. No insert, no delete.
-- SOURCE: the public Deezer API, per track: release_date and ISRC. A year is written only when the release year is
--   the ISRC registration year; every other track is left untouched.
-- GENERATED: apps/quiz/scripts/v12/catalogue/build-years-sql.mts (anon key, nothing written), 2026-10-02T16:42:47.558Z.
--   Report: docs/growth/catalogue/v12-g2-04-05-years.md.
-- IDEMPOTENT: each row is matched on deezer_track_id AND on the year it holds today; a second run matches nothing.
-- APPLY ORDER: any time. Independent of the other v12-g2 files.
-- VERIFY: select year, count(*) from songs where deezer_track_id in (select d from (values (3953618771), (3315036911), (4048845611)) v(d)) group by 1;
-- UNDO: run the same statement with the two year columns of the values list swapped.

begin;
update songs s set year = v.new_year, updated_at = now()
from (values
  (3953618771, 2022, 2026),
  (3315036911, 2024, 2025),
  (4048845611, 2024, 2026),
  (3616742702, 2022, 2025),
  (3758369882, 2025, 2026),
  (4048845571, 2024, 2026),
  (3994187961, 2025, 2026),
  (3323050681, 2022, 2025),
  (4167424952, 2024, 2026),
  (3976692951, 2024, 2026),
  (3487140241, 2024, 2025),
  (4063736061, 2024, 2026),
  (3976692941, 2024, 2026),
  (3391965331, 2024, 2025),
  (4063736091, 2024, 2026),
  (3976692931, 2024, 2026),
  (3595814332, 2024, 2025),
  (3953618761, 2022, 2026),
  (4183906482, 2025, 2026),
  (3600774572, 2024, 2025),
  (2480160341, 2024, 2023),
  (3293899871, 2024, 2025),
  (4087604431, 2025, 2026),
  (3135697471, 2022, 2024),
  (4048845601, 2024, 2026),
  (3293899911, 2024, 2025),
  (3827175291, 2025, 2026),
  (3758369842, 2025, 2026),
  (3473951211, 2024, 2025),
  (3337521651, 2024, 2025),
  (4087604451, 2025, 2026),
  (4063736101, 2024, 2026),
  (3315036921, 2024, 2025),
  (3861932031, 2024, 2026),
  (3758369872, 2025, 2026),
  (3514913031, 2024, 2025),
  (2503980621, 2024, 2023),
  (3948103531, 2025, 2026),
  (3323050691, 2022, 2025),
  (3863988651, 2025, 2026),
  (3391965351, 2024, 2025),
  (3514912991, 2024, 2025),
  (3293899881, 2024, 2025),
  (4157164272, 2024, 2026),
  (3827375541, 2025, 2026),
  (3976692981, 2024, 2026),
  (3514913001, 2024, 2025),
  (4121008511, 2024, 2026),
  (3976692961, 2024, 2026),
  (3660524502, 2024, 2025),
  (3758369862, 2025, 2026),
  (4178804282, 2022, 2026),
  (4048845591, 2024, 2026),
  (4089668491, 2024, 2026),
  (2533931101, 2022, 2023),
  (3570119161, 2024, 2025),
  (3313211751, 2022, 2025),
  (3946155671, 2024, 2026),
  (3616742712, 2022, 2025),
  (3047609601, 2022, 2024),
  (3994187941, 2025, 2026),
  (3994187931, 2025, 2026),
  (4063736081, 2024, 2026),
  (3994187951, 2025, 2026),
  (3324968701, 2024, 2025),
  (3135697521, 2022, 2024),
  (3875168411, 2024, 2026),
  (4048845581, 2024, 2026),
  (2533931091, 2022, 2023),
  (3946155651, 2024, 2026),
  (3395330901, 2024, 2025),
  (2533931111, 2022, 2023),
  (3391965341, 2024, 2025),
  (3946155661, 2024, 2026),
  (3337521611, 2024, 2025),
  (4087604471, 2025, 2026),
  (3994187911, 2025, 2026),
  (3758369852, 2025, 2026),
  (4087604461, 2025, 2026),
  (4157164282, 2024, 2026),
  (3315036901, 2024, 2025),
  (2317353675, 2022, 2023),
  (3391965361, 2024, 2025),
  (2503980631, 2024, 2023),
  (4087604441, 2025, 2026),
  (3616742692, 2022, 2025),
  (4063736051, 2024, 2026),
  (3315036931, 2024, 2025),
  (3964491871, 2025, 2026),
  (3315036941, 2024, 2025),
  (3135697481, 2022, 2024),
  (3293899901, 2024, 2025),
  (3616742682, 2022, 2025),
  (4131564511, 2024, 2026),
  (3616742732, 2022, 2025)
) as v(deezer_id, old_year, new_year)
where s.deezer_track_id = v.deezer_id and s.year = v.old_year;

-- Stored year that neither the release date nor the ISRC supports (the debut year the old script wrote): removed.
update songs s set year = null, updated_at = now()
from (values
  (3536330211, 2024),
  (3683657342, 2024),
  (3166346511, 2022)
) as v(deezer_id, old_year)
where s.deezer_track_id = v.deezer_id and s.year = v.old_year;

commit;
