#!/usr/bin/env bash
# rehearse.sh (run O1, lot DEV-PREVIEW, D03): proves docs/pending-migrations/multisite/dev/D03-dev-reapply-019-023.sql on a throwaway local Postgres 18 cluster.
# It never connects to Supabase, never reads a secret, writes nothing outside its work folder, and stops its cluster at the end (pass or fail).
#
#     TMPDIR=$HOME/kpq-o1/tmp-d03 bash docs/proofs/dev-reapply/rehearse.sh --prod-copy <path to KPQ prod-public.sql>
#
# (A TMPDIR whose path holds a UUID gives false FAILs; use the folder above.)
#
# State built: the one o1-dev is in after migrate-dev.sh of 2026-11-03: production's schema copy, rows 1 to 20 of the manifest, the four differences of
# D01's header, then the 19 files D01, 017 to 024 (021a, 021c, 021b), L04, L05, L06, L08, L10-PERS, L13, L15, L14, ALL AS THEY WERE at commit f967743
# (git archive into the work folder, the manifest of that commit gives the order). Their sha256 are the ones of docs/o1/migration-log.md.
# Stand-ins: the schema copy has no idol row, so 114 made-up adult idols (112 complete, 2 without a debut year) stand in for the 114 idols of o1-dev's pool
# (112 targets) just before L14; the anime data (L04, L05, L13, L15) is the real data of the files.
# Then D03 is run from the CURRENT tree with the flags of migrate-dev.sh (-X -q -v ON_ERROR_STOP=1 --single-transaction -f <path>), checked, run a second
# time, and its refusals are proved on copies of the database. Prints PASS or FAIL per step and the counts; exit 0 when every step passed.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT" || exit 2
COPY=""
[ "${1:-}" = "--prod-copy" ] && COPY="${2:-}"
[ -f "$COPY" ] || { echo "usage: bash docs/proofs/dev-reapply/rehearse.sh --prod-copy <prod-public.sql>"; exit 2; }
COPY="$(cd "$(dirname "$COPY")" && pwd)/$(basename "$COPY")"
OLD="${D03_OLD_COMMIT:-f967743}"
git cat-file -e "$OLD^{commit}" 2>/dev/null || { echo "FAIL the history lacks $OLD (git fetch)"; exit 2; }

PG_BIN="${O1_PG_BIN:-/opt/homebrew/opt/postgresql@18/bin}"
export PATH="$PG_BIN:$PATH" LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
WORK="$(mktemp -d "${TMPDIR:-/tmp}/kpq-d03.XXXXXX")"
PORT="$(python3 -c 'import socket; s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
fails=0
pass() { echo "PASS $*"; }
fail() { echo "FAIL $*"; fails=$((fails + 1)); }
cleanup() { pg_ctl -D "$WORK/data" -m fast -w stop >/dev/null 2>&1; rm -rf "$WORK"; }
trap cleanup EXIT

initdb -D "$WORK/data" -U postgres -A trust -E UTF8 >/dev/null 2>&1 || { echo "FAIL initdb"; exit 1; }
pg_ctl -D "$WORK/data" -o "-p $PORT -k '' -c listen_addresses=127.0.0.1 -c fsync=off -c synchronous_commit=off" -l "$WORK/pg.log" -w start >/dev/null || { echo "FAIL cluster start"; exit 1; }
ADMIN="postgresql://postgres@127.0.0.1:$PORT/postgres"
url() { echo "postgresql://postgres@127.0.0.1:$PORT/$1"; }
DEV="$(url dev)"
run() { psql "$1" -X -q -v ON_ERROR_STOP=1 "${@:2}" >>"$WORK/build.log" 2>&1; }
q() { psql "$DEV" -X -q -At -v ON_ERROR_STOP=1 -c "$1" 2>>"$WORK/build.log"; }
qd() { psql "$(url "$1")" -X -q -At -v ON_ERROR_STOP=1 -c "$2" 2>>"$WORK/build.log"; }

# ---- the tree of the old commit --------------------------------------------------------------------------------------------------
OLDT="$WORK/old"; mkdir -p "$OLDT"
git archive "$OLD" docs/pending-migrations docs/o1/contracts | tar -x -C "$OLDT" || { echo "FAIL git archive $OLD"; exit 1; }
M=docs/pending-migrations/multisite

