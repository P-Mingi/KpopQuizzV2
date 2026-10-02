-- WHAT: flag sourced title tracks (songs.is_title_track = true).
-- WHY: only 45 songs are flagged today and none of them is in the curated subset, so the "Title tracks only" playlist
--   is empty (v11 decision 33). Growth v12 flags the title tracks of the new songs and of the hits playlists, each from a
--   cited source (SYSTEM.md 3). A full backfill of the catalogue needs a sourced list and stays an owner decision.
-- ROWS: 22 update(s), one per song. No insert, no delete. A song that is not in the table yet (it comes with
--   v12-g2-02 or v12-g2-03) is simply not matched if those files are not applied first.
-- SOURCES: one public page per song, quoted in docs/growth/catalogue/v12-g2-06-title-tracks.md. Every page was fetched
--   and the quoted words were found on it (apps/quiz/scripts/v12/catalogue/verify-source.mts).
-- GENERATED: apps/quiz/scripts/v12/catalogue/build-title-tracks-sql.mts (anon key, nothing written), 2026-10-02T16:47:17.205Z.
-- IDEMPOTENT: each update only touches a row that is not flagged yet. Safe to run twice.
-- APPLY ORDER: after v12-g2-02-songs-new-groups.sql and v12-g2-03-releases-2026.sql.
-- VERIFY: select count(*) from songs where is_title_track and deezer_track_id in (3234208281, 3407280351, 3570464781, 3827375541, 4087604431, 3188858011, 3561319281, 3937976471, 2722856182, 2966352091, 3211215061, 3426703371, 3622618822, 3651343562, 2671407212, 2842874062, 2990968051, 3293899871, 3514912991, 3946155661, 4089668491, 4131564511);  -- 22
-- UNDO: update songs set is_title_track = null where deezer_track_id in (<the same ids>);
--   (the rows held NULL or false before; the report lists the previous value of each stored row)

begin;

-- Hearts2Hearts, The Chase. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3234208281 and is_title_track is distinct from true;

-- Hearts2Hearts, STYLE. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3407280351 and is_title_track is distinct from true;

-- Hearts2Hearts, FOCUS. Source: https://en.wikipedia.org/wiki/Focus_(Hearts2Hearts_EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3570464781 and is_title_track is distinct from true;

-- Hearts2Hearts, RUDE!. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3827375541 and is_title_track is distinct from true;

-- Hearts2Hearts, Lemon Tang. Source: https://en.wikipedia.org/wiki/Hearts2Hearts
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4087604431 and is_title_track is distinct from true;

-- KickFlip, Mama Said. Source: https://en.wikipedia.org/wiki/KickFlip
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3188858011 and is_title_track is distinct from true;

-- KickFlip, My First Love Song. Source: https://kpop.fandom.com/wiki/My_First_Flip
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3561319281 and is_title_track is distinct from true;

-- KickFlip, Eye-Poppin'. Source: https://en.wikipedia.org/wiki/KickFlip
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3937976471 and is_title_track is distinct from true;

-- RESCENE, UhUh. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2722856182 and is_title_track is distinct from true;

-- RESCENE, LOVE ATTACK. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2966352091 and is_title_track is distinct from true;

-- RESCENE, Glow Up. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3211215061 and is_title_track is distinct from true;

-- RESCENE, Deja Vu. Source: https://en.wikipedia.org/wiki/Rescene
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3426703371 and is_title_track is distinct from true;

-- RESCENE, Heart Drop. Source: https://www.koreatimes.co.kr/amp/entertainment/k-pop/20251125/rescene-bottles-up-berry-scent-on-new-mini-album-lip-bomb
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3622618822 and is_title_track is distinct from true;

-- RESCENE, Bloom. Source: https://www.koreatimes.co.kr/amp/entertainment/k-pop/20251125/rescene-bottles-up-berry-scent-on-new-mini-album-lip-bomb
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3651343562 and is_title_track is distinct from true;

-- NCT WISH, WISH (Korean Ver.). Source: https://en.wikipedia.org/wiki/Wish_(NCT_Wish_song)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2671407212 and is_title_track is distinct from true;

-- NCT WISH, Songbird (Korean Version). Source: https://en.wikipedia.org/wiki/NCT_Wish
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2842874062 and is_title_track is distinct from true;

-- NCT WISH, Steady. Source: https://en.wikipedia.org/wiki/Steady_(EP)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 2990968051 and is_title_track is distinct from true;

-- NCT WISH, poppop. Source: https://kpop.fandom.com/wiki/Poppop
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3293899871 and is_title_track is distinct from true;

-- NCT WISH, COLOR. Source: https://kpop.fandom.com/wiki/Color_(NCT_WISH)
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3514912991 and is_title_track is distinct from true;

-- NCT WISH, Ode to Love. Source: https://kpop.fandom.com/wiki/Ode_to_Love
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 3946155661 and is_title_track is distinct from true;

-- NCT WISH, BOY MEETS GIRL. Source: https://www.smentertainment.com/newsroom/nct-wish-%e6%97%a5-%ec%8b%b1%ea%b8%80-%eb%8d%94%eb%b8%94-%ed%83%80%ec%9d%b4%ed%8b%80%ea%b3%a1-boy-meets-girl-%ec%98%a4%eb%8a%9822%ec%9d%bc-%eb%b0%9c%eb%a7%a4-%ed%99%94%ec%a0%9c/
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4089668491 and is_title_track is distinct from true;

-- NCT WISH, YO-I-DON!. Source: https://www.smentertainment.com/newsroom/nct-wish-%e6%97%a5-%ed%8c%ac%eb%af%b8%ed%8c%85-%ec%a0%84%ec%84%9d-%eb%a7%a4%ec%a7%84-%e2%86%92-%ec%8b%a0%ea%b3%a1-yo-i-don-%ec%98%a4%eb%8a%9813%ec%9d%bc-%ea%b3%b5%ea%b0%9c/
update songs set is_title_track = true, updated_at = now() where deezer_track_id = 4131564511 and is_title_track is distinct from true;

commit;
