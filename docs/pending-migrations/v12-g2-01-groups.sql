-- WHAT: add the groups RESCENE and NCT WISH to `groups`.
-- WHY: growth v12, SYSTEM.md 3 (catalogue completion). Without a group row their songs can never become a
--   group playlist (lib/blind-test-playlists.ts needs a group with at least 10 clean songs linked to it).
-- ROWS: 2 inserts into groups. No update, no delete.
-- FACTS: every non-default value below is confirmed by two sources that were opened on 2026-10-02 (an official
--   or label source, or a major outlet quoting the label, plus a reference wiki). The sources and the quotes are
--   in docs/growth/catalogue/v12-g2-01-groups.md. A fact that two sources did not confirm is left NULL:
--   generation (both), origin_country (both), official_website (both). See the report for each one.
--   display_color / text_color are the catalogue's neutral default pair (the one NCT DREAM and NCT 127 carry),
--   not facts. seo_intro and logo_url stay NULL: typographic cover until the owner adds a photo.
-- IDEMPOTENT: on conflict do nothing (groups.name and groups.slug are both unique). Safe to run twice.
-- APPLY ORDER: first of the v12-g2 files. v12-g2-02-songs-new-groups.sql resolves group_id from these slugs.
-- VERIFY: select id, name, slug, fandom_name, inception_date, record_label from groups where slug in ('rescene', 'nct-wish');  -- 2 rows
-- UNDO (only while no song, quiz or page points at them):
--   update songs set group_id = null where group_id in (select id from groups where slug in ('rescene', 'nct-wish'));
--   delete from groups where slug in ('rescene', 'nct-wish') and quiz_count = 0;

begin;

insert into groups (
  name, slug, fandom_name, display_color, text_color, is_custom, created_by_user, needs_review,
  inception_date, record_label, wikidata_qid, musicbrainz_mbid, spotify_artist_id, deezer_artist_id
) values
  ('RESCENE', 'rescene', 'REMINE', '#F1EFE8', '#444441', false, false, false,
   '2024-03-26', 'The Muze Entertainment', 'Q124856415', 'a54fd8e2-d319-44a6-aa60-21adf17751bf', '5deOsjuFTKrNMJW3rKuL8S', 256312822),
  ('NCT WISH', 'nct-wish', 'NCTzen', '#F1EFE8', '#444441', false, false, false,
   '2024-02-21', 'SM Entertainment', 'Q122575981', 'fb175979-152f-4f32-bf8b-08aa86c24fe3', '4FqmqIspLaUGtxAFFLsZxc', 250913622)
on conflict do nothing;

commit;
