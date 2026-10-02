#!/bin/sh
# G6: apply the pending SQL file on a throwaway LOCAL Postgres and check it.
# Never production: the cluster is created in a temp folder, listens on 127.0.0.1
# only, and is deleted at the end.
# usage: run.sh <empty temp folder for the cluster>
set -e
S="$(cd "$(dirname "$0")" && pwd)"
SQL="$S/../../../../../../pending-migrations/v12-g6-name-all.sql"
D="$1"
P=54366
[ -n "$D" ] || { echo "usage: run.sh <temp folder>"; exit 1; }
initdb -D "$D" -U postgres -A trust > /dev/null
pg_ctl -D "$D" -o "-p $P -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l "$D/log.txt" -w start > /dev/null
run() { psql -h 127.0.0.1 -p $P -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
trap 'pg_ctl -D "$D" -m fast stop > /dev/null; rm -rf "$D"' EXIT
run -tA -c "select 'server: ' || current_setting('server_version')"
run -c "create database g6test"
run -d g6test -f "$S/setup.sql"
echo "--- apply v12-g6-name-all.sql"
run -d g6test -f "$SQL"
echo "--- apply it again (idempotent)"
run -d g6test -f "$SQL"
echo "--- checks"
run -d g6test -f "$S/checks.sql"
echo "--- undo, as written in the file header"
run -d g6test -c "drop function if exists public.name_all_round_stats(integer)" -c "drop index if exists public.idx_namr_v12_group_round" -c "alter table public.name_all_member_results drop column if exists found_order, drop column if exists round_seconds"
run -d g6test -tA -c "select 'U01 rows after undo = ' || count(*) || ' (expected 24)' from public.name_all_member_results"
run -d g6test -tA -c "select 'U02 columns after undo = ' || count(*) || ' (expected 6)' from information_schema.columns where table_schema = 'public' and table_name = 'name_all_member_results'"
