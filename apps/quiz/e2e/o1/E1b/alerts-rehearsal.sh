#!/usr/bin/env bash
# alerts-rehearsal.sh (run O1, lot E1b): the group quiz alerts of SQL 025, played on a throwaway local Postgres 18 cluster built from
# production's schema copy. It never connects to Supabase. For the integrator, not for the owner.
#
#     TMPDIR=$HOME/kpq-o1/tmp-e1b bash apps/quiz/e2e/o1/E1b/alerts-rehearsal.sh --prod-copy <path to KPQ prod-public.sql>
#
# The base is the one of docs/launch/o1/session-rehearsal.sh (platform part of schema.base.sql, production's schema copy, the rows part,
# S4, Mission U part D). Then 001 to 008 through docs/launch/o1/session.sh B1 B2 B3 D (their own gates and checks), then:
#   1. with 008 only: the first quiz of a group notifies its two subscribers, the second quiz notifies nobody (the one-shot of today);
#   2. 025 applied twice (the second run changes nothing: schema and rows read before and after);
#   3. with 025: every quiz published in the group notifies every subscriber again, notified_at is the time of the last notification,
#      the creator is never notified, another group's subscribers are left alone, a subscriber who joined later is notified by the next
#      quiz, a quiz published again after a flag does not duplicate, a subscriber who turned "following" off gets nothing, a failing
#      notification insert never blocks the publish, a draft published later by an update notifies too;
#   4. the rollback file puts 008's body back byte for byte (same md5 of prosrc) and the alert is one-shot again; 025 is applied again.
# Prints PASS or FAIL per step. Exit 0 when every step passed. The cluster is stopped and its folder removed at the end, pass or fail.

set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../../../.." && pwd)"
cd "$ROOT" || exit 2
COPY=""
[ "${1:-}" = "--prod-copy" ] && COPY="${2:-}"
[ -f "$COPY" ] || { echo "usage: bash apps/quiz/e2e/o1/E1b/alerts-rehearsal.sh --prod-copy <prod-public.sql>"; exit 2; }