# ---- the base (as dev-preview-rehearsal.sh) -------------------------------------------------------------------------------------------
B="$OLDT/docs/o1/contracts/schema.base.sql"
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
BASE="$(url base)"
run "$ADMIN" -c "create database base" &&
  run "$BASE" -f "$WORK/10-platform.sql" && run "$BASE" -f "$WORK/15-platform-extra.sql" && run "$BASE" -f "$COPY" &&
  run "$BASE" -f "$WORK/40-rows.sql" &&
  run "$BASE" --single-transaction -f "$OLDT/docs/pending-migrations/s4/S4-revoke-public-execute.sql" &&
  run "$BASE" --single-transaction -f "$OLDT/docs/pending-migrations/account-deletion.sql" || { echo "FAIL base (last lines of the build log)"; tail -5 "$WORK/build.log"; exit 1; }
pass "base: production's schema copy, S4 and Mission U part D"
run "$ADMIN" -c "create database dev template base" || { echo "FAIL copy of the base"; exit 1; }

# ---- the manifest of the old commit, as migrate-dev.sh read it -----------------------------------------------------------------------
FILES=()
while IFS= read -r f; do FILES+=("$f"); done < <(grep -oE 'docs/pending-migrations/multisite/[A-Za-z0-9_./-]+\.sql' "$OLDT/docs/o1/contracts/manifest.md" | awk '!seen[$0]++' | grep -v '\.rollback\.sql$')
[ "${#FILES[@]}" -ge 40 ] || { echo "FAIL manifest: ${#FILES[@]} files"; exit 1; }
apply() {   # apply <path in the old tree>: one transaction, or none when the header says so (migrate-dev.sh)
  local f="$OLDT/$1" mode=(--single-transaction); grep -qiE '^-- *o1-transaction: *none' "$f" && mode=()
  psql "$DEV" -X -q -v ON_ERROR_STOP=1 ${mode[@]+"${mode[@]}"} -f "$f" >>"$WORK/seq.log" 2>&1
}
for i in $(seq 0 19); do apply "${FILES[$i]}" || { fail "o1-dev state: ${FILES[$i]}"; tail -3 "$WORK/seq.log"; exit 1; }; done

# ---- the four differences o1-dev showed (D01's header) --------------------------------------------------------------------------------
OLD17=$(git show c886805:$M/017-deletion-kpop.sql 2>/dev/null) && OLD18=$(git show e5cbd97:$M/018-entity-images.sql 2>/dev/null) || { echo "FAIL the history lacks c886805 or e5cbd97 (git fetch)"; exit 1; }
printf '%s\n' "$OLD18" | run "$DEV" --single-transaction -f - && printf '%s\n' "$OLD17" | run "$DEV" --single-transaction -f - && run "$DEV" -c "
alter table public.entity_sources drop constraint entity_sources_source_check;
alter table public.entity_sources add constraint entity_sources_source_check check (source in ('wikidata', 'musicbrainz', 'wikipedia', 'official'));
update public.sites set domain = 'old-' || domain, brand = 'Old' || brand where id in ('anime', 'hub');" || { fail "o1-dev drift"; tail -3 "$WORK/build.log"; exit 1; }

standin_groups() {
  run "$DEV" -c "
insert into public.groups (name, slug, fandom_name, display_color, text_color, record_label, generation, site_id)
select 'Stand-in ' || i, 'stand-in-' || i, 'fans ' || i, '#000000', '#FFFFFF', 'Label ' || i, '4th', 'kpop' from generate_series(1, 6) as i on conflict (slug) do nothing;"
}
standin() {   # 114 idols from id 100000: 112 complete (targets), 2 without a debut year (in the pool, not targets): o1-dev's 114 and 112
  run "$DEV" -c "
select setval(pg_get_serial_sequence('public.idols', 'id'), greatest(100000, (select coalesce(max(id), 1) from public.idols)));
insert into public.idols (group_id, name, name_romanized, birth_date, nationality, positions, gender, debut_year, active, needs_review, ord, origin, created_at, updated_at)
select (select id from public.groups where slug = 'stand-in-' || (1 + i % 6)), 'Stand-in idol ' || i, 'Stand-in idol ' || i, make_date(1995 + i % 8, 3, 1), 'South Korea', '{}'::text[], case when i % 2 = 0 then 'female' else 'male' end, case when i > 112 then null else 2015 + i % 8 end, true, false, i, 'wikidata', now(), now()
from generate_series(1, 114) as i where not exists (select 1 from public.idols where name = 'Stand-in idol ' || i);"
}
L14=-1; for i in "${!FILES[@]}"; do case "${FILES[$i]}" in */L14-O1-dle-on.sql) L14=$i ;; esac; done
[ "$L14" -gt 20 ] || { echo "FAIL L14 is not in the old manifest after row 20"; exit 1; }
standin_groups
n_ok=0
for i in $(seq 20 "$L14"); do
  [ "$i" = "$L14" ] && standin
  if apply "${FILES[$i]}"; then n_ok=$((n_ok + 1)); else fail "row $((i + 1)) ${FILES[$i]}"; tail -4 "$WORK/seq.log" | cut -c1-240; exit 1; fi
