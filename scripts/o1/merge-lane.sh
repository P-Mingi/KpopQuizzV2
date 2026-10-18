#!/bin/bash
# Run O1: merge one lane into o1/integration (RUN-O1-PROMPT section 5, step 6). One merge at a time.
#   scripts/o1/merge-lane.sh <lane> <sha>
# Prints one JSON line: {"ok":bool,"kind":"merged|conflict|red|frozen|sql-failed","sha":"...","note":"..."}
# Steps: FREEZE check; guard on o1/integration..<sha>; HOT list; git merge --no-ff --no-commit; tsc and unit tests
# on the merged tree; parity.sh on the merged tree (a temporary commit object, the branch does not move) when the
# lane can reach kpop; commit (only the merge, the LEDGER line and RUN-STATE are staged, never git add -A).
# A conflict or a red step before the commit: git merge --abort. After the commit: the lane's reviewed SQL goes to
# o1-dev through migrate-dev.sh; on failure the commit stays, docs/o1/FREEZE is written. Never resets o1/integration.
set -uo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"
RUN="$O1/docs/o1"
KPQ="${O1_KPQ:-$HOME/kpq-o1}"
G="$O1/scripts/o1/git.sh"
lane="${1:?usage: merge-lane.sh <lane> <sha>}"; ref="${2:?sha}"
out() { jq -cn --argjson ok "$1" --arg kind "$2" --arg sha "${3:-}" --arg note "$4" '{ok:$ok, kind:$kind, sha:$sha, note:$note}'; exit 0; }
cd "$O1" || exit 3
[ -f "$RUN/FREEZE" ] && out false frozen "" "FREEZE: $(head -1 "$RUN/FREEZE")"
[ "$(git rev-parse --abbrev-ref HEAD)" = o1/integration ] || out false red "" "O1 is not on o1/integration"
git diff --cached --quiet || out false red "" "the index of O1 is not empty: ORCH commits or unstages first"
[ -f .git/MERGE_HEAD ] || [ -f "$(git rev-parse --git-dir)/MERGE_HEAD" ] && out false red "" "a merge is already in progress in O1"
sha="$("$G" rev-parse --verify "$ref^{commit}")" || out false red "" "unknown sha $ref"
LOG="$RUN/evidence/$lane/$sha"; mkdir -p "$LOG"
node scripts/o1-owner-guard.mjs --agent "$lane" --range "o1/integration..$sha" --ownership "$RUN/OWNERSHIP.json" > "$LOG/merge-guard.log" 2>&1 \
  || out false red "$sha" "guard: $(tail -3 "$LOG/merge-guard.log" | tr '\n' ' ')"
"$G" diff --name-only --no-renames "o1/integration...$sha" > "$LOG/merge-changed.txt"
hot_exempt="$(jq -r --arg l "$lane" '.[$l].hotExempt // false' "$RUN/lanes.json" 2>/dev/null || echo false)"
if [ "$hot_exempt" != true ]; then
  hits="$(grep -vE '^(#|$)' "$RUN/HOT.txt" | cut -f1 | grep -Fxf - "$LOG/merge-changed.txt" || true)"
  [ -z "$hits" ] || out false red "$sha" "hot files: $(echo "$hits" | tr '\n' ' ')"
fi
before="$(git rev-parse HEAD)"
if ! "$G" merge --no-ff --no-commit "$sha" > "$LOG/merge.log" 2>&1; then
  "$G" merge --abort >/dev/null 2>&1
  out false conflict "$sha" "merge conflict: $(grep -E 'CONFLICT' "$LOG/merge.log" | head -5 | tr '\n' ' ')"
