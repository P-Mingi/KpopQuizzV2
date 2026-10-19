#!/bin/bash
# Lot (c) part 1, lane B3, check 4: pg_dump --schema-only of the public and passport schemas of o1-scratch to $1
# (a file under the worktree, never committed). The database URL is read by env.sh and never printed.
set -uo pipefail
out="${1:?usage: catalog-dump.sh <out.sql>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../../../.." && pwd)"
S=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1
PGDUMP=/opt/homebrew/opt/postgresql@18/bin/pg_dump
schemas=(-n public)
# the passport schema exists only once 006 is applied
exists="$("$S/env.sh" scratch -- bash -c '/opt/homebrew/opt/postgresql@18/bin/psql "$O1_DB_URL" -X -At -c "select count(*) from pg_namespace where nspname = '"'"'passport'"'"'"')"
[ "$exists" = "1" ] && schemas+=(-n passport)
"$S/env.sh" scratch -- bash -c '"$0" "$O1_DB_URL" --schema-only --no-comments "${@:1}"' "$PGDUMP" "${schemas[@]}" 2>&1 | grep -v '^--' | grep -v '^$' | grep -v '^SET ' | grep -v 'set_config' | grep -v '^.restrict ' | grep -v '^.unrestrict ' > "$out"
echo "catalog-dump: $(wc -l < "$out") lines, schemas: ${schemas[*]} -> $out"