done
[ "$n_ok" = 19 ] && pass "o1-dev state: rows 1 to 20, the drift, then the 19 files of $OLD (D01 first, L14 last)" || fail "state: $n_ok files of the 19"

# ---- the state before D03: what o1-dev showed (read-only, 2026-11-03): games on, 365 days, targets 112 / 113 / 73 / 48, no marker ----------
games_sql="select g.id || ' on=' || g.active || ' days=' || (select count(*) from public.dle_schedule s where s.game_id = g.id) || ' entities=' || (select count(*) from public.dle_entities e where e.game_id = g.id) || ' targets=' || (select count(*) from public.dle_entities e where e.game_id = g.id and e.can_be_target and e.in_pool) from public.dle_games g order by g.id"
echo "before D03:"; q "$games_sql" | sed 's/^/    /'
[ "$(q "$games_sql" | tr '\n' ';')" = "kpopdle-idol on=true days=365 entities=114 targets=112;otakudle on=true days=365 entities=750 targets=113;otakudle-dragon-ball on=true days=365 entities=70 targets=48;otakudle-one-piece on=true days=365 entities=100 targets=73;" ] \
  && pass "before D03 the counts are o1-dev's (114/112, 750/113, 70/48, 100/73, 365 days each)" || fail "before D03 the counts differ from o1-dev's"
[ "$(q "select (prosrc like '%bank-blocks-v1%')::text from pg_proc where oid = to_regprocedure('public.dle_build_bank(text, date, double precision)')")" = false ] && pass "before D03 dle_build_bank has no marker (the CR-019 engine)" || fail "marker before"
q "select string_agg(attname, ',' order by attnum) from pg_attribute where attrelid = 'public.dle_src_anime_character'::regclass and attnum > 0 and not attisdropped" | sed 's/^/    view columns before: /'
[ "$(q "select count(*) from public.dle_entities where attrs ? 'seen_at'")" -gt 0 ] && pass "before D03 the Otakudle snapshot holds seen_at ($(q "select count(*) from public.dle_entities where attrs ? 'seen_at'") rows)" || fail "no seen_at before"
[ "$(q "select count(*) from pg_depend d where d.refclassid = 'pg_class'::regclass and d.refobjid = 'public.dle_src_anime_character'::regclass and d.deptype <> 'i'")" = 0 ] && pass "nothing depends on dle_src_anime_character (pg_depend, deptype other than internal: 0)" || fail "a dependent of the view"

