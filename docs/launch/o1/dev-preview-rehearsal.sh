#!/usr/bin/env bash
# dev-preview-rehearsal.sh (run O1, lot DEV-PREVIEW): proves, on a throwaway local Postgres 18 cluster, the sequence that
# scripts/o1/migrate-dev.sh will apply to o1-dev for the preview of the network with the four daily games on. It never connects to
# Supabase, never reads a secret, writes nothing outside its work folder, and stops its cluster at the end. For the integrator.
#
#     TMPDIR=$HOME/kpq-o1/tmp-prev bash docs/launch/o1/dev-preview-rehearsal.sh --prod-copy <path to KPQ prod-public.sql>
#
# (A TMPDIR whose path holds a UUID gives false FAILs; use the folder above.)
#
# What it builds: production's schema copy (schema only) with the platform part and the rows part of docs/o1/contracts/schema.base.sql,
# S4 and Mission U part D, then the state o1-dev is in: rows 1 to 20 of docs/o1/contracts/manifest.md (001 to 016 and L01) and the four
# differences the catalogue of o1-dev showed against today's files (D01's header): the first versions of 017 and 018 (from git history),
# entity_sources_source_check without 'fandom', the two sites rows on the old domains.
# What it runs: every manifest row after row 20, in the manifest order, up to L14 (the rows after it are not applied on o1-dev: manifest.md
# section 1), the mode of each file read from its header as migrate-dev.sh does. Then it checks what the preview needs, runs the
# whole sequence a second time (except the files that refuse once a game is on: 020, and the files after it), and proves D01's refusals.
# Stand-ins: the schema copy has no idol row, so 60 made-up adult idols stand in for the idols of o1-dev just before L14 (the real pool is
# not proven here: on o1-dev's 118 idols it is 114). Prints PASS or FAIL per step; exit 0 when every step passed.

set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT" || exit 2
COPY=""
[ "${1:-}" = "--prod-copy" ] && COPY="${2:-}"
[ -f "$COPY" ] || { echo "usage: bash docs/launch/o1/dev-preview-rehearsal.sh --prod-copy <prod-public.sql>"; exit 2; }

PG_BIN="${O1_PG_BIN:-/opt/homebrew/opt/postgresql@18/bin}"
export PATH="$PG_BIN:$PATH" LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
WORK="$(mktemp -d "${TMPDIR:-/tmp}/kpq-dev-preview.XXXXXX")"
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
DEV="postgresql://postgres@127.0.0.1:$PORT/dev"
run() { psql "$1" -X -q -v ON_ERROR_STOP=1 "${@:2}" >>"$WORK/build.log" 2>&1; }
q() { psql "$DEV" -X -q -At -v ON_ERROR_STOP=1 -c "$1" 2>>"$WORK/build.log"; }

# ---- the base (as session-rehearsal.sh) -----------------------------------------------------------------------------------------
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
run "$ADMIN" -c "create database base" &&
  run "$BASE" -f "$WORK/10-platform.sql" && run "$BASE" -f "$WORK/15-platform-extra.sql" && run "$BASE" -f "$COPY" &&
  run "$BASE" -f "$WORK/40-rows.sql" &&
  run "$BASE" --single-transaction -f docs/pending-migrations/s4/S4-revoke-public-execute.sql &&
  run "$BASE" --single-transaction -f docs/pending-migrations/account-deletion.sql || { echo "FAIL base (last lines of the build log)"; tail -5 "$WORK/build.log"; exit 1; }
pass "base: production's schema copy, S4 and Mission U part D"
run "$ADMIN" -c "create database dev template base" || { echo "FAIL copy of the base"; exit 1; }

# ---- the manifest, as migrate-dev.sh reads it -------------------------------------------------------------------------------------
FILES=()
while IFS= read -r f; do FILES+=("$f"); done < <(grep -oE 'docs/pending-migrations/multisite/[A-Za-z0-9_./-]+\.sql' docs/o1/contracts/manifest.md | awk '!seen[$0]++' | grep -v '\.rollback\.sql$')
[ "${#FILES[@]}" -ge 40 ] || { echo "FAIL manifest: ${#FILES[@]} files"; exit 1; }
apply() {   # apply <file>: one transaction, or none when the header says so (migrate-dev.sh)
  local mode=(--single-transaction); grep -qiE '^-- *o1-transaction: *none' "$1" && mode=()
  psql "$DEV" -X -q -v ON_ERROR_STOP=1 ${mode[@]+"${mode[@]}"} -f "$1" >>"$WORK/seq.log" 2>&1
}
for i in $(seq 0 19); do apply "${FILES[$i]}" || { fail "o1-dev state: ${FILES[$i]}"; tail -3 "$WORK/seq.log"; exit 1; }; done
pass "o1-dev state: rows 1 to 20 of the manifest (001 to 016 and L01)"

