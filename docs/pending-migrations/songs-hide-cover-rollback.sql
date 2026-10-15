-- Rollback of songs-hide-cover.sql: removes the songs.hide_cover column and every switch in it.
-- OWNER-RUN. Safe with the code merged or not: the site reads the column in one guarded place
-- (apps/quiz/src/lib/song-cover-overrides.ts) and treats a missing column as "no switch". After this file,
-- soundtrack covers stay hidden by album name (apps/quiz/src/lib/soundtrack-album.ts); only the songs
-- switched on by hand (none unless step 3 of songs-hide-cover.sql was run, or a song was set later) show
-- their cover again.

alter table public.songs drop column if exists hide_cover;

notify pgrst, 'reload schema';

-- VERIFY: 0 rows.
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'songs' and column_name = 'hide_cover';