# the dle area of the catalogue, to compare with o1-dev read-only (functions by md5 of their definition, tables and views by columns)
catalogue() {
  psql "$DEV" -X -q -At -v ON_ERROR_STOP=1 -c "
select line from (
select 'f ' || p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'dle\_%'
union all
select 'p ' || p.oid::regprocedure::text || ' ' || md5(coalesce(p.proacl::text, '')) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'dle\_%'
union all
select 'r ' || c.relname || ' ' || c.relkind::text || ' ' || md5(coalesce((select string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod), ',' order by a.attnum) from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped), ''))
from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v') and (c.relname like 'dle\_%' or c.relname in ('character_facts', 'series_facts', 'character_game_facts', 'idol_other_groups', 'entity_images'))
union all
select 'a ' || c.relname || ' ' || md5(coalesce(c.relacl::text, '') || coalesce(c.reloptions::text, '')) from pg_class c
where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v') and (c.relname like 'dle\_%' or c.relname in ('character_facts', 'series_facts', 'character_game_facts', 'idol_other_groups', 'entity_images'))
union all
select 'v ' || c.relname || ' ' || md5(pg_get_viewdef(c.oid)) from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'v' and c.relname like 'dle\_src\_%'
) x(line) order by line collate \"C\"" 2>>"$WORK/build.log"
}
catalogue >"$WORK/cat-before.txt"
[ -s "$WORK/cat-before.txt" ] || { fail "the catalogue query returned nothing"; tail -3 "$WORK/build.log"; exit 1; }
[ -n "${D03_CAT_OUT:-}" ] && cp "$WORK/cat-before.txt" "$D03_CAT_OUT"   # optional: a file to compare with a read-only query on o1-dev
echo "    dle catalogue before D03: $(wc -l <"$WORK/cat-before.txt" | tr -d ' ') objects, md5 $(md5 -q "$WORK/cat-before.txt" 2>/dev/null || md5sum "$WORK/cat-before.txt" | cut -d' ' -f1)"
for c in V-023 V-L14; do
  psql "$DEV" -X -q -At -F ' | ' -f docs/launch/o1/checks/$c.sql 2>&1 | grep -E '(^| )KO( |$)' | sed "s/^/    before D03, $c: /"
done
pg_dump "$DEV" --schema-only --no-owner 2>/dev/null | grep -vE '^\\(un)?restrict ' >"$WORK/schema-before.sql"
fingerprint() {   # rows of the dle tables, the refresh time of the snapshot left out
  psql "$DEV" -X -q -At -F ' ' -v ON_ERROR_STOP=1 -c "
select 'dle_schedule', count(*), md5(coalesce(string_agg(t::text, '|' order by game_id, bank_day), '')) from public.dle_schedule t
union all select 'dle_games', count(*), md5(coalesce(string_agg(t::text, '|' order by id), '')) from public.dle_games t
union all select 'dle_attributes', count(*), md5(coalesce(string_agg(t::text, '|' order by game_id, key), '')) from public.dle_attributes t
union all select 'dle_entities', count(*), md5(coalesce(string_agg(row(t.game_id, t.entity_id, t.name, t.search, t.attrs, t.hints, t.thumb_path, t.balance_key, t.can_be_target, t.in_pool)::text, '|' order by t.game_id, t.entity_id), '')) from public.dle_entities t
union all select 'dle_daily_stats', count(*), '-' from public.dle_daily_stats union all select 'dle_plays', count(*), '-' from public.dle_plays" 2>>"$WORK/build.log"
}
fingerprint >"$WORK/fp-before.txt"

# a copy of the state, for the refusals below (a template copy needs no connection to it)
run "$ADMIN" -c "create database dev_before template dev" || { echo "FAIL copy dev_before"; exit 1; }

# ---- D03, from the current tree, as migrate-dev.sh runs a file -----------------------------------------------------------------------
D03="$M/dev/D03-dev-reapply-019-023.sql"
t0=$SECONDS
out="$(psql "$DEV" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$D03" 2>&1)"; rc=$?
echo "    D03 took $((SECONDS - t0)) s"
printf '%s\n' "$out" | sed 's/^/    D03 output: /' | cut -c1-200
[ "$rc" = 0 ] && pass "D03 ran in one transaction (relative path, psql --single-transaction)" || { fail "D03 failed rc=$rc"; exit 1; }
printf '%s' "$out" | grep -q 'D02: 4 bank(s) rebuilt, 0 already in blocks' && pass "D02 (through \\ir) rebuilt the 4 banks" || fail "D02 notice: not '4 bank(s) rebuilt, 0 already in blocks'"

