#!/bin/sh
# G7: apply the two pending SQL files on a throwaway LOCAL Postgres and check them.
set -e
S="$(cd "$(dirname "$0")" && pwd)"
W=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/agent-a9121e2a83917332f
run() { psql -h /tmp -p 54397 -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
run -c "drop database if exists g7test" -c "create database g7test"
run -d postgres -c "drop role if exists anon" -c "drop role if exists authenticated" -c "drop role if exists service_role"
run -d g7test -f "$S/setup.sql"
echo "--- apply v12-g7-this-or-that.sql"
run -d g7test -f "$W/docs/pending-migrations/v12-g7-this-or-that.sql"
echo "--- apply it again (idempotent)"
run -d g7test -f "$W/docs/pending-migrations/v12-g7-this-or-that.sql"
echo "--- checks"
run -d g7test -f "$S/checks.sql"
echo "--- apply v12-g7-song-questions.sql"
run -d g7test -f "$W/docs/pending-migrations/v12-g7-song-questions.sql"
run -d g7test -tA -c "select 'S1 ' || q.group_slug || ' min_votes=' || q.min_votes || ' prompt=' || q.prompt || ' songs=' || count(r.*) || ' all_from_catalogue=' || bool_and(exists(select 1 from songs s where s.id = r.entity_id)) from duel_questions q left join duel_ratings r on r.question_id = q.id where q.question_type = 'songs' group by q.group_slug, q.min_votes, q.prompt order by 1"
run -d g7test -tA -c "select 'S2 riize duplicate title rows: ' || count(*) from duel_ratings r join duel_questions q on q.id = r.question_id where q.group_slug = 'riize' and lower(btrim(r.entity_name)) = 'song 20'"
run -d g7test -tA -c "select 'S3 riize songs: ' || string_agg(entity_name, ',' order by entity_name) from duel_ratings r join duel_questions q on q.id = r.question_id where q.group_slug = 'riize'"
run -d g7test -tA -c "select 'S4 before second run q/r/v: ' || (select count(*) from duel_questions) || '/' || (select count(*) from duel_ratings) || '/' || (select count(*) from duel_votes)"
echo "--- apply it again (idempotent)"
run -d g7test -f "$W/docs/pending-migrations/v12-g7-song-questions.sql"
run -d g7test -tA -c "select 'S5 after second run q/r/v: ' || (select count(*) from duel_questions) || '/' || (select count(*) from duel_ratings) || '/' || (select count(*) from duel_votes)"
echo "--- a vote on a seeded question"
run -d g7test -tA -c "select 'S6 ' || status || ' ' || votes_a || '/' || votes_b from (select q.id qid, (array_agg(r.entity_id order by r.entity_name))[1] a, (array_agg(r.entity_id order by r.entity_name))[2] b from duel_questions q join duel_ratings r on r.question_id = q.id where q.group_slug = 'riize' group by q.id) x, duel_cast_song_vote(x.qid, x.a, x.b, x.a, 'voterhash-seeded-01')"
echo "--- undo of the seed (as written in the file header)"
run -d g7test -tA -c "delete from public.duel_questions q where q.question_type = 'songs' and q.min_votes = 100 and not exists (select 1 from public.duel_votes v where v.question_id = q.id) and not exists (select 1 from public.duel_ratings r where r.question_id = q.id and not exists (select 1 from public.songs s where s.id = r.entity_id))"
run -d g7test -tA -c "select 'S7 after undo, song questions left: ' || string_agg(group_slug, ',' order by group_slug) from duel_questions where question_type = 'songs'"
