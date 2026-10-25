-- applied in production on 2026-10-25: steps 1 and 2 (177 songs, 167 active, 147 albums); the optional step 3 was not run.
-- WHAT: songs.hide_cover, a boolean "never show this song's Deezer cover" switch, set to true for every song
--   on a soundtrack album (drama, film, series, webtoon or game OST). Mission U, part C.
-- WHY: a soundtrack album's Deezer cover is most likely the show's key art (the drama or film poster). The
--   game is text and audio only for those songs, like the KPop Demon Hunters songs today (withoutKpdhCover).
-- ROWS: 1 column added; 177 songs set to true (147 albums, 167 of the songs active), counted on 2026-10-15.
--   The exact album list, with song counts: docs/pending-migrations/songs-hide-cover-ALBUMS.md.
-- RULES: the same eight rules as the code (apps/quiz/src/lib/soundtrack-album.ts), whole words only, case
--   insensitive. On the real catalogue the code and this file pick the identical 147 albums (same md5 of the
--   sorted "album:count" list, 9f9bf1f3208816ef0dab8d17a4491b82, computed both ways on 2026-10-15).
-- FAIL SOFT, BEFORE AND AFTER: the site already hides every one of these covers by album name, without this
--   column. No select list asks for hide_cover; it is read in one guarded place
--   (apps/quiz/src/lib/song-cover-overrides.ts) that answers "no switch" while the column is missing.
--   Running this file changes nothing visible on day one; it adds the manual switch for later.
-- NEVER TOUCHED: status, pools, counters, cover URLs, any other table. songs has no trigger, so updated_at
--   does not move.
-- IDEMPOTENT: add column if not exists; the update only flips rows that are still false. Safe to run twice.
-- APPLY ORDER: any time, before or after the code is merged.
-- VERIFY: the last select of this file (expected numbers below it).
-- UNDO: docs/pending-migrations/songs-hide-cover-rollback.sql
--
-- LATER, BY HAND: to hide one more song, update public.songs set hide_cover = true where id = '<song id>';
--   the site picks it up within 10 minutes. Setting it back to false only undoes a hand switch: a song on a
--   soundtrack album by name stays hidden by the code.

begin;

-- 1. The switch.
alter table public.songs add column if not exists hide_cover boolean not null default false;

comment on column public.songs.hide_cover is
  'Never show this song''s album cover (soundtrack key art). Set for soundtrack albums by songs-hide-cover.sql; can be set by hand. Read by apps/quiz/src/lib/song-cover-overrides.ts.';

-- 2. Every song on a soundtrack album. One line per rule, in the order of SOUNDTRACK_RULES in the code.
update public.songs
set hide_cover = true
where hide_cover = false
  and album_name is not null
  and (
       album_name ~* '\msound? ?tracks?\M'                          -- Soundtrack(s), Sound Track, the "Sountrack" typo
    or (album_name ~* '\most\M' and album_name !~* '^\s*ost\s*$')   -- the word OST, but not an album titled just "OST" (Ash Island single)
    or album_name ~* '\mfrom the netflix\M'                         -- "(from the Netflix Series ...)"
    or album_name ~* '\mdisney\+ original\M'                        -- "(... from the Disney+ Original)"
    or album_name ~* '\m(original|tv|television) series\M'          -- "Music from the HBO Original Series", "Original TV Series"
    or album_name ~* '\mfrom the series\M'                          -- "(from the series Arcane League of Legends)"
    or album_name ~* '\mmotion pictures?\M'                         -- "Original Motion Picture Soundtrack", "K-POPS! Motion Picture"
    or album_name ~* '\mfrom\M[^()]*\mthe (movie|film)\M'           -- "Messy (From F1® The Movie)"
  );

-- 3. OPTIONAL, owner's call: 12 songs that look like soundtrack tie-ins but whose album name carries no
--    soundtrack marker, so no rule catches them (listed with reasons in songs-hide-cover-ALBUMS.md, section 3).
--    Not verified against a source. To hide their covers too, remove the two dashes in front of each line
--    of the statement below before running the file.
-- update public.songs set hide_cover = true where id in (
--   '1ed013ef-f028-41e8-b16a-b668e64fc4b2', -- Ailee, Because of Tears (a drama song: album name in songs-hide-cover-ALBUMS.md)
--   '15d26394-0873-4f90-ad6b-02db7835e63d', -- Kep1er, I Stay (From "Ne Zha 2")
--   '2ed78a44-05a8-4f2b-93c2-7fc612ed47a2', -- fromis_9, Love Me Back (From "Operation: True Love")
--   '75ec375d-3c84-42ad-9e55-d5656e0276dd', -- izna, Psycho (From "Operation: True Love")
--   'fa4ba79a-745a-4a99-93e9-9f929d179806', -- FIFTY FIFTY, Barbie Dreams [From Barbie The Album]
--   'efe91ef5-702b-4a0b-bd75-d0685daaecd5', -- Sam Kim, Say You Love Me (Sam Kim X MY DEMON)
--   '7ad7e890-c4cc-4af8-914b-65ed7aa9139e', -- VIVIZ, Come on baby tonight (Ditto X VIVIZ)
--   'a3e0f453-7066-4569-9967-452ed0216c76', -- Loco, Your Day (Romance 101 X Loco)
--   '5acfcd8b-0667-490c-947d-8631b6558ad2', -- Gray, STAY THE NIGHT (She is My Type X GRAY)
--   'c8ceaf85-fc5f-4c6e-9559-73b5817608e7', -- Crush, Sweet Love (She is My Type X Crush)
--   '493e07b5-7019-457d-8c3a-9a8181badac2', -- Jimin, Angel Pt. 1 (Trailer Version), FAST X tie-in
--   '5e31f50b-04d8-45e8-bd67-bc8f40879e7d'  -- UNIS, Pinky Lady (Music from THE SPECIALS)
-- );

commit;

-- The API sees the new column at once.
notify pgrst, 'reload schema';

-- VERIFY
select count(*) filter (where hide_cover) as hidden_songs,
       count(*) filter (where hide_cover and status = 'active') as hidden_active_songs,
       count(distinct album_name) filter (where hide_cover) as hidden_albums
from public.songs;
-- Expected on 2026-10-15: hidden_songs 177, hidden_active_songs 167, hidden_albums 147
-- (plus 12 songs and 12 albums if step 3 was uncommented; more only if soundtrack songs were added since).