# ---- what the preview needs --------------------------------------------------------------------------------------------------------------
echo "after D03:"
report="select g.id, g.active, g.epoch is not null as epoch,
  (select count(*) from public.dle_schedule s where s.game_id = g.id) as days,
  (select count(*) from public.dle_entities e where e.game_id = g.id and e.can_be_target and e.in_pool) as targets,
  (select max(c) from (select count(*) c from public.dle_schedule s where s.game_id = g.id group by s.entity_id) x) as max_app,
  (select min(c) from (select count(*) c from public.dle_schedule s where s.game_id = g.id group by s.entity_id) x) as min_app,
  (select count(*) from public.dle_entities e where e.game_id = g.id and e.can_be_target and e.in_pool and not exists (select 1 from public.dle_schedule s where s.game_id = g.id and s.entity_id = e.entity_id)) as never_drawn,
  public.dle_window(g.id) as gap_asked,
  (select min(least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day))) from public.dle_schedule a join public.dle_schedule b on b.game_id = a.game_id and b.entity_id = a.entity_id and a.bank_day < b.bank_day where a.game_id = g.id) as min_gap,
  (select count(*) = 0 from public.dle_schedule s left join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id where s.game_id = g.id and not coalesce(e.can_be_target and e.in_pool, false)) as all_in_pool,
  (select coalesce(bool_and(bl.c = bl.d and (bl.c = t.n or (bl.b + 1) * t.n > 365)), false)
    from (select (s.bank_day - 1) / greatest(1, least(365, (select count(*) from public.dle_entities e where e.game_id = g.id and e.can_be_target and e.in_pool))) as b, count(*) as c, count(distinct s.entity_id) as d
          from public.dle_schedule s where s.game_id = g.id group by 1) bl
    cross join (select greatest(1, least(365, count(*))) as n from public.dle_entities e where e.game_id = g.id and e.can_be_target and e.in_pool) t) as blocks_ok,
  (select pool_hash = public.dle_pool_hash(g.id) from public.dle_games where id = g.id) as bank_matches_pool
from public.dle_games g order by g.id"
psql "$DEV" -X -q -A -F ' | ' -c "$report" 2>>"$WORK/build.log" | sed 's/^/    /'
# every game: on, 365 days, blocks ok, no target twice inside the gap, the gap held, bank on the pool
[ "$(q "select count(*) from ($report) r where r.active and r.epoch and r.days = 365 and r.all_in_pool and r.blocks_ok and r.bank_matches_pool and r.min_gap >= r.gap_asked and r.never_drawn = 0")" = 4 ] \
  && pass "the four games are on, 365 days each, every target in the pool, blocks ok, the gap held, the bank on its pool, no target left undrawn" \
  || fail "the four games after D03 (table above)"
[ "$(q "select count(*) from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool")" = 178 ] && pass "Otakudle has 178 targets" || fail "Otakudle targets: $(q "select count(*) from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool")"
[ "$(q "select count(*) from public.dle_entities where attrs ? 'seen_at'")" = 0 ] && pass "no seen_at in any snapshot row" || fail "seen_at left"
[ "$(q "select (prosrc like '%bank-blocks-v1%')::text from pg_proc where oid = to_regprocedure('public.dle_build_bank(text, date, double precision)')")" = true ] && pass "dle_build_bank carries the marker bank-blocks-v1" || fail "marker after"
q "select string_agg(attname, ',' order by attnum) from pg_attribute where attrelid = 'public.dle_src_anime_character'::regclass and attnum > 0 and not attisdropped" | sed 's/^/    view columns after: /'
q "select 'V-L14 check 8, start of the blocks per game: ' || string_agg(g.id || '=' || coalesce((select min(a.d)::text from generate_series(1, 365) a(d) where not exists (select 1 from public.dle_schedule s where s.game_id = g.id group by s.entity_id, ((s.bank_day - a.d + 365) % 365) / greatest(1, least(365, (select count(*) from public.dle_entities e where e.game_id = g.id and e.can_be_target and e.in_pool))) having count(*) > 1)), 'none'), ' ' order by g.id) from public.dle_games g"
no="$(psql "$DEV" -X -q -At -c "set role anon; select (public.dle_day('kpopdle-idol') ->> 'game_no') || ',' || (public.dle_day('otakudle') ->> 'game_no') || ',' || (public.dle_day('otakudle-one-piece') ->> 'game_no') || ',' || (public.dle_day('otakudle-dragon-ball') ->> 'game_no')" 2>>"$WORK/build.log" | tail -1)"
[ "$no" = "1,1,1,1" ] && pass "dle_day answers for the four games as the browser calls it (anon), game n. 1" || fail "dle_day: $no"
pool="$(psql "$DEV" -X -q -At -c "set role anon; select jsonb_array_length(public.dle_pool('otakudle') -> 'entities') || ',' || (position('seen_at' in (public.dle_pool('otakudle'))::text) = 0)" 2>>"$WORK/build.log" | tail -1)"
[ "$pool" = "750,true" ] && pass "dle_pool('otakudle') as anon: 750 characters, no seen_at" || fail "dle_pool otakudle: $pool"
for c in V-017 V-018 V-019 V-023 V-024 V-K1a V-K1b V-K1c V-L13 V-L14 V-L15 V-DLE-KEPT; do
  out="$(psql "$DEV" -X -q -At -F ' | ' -f docs/launch/o1/checks/$c.sql 2>&1)"
  nko="$(printf '%s\n' "$out" | grep -cE '(^| )KO( |$)|ERROR')"
  nok="$(printf '%s\n' "$out" | grep -c '^ok')"
  if [ "$c" = V-019 ]; then   # check 6 (no game on, no play) is for a database before L14
    ko="$(printf '%s\n' "$out" | grep -E '(^| )KO( |$)|ERROR' | cut -d'|' -f2 | tr -d '\n')"
    [ "$nko" = 1 ] && printf '%s' "$ko" | grep -q 'aucun jeu actif' && pass "check V-019: $nok ok, the only KO is check 6 (no game on), which is for a database before L14" || fail "check V-019: $nko KO"
  elif [ "$nko" = 0 ]; then pass "check $c: $nok ok, 0 KO"
  else fail "check $c: $nko KO"; printf '%s\n' "$out" | grep -E 'KO|ERROR' | head -3; fi