PG_BIN="${O1_PG_BIN:-/opt/homebrew/opt/postgresql@18/bin}"
export PATH="$PG_BIN:$PATH" LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
M=docs/pending-migrations/multisite
WORK="$(mktemp -d "${TMPDIR:-/tmp}/kpq-e1b-alerts.XXXXXX")"
PORT="$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
fails=0
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*"; fails=$((fails + 1)); }
cleanup() { pg_ctl -D "$WORK/data" -m fast -w stop >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT

initdb -D "$WORK/data" -U postgres -A trust -E UTF8 >/dev/null 2>&1 || { echo "FAIL initdb"; exit 1; }
pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1" -l "$WORK/pg.log" -w start >/dev/null || { echo "FAIL cluster start"; exit 1; }
ADMIN="postgresql://postgres@127.0.0.1:$PORT/postgres"
BASE="postgresql://postgres@127.0.0.1:$PORT/base"
DB="postgresql://postgres@127.0.0.1:$PORT/prod"
run() { psql "$1" -X -q -v ON_ERROR_STOP=1 "${@:2}" >>"$WORK/build.log" 2>&1; }
q() { psql "$DB" -X -q -At -v ON_ERROR_STOP=1 -c "$1" 2>>"$WORK/build.log"; }
# check <label> <expected> <sql>: the sql returns one value.
check() {
  local got; got="$(q "$3")"
  if [ "$got" = "$2" ]; then pass "$1 ($got)"; else fail "$1: got '$got', expected '$2'"; fi
}

# ---- the base (the one of session-rehearsal.sh) ---------------------------------------------------------------------------
B=docs/o1/contracts/schema.base.sql
P=$(grep -n '^-- Public tables' "$B" | cut -d: -f1)
R=$(grep -n '^-- Rows' "$B" | cut -d: -f1)
head -n $((P - 1)) "$B" >"$WORK/10-platform.sql"
tail -n +"$R" "$B" >"$WORK/40-rows.sql"
cat >"$WORK/15-platform-extra.sql" <<'SQL'
alter table auth.users add column if not exists instance_id uuid, add column if not exists aud text, add column if not exists role text,
  add column if not exists encrypted_password text, add column if not exists confirmation_token text, add column if not exists recovery_token text,
  add column if not exists email_change_token_new text, add column if not exists email_change text, add column if not exists raw_app_meta_data jsonb,
  add column if not exists raw_user_meta_data jsonb, add column if not exists banned_until timestamptz, add column if not exists updated_at timestamptz;
alter table storage.buckets add column if not exists file_size_limit bigint, add column if not exists allowed_mime_types text[],
  add column if not exists created_at timestamptz default now(), add column if not exists updated_at timestamptz default now();
alter table storage.objects enable row level security;
create extension if not exists pgcrypto with schema extensions;
SQL
run "$ADMIN" -c "create database base" &&
  run "$BASE" -f "$WORK/10-platform.sql" && run "$BASE" -f "$WORK/15-platform-extra.sql" && run "$BASE" -f "$COPY" &&
  run "$BASE" -f "$WORK/40-rows.sql" &&
  run "$BASE" --single-transaction -f docs/pending-migrations/s4/S4-revoke-public-execute.sql &&
  run "$BASE" --single-transaction -f docs/pending-migrations/account-deletion.sql &&
  run "$BASE" -f docs/launch/o1/V-S4-closed.sql || { echo "FAIL base (see the last lines below)"; tail -5 "$WORK/build.log"; exit 1; }
psql "$ADMIN" -X -q -c "create database prod template base" >/dev/null || { echo "FAIL copy of the base"; exit 1; }
pass "base: production's schema copy, S4 and Mission U part D"

# ---- 001 to 008 through the session parts -----------------------------------------------------------------------------------
export KPQ_REHEARSAL=1 KPQ_LOG_DIR="$WORK/logs" PROD_DB_URL="$DB"
for p in B1 B2 B3 D; do
  if bash docs/launch/o1/session.sh "$p" >"$WORK/out-$p.txt" 2>&1; then pass "session $p (001 to 008)"; else fail "session $p"; tail -8 "$WORK/out-$p.txt" | sed 's/^/    /'; fi
done
[ "$fails" = 0 ] || exit 1

# ---- seed: 4 users, 2 groups, alerts ----------------------------------------------------------------------------------------
U1=00000000-0000-4000-8000-0000000000a1  # subscriber 1 of group A
U2=00000000-0000-4000-8000-0000000000a2  # subscriber 2 of group A, will turn "following" off later
U3=00000000-0000-4000-8000-0000000000a3  # the Team account that creates the quizzes, also subscribed to group A
U4=00000000-0000-4000-8000-0000000000a4  # subscriber of group B
U5=00000000-0000-4000-8000-0000000000a5  # joins group A later
psql "$DB" -X -q -v ON_ERROR_STOP=1 >>"$WORK/build.log" 2>&1 <<SQL || { echo "FAIL seed"; tail -5 "$WORK/build.log"; exit 1; }
insert into auth.users (id, email) values ('$U1', 'u1@example.test'), ('$U2', 'u2@example.test'), ('$U3', 'u3@example.test'), ('$U4', 'u4@example.test'), ('$U5', 'u5@example.test');
insert into public.profiles (id, username) values ('$U1', 'sub_one'), ('$U2', 'sub_two'), ('$U3', 'team_mina'), ('$U4', 'sub_four'), ('$U5', 'sub_five');
insert into public.groups (name, slug, fandom_name, display_color, text_color) values ('Alpha', 'alpha', 'a', '#ffffff', '#000000'), ('Beta', 'beta', 'b', '#ffffff', '#000000');
insert into public.group_quiz_alerts (user_id, group_id) select u, g.id from (values ('$U1'::uuid), ('$U2'::uuid), ('$U3'::uuid)) v(u), public.groups g where g.slug = 'alpha';
insert into public.group_quiz_alerts (user_id, group_id) select '$U4'::uuid, g.id from public.groups g where g.slug = 'beta';
SQL
pass "seed: 5 users, 2 groups, 4 alerts"

# publish <slug> <group slug>: a quiz through create_quiz_bypass, the call the create route and the editorial publisher make.
publish() {
  q "select public.create_quiz_bypass(jsonb_build_object('creator_id', '$U3', 'group_id', (select id from public.groups where slug = '$2'), 'title', 'Quiz $1 title', 'slug', '$1',
       'quiz_type', 'multiple_choice', 'difficulty', 'easy', 'language', 'en', 'question_count', 3,
       'questions', jsonb_build_array(jsonb_build_object('question', 'q1', 'options', jsonb_build_array('a','b','c','d'), 'correct', 0), jsonb_build_object('question', 'q2', 'options', jsonb_build_array('a','b','c','d'), 'correct', 1), jsonb_build_object('question', 'q3', 'options', jsonb_build_array('a','b','c','d'), 'correct', 2)),
       'settings', jsonb_build_object('timer', true, 'timer_seconds', 15, 'shuffle', false, 'show_answers', true)))" >/dev/null
}
notified() { q "select count(*) from public.creator_notifications n join public.quizzes z on z.id = n.quiz_id where z.slug = '$1' and n.type = 'followed_new_quiz'"; }
who() { q "select coalesce(string_agg(p.username, ',' order by p.username), '') from public.creator_notifications n join public.quizzes z on z.id = n.quiz_id join public.profiles p on p.id = n.user_id where z.slug = '$1' and n.type = 'followed_new_quiz'"; }

