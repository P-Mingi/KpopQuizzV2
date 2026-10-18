#!/bin/bash
# Run O1: the integration check (RUN-O1-PROMPT section 5, step 8): after main is merged into o1/integration and
# every night. tsc and unit tests on o1/integration, the three site builds in a clean detached worktree under the build
# lock (dev branch database), parity of o1/integration against the origin/main commit it contains when the diff can
# reach kpop (offline while docs/o1/PARITY-OFFLINE exists), the leak suite once Q0a's gate-checks.sh is merged.
# Evidence: docs/o1/evidence/nightly/<sha>/. A red step writes docs/o1/FREEZE (nothing merges until a fix is green).
set -uo pipefail
ROOT=/Users/louis/IT/Dev/projects/KpopQuizzV2
O1="$ROOT/.claude/worktrees/o1"; RUN="$O1/docs/o1"; G="$O1/scripts/o1/git.sh"; KPQ="${O1_KPQ:-$HOME/kpq-o1}"
sha="$("$G" -C "$O1" rev-parse HEAD)"; main="$("$G" -C "$O1" merge-base HEAD origin/main)"
EV="$RUN/evidence/nightly/$sha"; mkdir -p "$EV"; : > "$EV/steps.tsv"
step() { local n="$1"; shift; local t0; t0=$(date +%s); "$@" > "$EV/$n.log" 2>&1; local rc=$?; printf '%s\t%s\t%s\n' "$n" "$rc" $(( $(date +%s) - t0 )) >> "$EV/steps.tsv"; echo "nightly: $n rc=$rc"; }
W="$ROOT/.claude/worktrees/o1-gate-nightly"
if [ -e "$W" ]; then rm -f "$W/node_modules" "$W/apps/quiz/node_modules" "$W/packages/shared/node_modules"; rm -rf "$W/apps/quiz/.next"; [ "$(git -C "$W" rev-parse --show-toplevel 2>/dev/null)" = "$W" ] || rm -rf "$W"; "$G" -C "$O1" worktree remove "$W" >/dev/null 2>&1; fi
"$G" -C "$O1" worktree add --detach --quiet "$W" "$sha" || exit 3
ln -s "$O1/node_modules" "$W/node_modules"; ln -s "$O1/apps/quiz/node_modules" "$W/apps/quiz/node_modules"
rm -rf "$W/packages/shared/node_modules"; ln -s "$O1/packages/shared/node_modules" "$W/packages/shared/node_modules"
cleanup() { rm -f "$W/node_modules" "$W/apps/quiz/node_modules" "$W/packages/shared/node_modules"; rm -rf "$W/apps/quiz/.next"; "$G" -C "$O1" worktree remove "$W" >/dev/null 2>&1; }
trap cleanup EXIT
dbenv=offline; [ -f "$KPQ/secrets/dev.env" ] && dbenv=dev
step tsc bash -c 'cd "$1/apps/quiz" && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --incremental false' _ "$W"
step unit bash -c 'cd "$1/apps/quiz" && ./node_modules/.bin/vitest run --testTimeout=30000' _ "$W"
for s in kpop anime hub; do
  step "build-$s" "$O1/scripts/o1/build-lock.sh" run "nightly-$s" -- "$O1/scripts/o1/env.sh" "$dbenv" -- bash -c \
    'cd "$1/apps/quiz" && rm -rf .next && NEXT_PUBLIC_SITE_ID="$2" NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 npm run build' _ "$W" "$s"
done
neutral='^(docs/|design/|scripts/o1/|scripts/o1-hooks/|scripts/o1-owner-guard\.mjs$|scripts/anime/|apps/quiz/e2e/|apps/quiz/scripts/o1/|apps/quiz/playwright\.o1\.config\.ts$|apps/quiz/src/app/sites/|apps/quiz/src/lib/site/anime/|apps/quiz/src/lib/site/hub/|apps/quiz/src/styles/sites/anime/|apps/quiz/src/styles/sites/hub/|\.gitignore$)|\.test\.(ts|tsx|mts)$'
"$G" -C "$O1" diff --name-only "$main" "$sha" > "$EV/changed-vs-main.txt"
if grep -vE "$neutral" "$EV/changed-vs-main.txt" | grep -q .; then
  kq="$KPQ"; [ -f "$RUN/PARITY-OFFLINE" ] && kq="$KPQ/parity-offline"
  step parity env O1_KPQ="$kq" "$O1/scripts/o1/parity.sh" "$main" "$sha" --evidence "$EV"
else
  printf 'parity\tskipped\t0\n' >> "$EV/steps.tsv"; echo "o1/integration differs from origin/main only in run files" > "$EV/parity.log"; echo "nightly: parity skipped (run files only)"
fi
if [ -x "$O1/scripts/o1/gate-checks.sh" ]; then echo "leak suite: through gate-checks.sh (Q0a)" > "$EV/leak.log"; else printf 'leak\tpending\t0\n' >> "$EV/steps.tsv"; echo "leak suite arrives with Q0a" > "$EV/leak.log"; fi
red="$(awk -F'\t' '$2!="0" && $2!="skipped" && $2!="pending" {print $1}' "$EV/steps.tsv" | tr '\n' ' ')"
if [ -n "$red" ]; then printf 'Nightly red on %s: %s (evidence %s)\n' "${sha:0:12}" "$red" "$EV" > "$RUN/FREEZE"; echo "nightly: RED ($red), FREEZE written"; exit 1; fi
echo "nightly: green on ${sha:0:12} (main ${main:0:12})"