done

# ---- the schema: what D03 changed in the catalogue ---------------------------------------------------------------------------------------
catalogue >"$WORK/cat-after.txt"
pg_dump "$DEV" --schema-only --no-owner 2>/dev/null | grep -vE '^\\(un)?restrict ' >"$WORK/schema-after.sql"
changed="$(diff "$WORK/cat-before.txt" "$WORK/cat-after.txt" | grep '^[<>]' | sed -E 's/^[<>] //; s/ [0-9a-f]{32}$//' | sort -u | tr '\n' ';')"
echo "    objects of the dle catalogue that differ after D03: ${changed:-none}"
[ "$changed" = "f dle_build_bank(text,date,double precision);v dle_src_anime_character;" ] \
  && pass "D03 changed two objects of the catalogue: the body of dle_build_bank and the view dle_src_anime_character; no table, column, grant, option or other function" \
  || fail "catalogue differences: $changed"
diff "$WORK/schema-before.sql" "$WORK/schema-after.sql" | grep -E '^[<>] (CREATE|ALTER|GRANT|REVOKE|COMMENT)' | sed 's/^/    schema diff: /' | cut -c1-160 | head -10
[ -z "$(diff "$WORK/schema-before.sql" "$WORK/schema-after.sql" | grep -E '^[<>] (CREATE (TABLE|VIEW|INDEX|POLICY|TRIGGER)|ALTER TABLE|GRANT|REVOKE)')" ] && pass "no table, view, index, policy, trigger or grant changed in the schema dump" || fail "schema dump: a non-function object changed"

# ---- the second run ---------------------------------------------------------------------------------------------------------------------------
fingerprint >"$WORK/fp-after1.txt"
out2="$(psql "$DEV" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$D03" 2>&1)"; rc2=$?
printf '%s\n' "$out2" | sed 's/^/    D03 second run: /' | cut -c1-200
fingerprint >"$WORK/fp-after2.txt"
pg_dump "$DEV" --schema-only --no-owner 2>/dev/null | grep -vE '^\\(un)?restrict ' >"$WORK/schema-after2.sql"
if [ "$rc2" = 0 ] && cmp -s "$WORK/fp-after1.txt" "$WORK/fp-after2.txt" && cmp -s "$WORK/schema-after.sql" "$WORK/schema-after2.sql" && printf '%s' "$out2" | grep -q 'D02: 0 bank(s) rebuilt, 4 already in blocks'; then
  pass "a second D03 changes nothing: same schema and grants, same rows of the dle tables (the refresh time of the snapshot apart), D02 says 0 rebuilt, 4 already in blocks"
else fail "the second run: rc=$rc2 or a difference"; diff "$WORK/fp-after1.txt" "$WORK/fp-after2.txt" | head -5; fi