# ---- the four differences o1-dev showed (D01 header) -----------------------------------------------------------------------------
M=docs/pending-migrations/multisite
OLD17=$(git show c886805:$M/017-deletion-kpop.sql 2>/dev/null) && OLD18=$(git show e5cbd97:$M/018-entity-images.sql 2>/dev/null) || { echo "FAIL the history lacks c886805 or e5cbd97 (git fetch)"; exit 1; }
printf '%s\n' "$OLD18" | run "$DEV" --single-transaction -f - && printf '%s\n' "$OLD17" | run "$DEV" --single-transaction -f - && run "$DEV" -c "
alter table public.entity_sources drop constraint entity_sources_source_check;
alter table public.entity_sources add constraint entity_sources_source_check check (source in ('wikidata', 'musicbrainz', 'wikipedia', 'official'));
update public.sites set domain = 'old-' || domain, brand = 'Old' || brand where id in ('anime', 'hub');" || { fail "o1-dev drift"; tail -3 "$WORK/build.log"; exit 1; }
[ "$(q "select count(*) from information_schema.columns where table_name = 'entity_images' and column_name = 'license_url'")" = 0 ] && pass "o1-dev drift: first entity_images, old 017, no 'fandom', old sites rows" || fail "o1-dev drift not in place"

# ---- the sequence ------------------------------------------------------------------------------------------------------------------
# idols: the schema copy has none; 60 made-up adults stand in for o1-dev's 118 (needs 021a's columns, so right before L14)
standin_groups() {
  run "$DEV" -c "
insert into public.groups (name, slug, fandom_name, display_color, text_color, record_label, generation, site_id)
select 'Stand-in ' || i, 'stand-in-' || i, 'fans ' || i, '#000000', '#FFFFFF', 'Label ' || i, '4th', 'kpop' from generate_series(1, 6) as i on conflict (slug) do nothing;"
}
standin() {   # ids from 100000, so that no check of the K1 files (they name real idol ids) reads a stand-in
  run "$DEV" -c "
select setval(pg_get_serial_sequence('public.idols', 'id'), greatest(100000, (select coalesce(max(id), 1) from public.idols)));
insert into public.groups (name, slug, fandom_name, display_color, text_color, record_label, generation, site_id)
select 'Stand-in ' || i, 'stand-in-' || i, 'fans ' || i, '#000000', '#FFFFFF', 'Label ' || i, '4th', 'kpop' from generate_series(1, 6) as i on conflict (slug) do nothing;
insert into public.idols (group_id, name, name_romanized, birth_date, nationality, positions, gender, debut_year, active, needs_review, ord, origin, created_at, updated_at)
select (select id from public.groups where slug = 'stand-in-' || (1 + i % 6)), 'Stand-in idol ' || i, 'Stand-in idol ' || i, make_date(1995 + i % 8, 3, 1), 'South Korea', '{}'::text[], case when i % 2 = 0 then 'female' else 'male' end, 2015 + i % 8, true, false, i, 'wikidata', now(), now()
from generate_series(1, 60) as i where not exists (select 1 from public.idols where name = 'Stand-in idol ' || i);"
}
L14=-1; for i in "${!FILES[@]}"; do case "${FILES[$i]}" in */L14-O1-dle-on.sql) L14=$i ;; esac; done
[ "$L14" -gt 20 ] || { echo "FAIL L14 is not in the manifest after row 20"; exit 1; }
standin_groups
n_ok=0
for i in $(seq 20 "$L14"); do
  [ "$i" = "$L14" ] && standin
  if apply "${FILES[$i]}"; then n_ok=$((n_ok + 1)); else fail "row $((i + 1)) ${FILES[$i]}"; tail -4 "$WORK/seq.log" | cut -c1-240; break; fi
done
[ "$n_ok" = $((L14 - 19)) ] && pass "sequence: rows 21 to $((L14 + 1)) applied in the manifest order ($n_ok files, D01 first, L14 last)" || fail "sequence stopped after $n_ok files"