fi
abort() { "$G" merge --abort >/dev/null 2>&1; out false red "$sha" "$1"; }
( cd apps/quiz && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --incremental false ) > "$LOG/merge-tsc.log" 2>&1 || abort "tsc on the merged tree: $(grep -m3 'error TS' "$LOG/merge-tsc.log" | tr '\n' ' ')"
( cd apps/quiz && ./node_modules/.bin/vitest run --testTimeout=30000 ) > "$LOG/merge-unit.log" 2>&1 || abort "unit tests on the merged tree: $(tail -5 "$LOG/merge-unit.log" | tr '\n' ' ')"
# D-025: while docs/o1/PARITY-OFFLINE exists, parity builds both sides against the offline Supabase (no production
# read): KPQ for parity.sh points at a stand-in whose kpop-parity.env holds only offline values.
parity_kpq() {
  if [ -f "$RUN/PARITY-OFFLINE" ]; then
    local d="$KPQ/parity-offline"; mkdir -p "$d/secrets"; chmod 700 "$d" "$d/secrets"
    printf 'NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9\nNEXT_PUBLIC_SUPABASE_ANON_KEY=o1-offline-anon\nSUPABASE_SERVICE_ROLE_KEY=o1-offline-service\nNEXT_PUBLIC_SITE_URL=https://kpopquiz.org\nNEXT_PUBLIC_SITE_NAME=KpopQuiz\n' > "$d/secrets/kpop-parity.env"
    chmod 600 "$d/secrets/kpop-parity.env"; echo "$d"
  else echo "$KPQ"; fi
}
neutral='^(docs/|design/|scripts/o1/|scripts/o1-hooks/|scripts/o1-owner-guard\.mjs$|scripts/anime/|apps/quiz/e2e/|apps/quiz/scripts/o1/|apps/quiz/playwright\.o1\.config\.ts$|apps/quiz/src/app/sites/|apps/quiz/src/lib/site/anime/|apps/quiz/src/lib/site/hub/|apps/quiz/src/styles/sites/anime/|apps/quiz/src/styles/sites/hub/)|\.test\.(ts|tsx|mts)$'
parity="not needed"
if grep -vE "$neutral" "$LOG/merge-changed.txt" | grep -q .; then
  tmp_tree="$(git write-tree)"
  tmp_commit="$(git commit-tree "$tmp_tree" -p "$before" -p "$sha" -m "o1: parity candidate for $lane")"
  if O1_KPQ="$(parity_kpq)" "$O1/scripts/o1/parity.sh" "$before" "$tmp_commit" --evidence "$LOG/merge-parity" > "$LOG/merge-parity.log" 2>&1; then
    parity="identical (base $before, merged tree $tmp_tree)"; [ -f "$RUN/PARITY-OFFLINE" ] && parity="$parity, offline (D-025)"
  else
    abort "parity on the merged tree: $(tail -5 "$LOG/merge-parity.log" | tr '\n' ' ')"
  fi
fi
# LEDGER line (the Merge log section is the last one of LEDGER.md), staged with the merge.
printf '| %s | %s | %s | %s | %s |\n' "$(date -u +%FT%TZ)" "$lane" "${sha:0:12}" "$parity" "$(grep -c 'docs/pending-migrations/multisite/.*[0-9].*\.sql$' "$LOG/merge-changed.txt" || true) SQL file(s)" >> "$RUN/LEDGER.md"
git add "$RUN/LEDGER.md"
git commit -q -m "o1: merge $lane (${sha:0:12}), R PASS" -m "Parity: $parity." > "$LOG/merge-commit.log" 2>&1 || abort "commit failed: $(tail -3 "$LOG/merge-commit.log" | tr '\n' ' ')"
merged="$(git rev-parse HEAD)"
# Reviewed SQL of the lane to o1-dev, in manifest order (migrate-dev.sh enforces it).
sql="$(grep -E '^docs/pending-migrations/multisite/[0-9][^/]*\.sql$' "$LOG/merge-changed.txt" | grep -v '\.rollback\.sql$' | sort || true)"
if [ -n "$sql" ]; then
  if [ -f "$KPQ/secrets/dev.env" ]; then
    # shellcheck disable=SC2086
    if ! "$O1/scripts/o1/migrate-dev.sh" --branch dev $sql > "$LOG/merge-sql.log" 2>&1; then
      printf 'SQL failed on o1-dev after merging %s (%s): see %s\n' "$lane" "${sha:0:12}" "$LOG/merge-sql.log" > "$RUN/FREEZE"
      out false sql-failed "$merged" "SQL failed on o1-dev, FREEZE written: $(tail -3 "$LOG/merge-sql.log" | tr '\n' ' ')"
    fi
  else
    echo "o1-dev not configured yet (G1): SQL files wait: $sql" > "$LOG/merge-sql.log"
  fi
fi
out true merged "$merged" "merged $lane at ${sha:0:12} into o1/integration ($merged); parity: $parity"
