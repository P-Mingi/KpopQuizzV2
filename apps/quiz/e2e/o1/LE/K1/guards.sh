#!/bin/bash
# Lot (e) part 1, lane K1: the rollback guards of 009 to 015. For each rollback file, a transaction puts in the data that file
# must refuse to delete, runs the file (it must stop with "rollback refused" and change nothing), then rolls back. Prints one
# "GUARD <file> refused|NOT-REFUSED" line per file; exit 1 when one is not refused. Nothing persists. The URL is never printed.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../../../../.." && pwd)"
M="$ROOT/docs/pending-migrations/multisite"
S=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1
fail=0
run() { # name, rollback file, setup sql
  local name="$1" file="$2" setup="$3" tmp out rc
  tmp="$(mktemp)"
  printf 'begin;\nset client_min_messages = warning;\n%s\n\\i %s\nrollback;\n' "$setup" "$M/$file" > "$tmp"
  out="$("$S/env.sh" scratch -- bash -c '/opt/homebrew/opt/postgresql@18/bin/psql "$O1_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$1" 2>&1' _ "$tmp")"; rc=$?
  rm -f "$tmp"
  if [ $rc -ne 0 ] && echo "$out" | grep -q 'rollback refused'; then echo "GUARD $name refused"; else echo "GUARD $name NOT-REFUSED (rc=$rc)"; echo "$out" | tail -3 >&2; fail=1; fi
}
GROUP="insert into public.groups (name, slug, display_color, text_color, site_id) values ('Guard G', 'guard-g', '#111111', '#ffffff', 'anime');
insert into public.series (group_id, type, title_en, status, published) select id, 'manga', 'Guard series', 'ongoing', true from public.groups where slug = 'guard-g';"
run 009 009-daily-prep.rollback.sql "update public.sites set system_user_id = '00000000-0000-0000-0000-000000000001' where id = 'anime';"
run 010 010-daily-v2.rollback.sql "insert into public.quiz_bank (title, category, questions, status, site_id) values ('Guard bank', 'series_specific', '[1,2,3]'::jsonb, 'draft', 'anime');"
run 011 011-anime-series.rollback.sql "$GROUP"
run 012 012-editorial-quiz.rollback.sql "insert into public.review_batches (site_id, lane, label, size) values ('anime', 'e1b', 'Guard batch', 10);"
run 013 013-formats.rollback.sql "$GROUP
insert into public.characters (group_id, slug, name, role) select id, 'guard-c', 'Guard C', 'main' from public.groups where slug = 'guard-g';
insert into public.personality_profiles (group_id, member_name, member_slug, axes, trait_lines, ord, active, site_id, character_id)
select g.id, 'Guard', 'guard', '{}'::jsonb, array['a'], 1, true, 'anime', c.id from public.groups g join public.characters c on c.group_id = g.id where g.slug = 'guard-g';"
run 014 014-daily-openings.rollback.sql "$GROUP
insert into public.series_themes (group_id, kind, number, title, artist, deezer_playable, status) select id, 'op', 1, 'Guard op', 'Guard', true, 'published' from public.groups where slug = 'guard-g';
insert into public.daily_openings (site_id, date, theme_id) select 'anime', date '2034-01-01', t.id from public.series_themes t join public.groups g on g.id = t.group_id where g.slug = 'guard-g';"
run 015 015-spoilers.rollback.sql "insert into public.groups (name, slug, display_color, text_color, site_id) values ('Guard G', 'guard-g', '#111111', '#ffffff', 'anime');
insert into public.quizzes (creator_id, group_id, title, slug, questions, site_id, spoiler_cover_until) select '00000000-0000-0000-0000-000000000001', id, 'Guard quiz', 'guard-quiz', '[1,2,3]'::jsonb, 'anime', now() + interval '1 day' from public.groups where slug = 'guard-g';"
exit $fail
