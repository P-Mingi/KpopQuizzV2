#!/usr/bin/env bash
# prove-bank.sh (run O1, lot DRAW, CR-027): builds the banks of docs/pending-migrations/multisite/019-dle-core.sql on a throwaway local Postgres 18
# cluster made from production's schema copy, for every pool size, several seeds and a rebuild with kept days. Never connects to Supabase.
#
#     TMPDIR=$HOME/kpq-o1/tmp-draw bash docs/proofs/dle-draw-blocks/prove-bank.sh --prod-copy <path to KPQ prod-public.sql>
#
# The base is the one of docs/launch/o1/session-rehearsal.sh (platform part of schema.base.sql, the auth and storage columns Supabase has, the schema
# copy, the rows part), then 001, 018, 019 (run twice: the second run must change nothing) and 020. Prints the proof (prove-bank.sql) on stdout.
# The cluster is stopped and its folder removed at the end, pass or fail.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT" || exit 2
COPY=""
[ "${1:-}" = "--prod-copy" ] && COPY="${2:-}"
[ -f "$COPY" ] || { echo "usage: bash docs/proofs/dle-draw-blocks/prove-bank.sh --prod-copy <prod-public.sql>"; exit 2; }

PG_BIN="${O1_PG_BIN:-/opt/homebrew/opt/postgresql@18/bin}"
export PATH="$PG_BIN:$PATH" LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
WORK="$(mktemp -d "${TMPDIR:-/tmp}/kpq-draw-proof.XXXXXX")"
PORT="$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
cleanup() { pg_ctl -D "$WORK/data" -m fast -w stop >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT

initdb -D "$WORK/data" -U postgres -A trust -E UTF8 >/dev/null 2>&1 || { echo "FAIL initdb"; exit 1; }
pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off" -l "$WORK/pg.log" -w start >/dev/null || { echo "FAIL cluster start"; exit 1; }
ADMIN="postgresql://postgres@127.0.0.1:$PORT/postgres"
DB="postgresql://postgres@127.0.0.1:$PORT/draw"
run() { psql "$1" -X -q -v ON_ERROR_STOP=1 "${@:2}" >>"$WORK/build.log" 2>&1; }

B=docs/o1/contracts/schema.base.sql
P=$(grep -n '^-- Public tables' "$B" | cut -d: -f1)
R=$(grep -n '^-- Rows' "$B" | cut -d: -f1)
head -n $((P - 1)) "$B" >"$WORK/10-platform.sql"
tail -n +"$R" "$B" >"$WORK/40-rows.sql"
cat >"$WORK/15-platform-extra.sql" <<'EOF'
alter table auth.users add column if not exists instance_id uuid, add column if not exists aud text, add column if not exists role text,
  add column if not exists encrypted_password text, add column if not exists confirmation_token text, add column if not exists recovery_token text,
  add column if not exists email_change_token_new text, add column if not exists email_change text, add column if not exists raw_app_meta_data jsonb,
  add column if not exists raw_user_meta_data jsonb, add column if not exists banned_until timestamptz, add column if not exists updated_at timestamptz;
alter table storage.buckets add column if not exists file_size_limit bigint, add column if not exists allowed_mime_types text[],
  add column if not exists created_at timestamptz default now(), add column if not exists updated_at timestamptz default now();
alter table storage.objects enable row level security;
create extension if not exists pgcrypto with schema extensions;
EOF
M=docs/pending-migrations/multisite
run "$ADMIN" -c "create database draw" &&
  run "$DB" -f "$WORK/10-platform.sql" && run "$DB" -f "$WORK/15-platform-extra.sql" && run "$DB" -f "$COPY" && run "$DB" -f "$WORK/40-rows.sql" &&
  run "$DB" --single-transaction -f "$M/001-sites.sql" && run "$DB" --single-transaction -f "$M/018-entity-images.sql" &&
  run "$DB" --single-transaction -f "$M/019-dle-core.sql" || { echo "FAIL base (last lines of the log)"; tail -5 "$WORK/build.log"; exit 1; }
# The second run of 019 changes nothing in the schema (the functions are replaced by the same text).
pg_dump "$DB" --schema-only --no-owner 2>/dev/null | grep -vE '^\\(un)?restrict ' >"$WORK/schema-1.sql"
run "$DB" --single-transaction -f "$M/019-dle-core.sql" || { echo "FAIL second run of 019"; tail -5 "$WORK/build.log"; exit 1; }
pg_dump "$DB" --schema-only --no-owner 2>/dev/null | grep -vE '^\\(un)?restrict ' >"$WORK/schema-2.sql"
cmp -s "$WORK/schema-1.sql" "$WORK/schema-2.sql" && echo "PASS 019 twice: the second run changed nothing (schema and grants)" || { echo "FAIL 019 twice: the schema changed"; diff "$WORK/schema-1.sql" "$WORK/schema-2.sql" | head; }
run "$DB" --single-transaction -f "$M/020-dle-kpop-idol.sql" || { echo "FAIL 020"; tail -5 "$WORK/build.log"; exit 1; }
echo "PASS base: production's schema copy, 001, 018, 019, 020 on $(postgres --version)"
psql "$DB" -X -v ON_ERROR_STOP=1 -f docs/proofs/dle-draw-blocks/prove-bank.sql