# ---- 1. with 008 only: one-shot ---------------------------------------------------------------------------------------------
BODY008="$(q "select md5(prosrc) from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure")"
publish quiz-one alpha; publish quiz-two alpha
check "008 alone: the first quiz of group Alpha notifies its subscribers (not the creator)" "sub_one,sub_two" "select '$(who quiz-one)'"
check "008 alone: the second quiz notifies nobody (one-shot)" "0" "select $(notified quiz-two)"
check "008 alone: the subscribers are stamped, the Beta subscriber is not" "3 0" "select (select count(*) from public.group_quiz_alerts a join public.groups g on g.id = a.group_id where g.slug = 'alpha' and a.notified_at is not null) || ' ' || (select count(*) from public.group_quiz_alerts a join public.groups g on g.id = a.group_id where g.slug = 'beta' and a.notified_at is not null)"

# ---- 2. 025 twice -----------------------------------------------------------------------------------------------------------
fingerprint() {
  pg_dump "$DB" --schema-only --no-owner 2>>"$WORK/build.log" | grep -vE '^\\(un)?restrict ' >"$1.schema"
  psql "$DB" -X -q -At -F ' ' -v ON_ERROR_STOP=1 >"$1.rows" 2>>"$WORK/build.log" <<'SQL'
select format('select %L, count(*), md5(coalesce(string_agg(t::text, %L order by t::text), %L)) from %I.%I t', n.nspname || '.' || c.relname, chr(10), '', n.nspname, c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p') and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
order by n.nspname, c.relname
\gexec
SQL
}
if psql "$DB" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$M/025-quiz-alerts-every-publish.sql" >>"$WORK/build.log" 2>&1; then pass "025 applied"; else fail "025 applied"; tail -5 "$WORK/build.log"; fi
fingerprint "$WORK/fp1"
if psql "$DB" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$M/025-quiz-alerts-every-publish.sql" >>"$WORK/build.log" 2>&1; then pass "025 applied a second time"; else fail "025 second run"; fi
fingerprint "$WORK/fp2"
if cmp -s "$WORK/fp1.schema" "$WORK/fp2.schema" && cmp -s "$WORK/fp1.rows" "$WORK/fp2.rows" && [ -s "$WORK/fp2.rows" ]; then pass "the second run changed nothing (schema, grants and every table's rows)"; else fail "the second run changed the database"; diff "$WORK/fp1.schema" "$WORK/fp2.schema" | head; fi
check "025: the function no longer holds the notified_at guard, is SECURITY DEFINER with search_path public" "true true" "select (prosrc !~ 'notified_at is null') || ' ' || (prosecdef and proconfig @> array['search_path=public']) from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure"
check "025: the browser roles hold no EXECUTE on the function" "false false" "select has_function_privilege('anon', 'public.notify_group_quiz_alerts()', 'EXECUTE') || ' ' || has_function_privilege('authenticated', 'public.notify_group_quiz_alerts()', 'EXECUTE')"
check "025: the index on group_id is there" "1" "select count(*) from pg_indexes where schemaname = 'public' and indexname = 'group_quiz_alerts_group_idx'"

# ---- 3. with 025: every publication ------------------------------------------------------------------------------------------
STAMP1="$(q "select max(notified_at) from public.group_quiz_alerts a join public.groups g on g.id = a.group_id where g.slug = 'alpha'")"
sleep 1
publish quiz-three alpha
check "025: a quiz of Alpha notifies every subscriber again, the creator excluded" "sub_one,sub_two" "select '$(who quiz-three)'"
check "025: notified_at is the time of the last notification (moved forward for the notified, not for the creator)" "2 1" "select (select count(*) from public.group_quiz_alerts a join public.groups g on g.id = a.group_id where g.slug = 'alpha' and a.user_id <> '$U3' and a.notified_at > '$STAMP1') || ' ' || (select count(*) from public.group_quiz_alerts a join public.groups g on g.id = a.group_id where g.slug = 'alpha' and a.user_id = '$U3' and a.notified_at <= '$STAMP1')"
publish quiz-beta beta
check "025: a quiz of Beta notifies the Beta subscriber only" "sub_four" "select '$(who quiz-beta)'"
check "025: the Alpha subscribers have no notification for the Beta quiz" "0" "select count(*) from public.creator_notifications n join public.quizzes z on z.id = n.quiz_id where z.slug = 'quiz-beta' and n.user_id in ('$U1', '$U2')"
q "insert into public.group_quiz_alerts (user_id, group_id) select '$U5', id from public.groups where slug = 'alpha'" >/dev/null
publish quiz-four alpha
check "025: a subscriber who joined later is notified by the next quiz" "sub_five,sub_one,sub_two" "select '$(who quiz-four)'"
# a quiz flagged then published again: the rows of the first publication stay, nothing is duplicated, the subscribers that joined since get theirs
q "insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000a6', 'u6@example.test')" >/dev/null
q "insert into public.profiles (id, username) values ('00000000-0000-4000-8000-0000000000a6', 'sub_six')" >/dev/null
q "insert into public.group_quiz_alerts (user_id, group_id) select '00000000-0000-4000-8000-0000000000a6', id from public.groups where slug = 'alpha'" >/dev/null
q "update public.quizzes set status = 'flagged' where slug = 'quiz-four'" >/dev/null
q "update public.quizzes set status = 'published' where slug = 'quiz-four'" >/dev/null
check "025: published again after a flag, no duplicate and the late subscriber is told" "sub_five,sub_one,sub_six,sub_two" "select '$(who quiz-four)'"
check "025: no subscriber has two notifications for one quiz" "0" "select count(*) from (select user_id, quiz_id from public.creator_notifications where type = 'followed_new_quiz' group by 1, 2 having count(*) > 1) d"
# preferences: a subscriber who turned "following" off gets nothing, the others still do
q "insert into public.notification_prefs (user_id, categories) values ('$U1', '{\"following\": false}'::jsonb) on conflict (user_id) do update set categories = excluded.categories" >/dev/null
publish quiz-five alpha
check "025: following off for sub_one, the others are notified" "sub_five,sub_six,sub_two" "select '$(who quiz-five)'"
# a draft published later by an update notifies too
q "insert into public.quizzes (creator_id, group_id, title, slug, quiz_type, questions, settings, difficulty, status, question_count) select '$U3', id, 'Quiz six title', 'quiz-six', 'multiple_choice', '[{},{},{}]'::jsonb, '{}'::jsonb, 'easy', 'draft', 3 from public.groups where slug = 'alpha'" >/dev/null
check "025: a draft notifies nobody" "0" "select $(notified quiz-six)"
q "update public.quizzes set status = 'published' where slug = 'quiz-six'" >/dev/null
check "025: the draft published by an update notifies the subscribers" "sub_five,sub_six,sub_two" "select '$(who quiz-six)'"
# never block a publish: a notification insert that fails is swallowed
q "alter table public.creator_notifications add constraint e1b_fail check (false) not valid" >/dev/null
publish quiz-seven alpha
check "025: a failing notification insert never blocks the publish (the quiz exists, no notification)" "1 0" "select (select count(*) from public.quizzes where slug = 'quiz-seven' and status = 'published') || ' ' || $(notified quiz-seven)"
q "alter table public.creator_notifications drop constraint e1b_fail" >/dev/null
# a group nobody follows
q "insert into public.groups (name, slug, fandom_name, display_color, text_color) values ('Gamma', 'gamma', 'g', '#ffffff', '#000000')" >/dev/null
publish quiz-gamma gamma
check "025: a group with no subscriber inserts nothing" "0" "select $(notified quiz-gamma)"

# ---- 4. rollback -------------------------------------------------------------------------------------------------------------
if psql "$DB" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$M/025-quiz-alerts-every-publish.rollback.sql" >>"$WORK/build.log" 2>&1; then pass "rollback applied"; else fail "rollback applied"; tail -5 "$WORK/build.log"; fi
check "rollback: 008's body is back byte for byte (same md5 of prosrc)" "$BODY008" "select md5(prosrc) from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure"
check "rollback: the index is gone" "" "select to_regclass('public.group_quiz_alerts_group_idx')"
publish quiz-eight alpha
check "rollback: the alert is one-shot again (every Alpha subscriber is stamped, nobody is notified)" "0" "select $(notified quiz-eight)"
if psql "$DB" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$M/025-quiz-alerts-every-publish.rollback.sql" >>"$WORK/build.log" 2>&1; then pass "rollback applied a second time"; else fail "rollback second run"; fi
if psql "$DB" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$M/025-quiz-alerts-every-publish.sql" >>"$WORK/build.log" 2>&1; then pass "025 applied again after the rollback"; else fail "025 after the rollback"; fi
publish quiz-nine alpha
check "025 again: every publication notifies (Alpha, minus the creator and the one who turned following off)" "sub_five,sub_six,sub_two" "select '$(who quiz-nine)'"

echo
if [ "$fails" = 0 ]; then echo "alerts-rehearsal: every step passed"; else echo "alerts-rehearsal: $fails step(s) FAILED"; fi
exit $((fails > 0))