# ---- what the preview needs --------------------------------------------------------------------------------------------------------
[ "$(q "select count(*) from public.sites where (id, domain) in (('anime', 'bunnyverse.org/anime'), ('hub', 'bunnyverse.org'))")" = 2 ] && pass "sites rows on the registry values" || fail "sites rows"
[ "$(q "select pg_get_constraintdef(oid) like '%fandom%' from pg_constraint where conname = 'entity_sources_source_check'")" = t ] && pass "entity_sources accepts 'fandom'" || fail "fandom source"
[ "$(q "select count(*) from information_schema.columns where table_name = 'entity_images' and column_name in ('license_url', 'commons_file', 'needs_credit')")" = 3 ] && pass "entity_images is the current table (018)" || fail "entity_images shape"
[ "$(q "select count(*) from public.dle_games where active and (select count(*) from public.dle_schedule s where s.game_id = dle_games.id) = 365")" = 4 ] && pass "four games on, 365 days drawn each" || fail "games on: $(q "select string_agg(id || ':' || active, ',') from public.dle_games")"
[ "$(q "select count(*) from public.dle_games g where (select count(distinct entity_id) from public.dle_schedule s where s.game_id = g.id) >= g.min_pool")" = 4 ] && pass "each game draws at least its minimum of different targets" || fail "targets"
no="$(psql "$DEV" -X -q -At -c "set role anon; select (public.dle_day('kpopdle-idol') ->> 'game_no') || ',' || (public.dle_day('otakudle') ->> 'game_no') || ',' || (public.dle_day('otakudle-one-piece') ->> 'game_no') || ',' || (public.dle_day('otakudle-dragon-ball') ->> 'game_no')" 2>>"$WORK/build.log" | tail -1)"
[ "$no" = "1,1,1,1" ] && pass "dle_day answers for the four games as the browser calls it (anon)" || fail "dle_day: $no"
for c in V-017 V-018 V-023 V-024 V-K1a V-K1b V-K1c V-L13 V-L14 V-L15 V-DLE-KEPT; do
  out="$(psql "$DEV" -X -q -At -F ' | ' -f docs/launch/o1/checks/$c.sql 2>&1)"
  if printf '%s\n' "$out" | grep -qE '(^| )KO( |$)|ERROR'; then fail "check $c"; printf '%s\n' "$out" | grep -E 'KO|ERROR' | head -3; else pass "check $c"; fi
done

# V-022 is left out: it counts the 17 record labels production holds; here the agencies are the 6 labels of the stand-in groups.
[ "$(q "select count(*) from public.agencies")" = 6 ] && pass "022 filled one agency per record label of the groups ($(q "select count(*) from public.agencies"))" || fail "agencies"

# ---- the second run: nothing changes ------------------------------------------------------------------------------------------------
fingerprint() {
  pg_dump "$DEV" --schema-only --no-owner 2>/dev/null | grep -vE '^\\(un)?restrict ' >"$1.schema"
  psql "$DEV" -X -q -At -F ' ' -v ON_ERROR_STOP=1 >"$1.rows" 2>>"$WORK/build.log" <<'SQL'
select format('select %L, count(*), md5(coalesce(string_agg(t::text, %L order by t::text), %L)) from %I.%I t', n.nspname || '.' || c.relname, chr(10), '', n.nspname, c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p') and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
order by n.nspname, c.relname
\gexec
SQL
}
fingerprint "$WORK/fp-before"
bad=0
for i in $(seq 20 "$L14"); do
  case "${FILES[$i]}" in */020-dle-kpop-idol.sql) continue ;; esac   # refuses once kpopdle-idol is on (V-020): migrate-dev.sh never runs an applied file again
  apply "${FILES[$i]}" || { bad=$((bad + 1)); echo "    second run refused: ${FILES[$i]}"; }
done
fingerprint "$WORK/fp-after"
if [ "$bad" = 0 ] && cmp -s "$WORK/fp-before.schema" "$WORK/fp-after.schema" && cmp -s "$WORK/fp-before.rows" "$WORK/fp-after.rows" && [ -s "$WORK/fp-after.rows" ]; then
  pass "second run of the sequence changed nothing ($(wc -l <"$WORK/fp-after.rows" | tr -d ' ') tables, same rows, same schema and grants)"
else
  fail "the second run changed the database or a file refused ($bad)"
  diff "$WORK/fp-before.rows" "$WORK/fp-after.rows" | grep '^[<>]' | cut -d' ' -f1-3 | head -10 | sed 's/^/    rows /'
fi

# ---- D01 refuses a database that is not the dev branch ------------------------------------------------------------------------------
D01=docs/pending-migrations/multisite/dev/D01-dev-catchup.sql
run "$DEV" -c "set session_replication_role = replica; insert into public.profiles (id, username) select gen_random_uuid(), 'user_' || lpad(g::text, 5, '0') from generate_series(1, 250) g"
out="$(psql "$DEV" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$D01" 2>&1)"
printf '%s' "$out" | grep -q 'refused, this database holds more than 200 profiles' && pass "D01 refuses more than 200 profiles" || fail "D01 did not refuse 250 profiles"
run "$DEV" -c "set session_replication_role = replica; delete from public.profiles where username like 'user\_%'; update public.sites set status = 'live' where id = 'hub'"
out="$(psql "$DEV" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$D01" 2>&1)"
printf '%s' "$out" | grep -q 'refused, the anime or hub site is live' && pass "D01 refuses a live site" || fail "D01 did not refuse a live hub"
for r in "$D01" docs/pending-migrations/multisite/dev/D01-dev-catchup.rollback.sql; do
  grep -qE '^-- DEV ONLY' "$r" || grep -qE 'DEV ONLY. NEVER FOR PRODUCTION' "$r" && pass "$(basename "$r") is marked DEV ONLY, NEVER FOR PRODUCTION" || fail "$r is not marked"
done

echo ""
if [ "$fails" = 0 ]; then echo "dev preview rehearsal: every step passed"; exit 0; fi
echo "dev preview rehearsal: $fails step(s) failed"; exit 1