# ---- the refusals, on copies of the state before D03 ----------------------------------------------------------------------------------
refuse() {   # refuse <db> <expected text> <label>
  local o; o="$(psql "$(url "$1")" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$D03" 2>&1)"; local r=$?
  if [ "$r" != 0 ] && printf '%s' "$o" | grep -q "$2"; then pass "$3"; else fail "$3 (rc=$r: $(printf '%s' "$o" | head -2 | cut -c1-160))"; fi
}
for n in 1 2 3 4 5; do run "$ADMIN" -c "create database t$n template dev_before" || { echo "FAIL copy t$n"; exit 1; }; done
qd t1 "set session_replication_role = replica; insert into public.profiles (id, username) select gen_random_uuid(), 'user_' || lpad(g::text, 5, '0') from generate_series(1, 250) g" >/dev/null
refuse t1 'refused, this database holds more than 200 profiles' "D03 refuses more than 200 profiles"
qd t2 "update public.sites set status = 'live' where id = 'hub'" >/dev/null
refuse t2 'refused, the anime or hub site is live' "D03 refuses a live hub site"
qd t3 "alter table public.character_facts rename to character_facts_x" >/dev/null
refuse t3 'is missing' "D03 refuses a missing table (character_facts)"
# the old view with three more output columns (the shape the brief feared): D03 drops it, 023 creates the new one, nothing else is lost
psql "$(url t4)" -X -q -At -v ON_ERROR_STOP=1 >>"$WORK/build.log" 2>&1 <<'SQL'
select regexp_replace(pg_get_viewdef('public.dle_src_anime_character'::regclass), ';\s*$', '') as d \gset
drop view public.dle_src_anime_character;
create view public.dle_src_anime_character with (security_invoker = true) as select x.*, true as seen_anime, true as seen_manga, true as seen_beginner from (:d) x;
SQL
o="$(psql "$(url t4)" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "$D03" 2>&1)"; r=$?
[ "$r" = 0 ] && [ "$(qd t4 "select string_agg(attname, ',' order by attnum) from pg_attribute where attrelid = 'public.dle_src_anime_character'::regclass and attnum > 0 and not attisdropped")" = "entity_id,name,search,attrs,hints,thumb_path,balance_key,can_be_target" ] \
  && [ "$(qd t4 "select count(*) from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool")" = 178 ] \
  && pass "a view with 3 extra columns is dropped (no cascade), 023 builds the new one, the result is the same (178 targets)" || fail "view with extra columns: rc=$r $(printf '%s' "$o" | head -2 | cut -c1-160)"
# the same old view with something reading it: the file stops, names the dependent, the transaction leaves the database as it was
psql "$(url t5)" -X -q -At -v ON_ERROR_STOP=1 >>"$WORK/build.log" 2>&1 <<'SQL'
select regexp_replace(pg_get_viewdef('public.dle_src_anime_character'::regclass), ';\s*$', '') as d \gset
drop view public.dle_src_anime_character;
create view public.dle_src_anime_character with (security_invoker = true) as select x.*, true as seen_anime from (:d) x;
create view public.zz_reader as select entity_id from public.dle_src_anime_character;
SQL
refuse t5 'zz_reader' "a view with other columns and a dependent: D03 refuses and names the dependent"
[ "$(qd t5 "select (prosrc like '%bank-blocks-v1%')::text from pg_proc where oid = to_regprocedure('public.dle_build_bank(text, date, double precision)')")" = false ] && pass "the refused run left the database as it was (no marker)" || fail "the refused run changed the database"
for r in "$D03" "${D03%.sql}.rollback.sql"; do
  sed -n 2p "$r" | grep -q '^-- DEV ONLY\. NEVER FOR PRODUCTION\.' || grep -q 'DEV ONLY. NEVER FOR PRODUCTION' "$r" && pass "$(basename "$r") is marked DEV ONLY, NEVER FOR PRODUCTION" || fail "$r is not marked"
done
out="$(psql "$DEV" -X -q -v ON_ERROR_STOP=1 --single-transaction -f "${D03%.sql}.rollback.sql" 2>&1)"; rc=$?
[ "$rc" != 0 ] && printf '%s' "$out" | grep -q 'has no rollback' && pass "the rollback file refuses" || fail "the rollback file did not refuse"

echo ""
if [ "$fails" = 0 ]; then echo "D03 rehearsal: every step passed"; exit 0; fi
echo "D03 rehearsal: $fails step(s) failed"; exit 1
