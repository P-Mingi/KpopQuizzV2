#!/bin/bash
# Run O1: the only writer of SQL to the dev branches (RUN-O1-PROMPT rule 4).
#   scripts/o1/migrate-dev.sh [--branch dev|scratch] <file.sql>...     apply, serial, logged
#   scripts/o1/migrate-dev.sh --self-test                             proves the production refusals
# dev (o1-dev, ORCH only): every file must be committed on o1/integration (so R passed it), clean in the worktree,
#   and applied in the order of docs/o1/contracts/manifest.md (column "file"); a file already applied is skipped.
# scratch (o1-scratch, lanes' tests): any file, logged, no order rule.
# Refuses any database URL that contains the production ref or lacks the branch ref. Values are never printed.
# Transaction mode: a header line "-- o1-transaction: none" (CONCURRENTLY, one statement) runs without
# --single-transaction; anything else runs in one transaction.
set -uo pipefail
PROD_REF="rdkgouofytwfdpbxbzio"
O1=/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1
KPQ="${O1_KPQ:-$HOME/kpq-o1}"
PSQL="${O1_PSQL:-/opt/homebrew/opt/postgresql@18/bin/psql}"
LOG="${O1_MIGRATION_LOG:-$O1/docs/o1/migration-log.md}"
MANIFEST="$O1/docs/o1/contracts/manifest.md"
branch=dev
die() { echo "migrate-dev: $1" >&2; exit "${2:-3}"; }

if [ "${1:-}" = "--self-test" ]; then
  d="$(mktemp -d)"; mkdir -p "$d/secrets"; chmod 700 "$d/secrets"
  printf 'O1_BRANCH_REF=abcdefghijklmnopqrst\nO1_DB_URL=postgresql://postgres.rdkgouofytwfdpbxbzio:x@aws-0-eu.pooler.supabase.com:5432/postgres\n' > "$d/secrets/scratch.env"
  chmod 600 "$d/secrets/scratch.env"
  echo "select 1;" > "$d/t.sql"
  out="$(O1_KPQ="$d" O1_MIGRATION_LOG="$d/log.md" "$0" --branch scratch "$d/t.sql" 2>&1)"; rc=$?
  printf 'O1_BRANCH_REF=abcdefghijklmnopqrst\nO1_DB_URL=postgresql://postgres.zzzzzzzzzzzzzzzzzzzz:x@127.0.0.1:9/postgres\n' > "$d/secrets/scratch.env"
  out2="$(O1_KPQ="$d" O1_MIGRATION_LOG="$d/log.md" "$0" --branch scratch "$d/t.sql" 2>&1)"; rc2=$?
  rm -rf "$d"
  if [ $rc -eq 5 ] && [ $rc2 -eq 5 ]; then echo "self-test ok: production ref refused ($out); missing branch ref refused ($out2)"; exit 0; fi
  echo "self-test FAILED: rc=$rc ($out) rc2=$rc2 ($out2)"; exit 1
fi
if [ "${1:-}" = "--branch" ]; then branch="${2:?}"; shift 2; fi
case "$branch" in dev|scratch) ;; *) die "branch must be dev or scratch" 2 ;; esac
[ $# -gt 0 ] || die "no file" 2
f="$KPQ/secrets/$branch.env"
[ -f "$f" ] || die "$f missing (owner gate G1)" 4
url="$(sh -c 'set -a; . "$1"; printf %s "${O1_DB_URL:-}"' _ "$f")"
ref="$(sh -c 'set -a; . "$1"; printf %s "${O1_BRANCH_REF:-}"' _ "$f")"
case "$url" in *"$PROD_REF"*) die "refused: the database URL names the production project" 5 ;; esac
[ -n "$ref" ] || die "refused: O1_BRANCH_REF missing" 5
case "$url" in *"$ref"*) ;; *) die "refused: the database URL lacks the branch ref" 5 ;; esac
[ -x "$PSQL" ] || die "psql 18 not found at $PSQL" 4

COMMON="$(git -C "$O1" rev-parse --git-common-dir)"
LOCK="$COMMON/o1-migrate.lock"
until mkdir "$LOCK" 2>/dev/null; do
  pid="$(cat "$LOCK/pid" 2>/dev/null || echo 0)"; kill -0 "$pid" 2>/dev/null || rm -rf "$LOCK"; sleep 3
done
echo $$ > "$LOCK/pid"; trap 'rm -rf "$LOCK"' EXIT

[ -f "$LOG" ] || printf '# Run O1 migration log\n\n| when (UTC) | branch | file | sha256 | result |\n|---|---|---|---|---|\n' > "$LOG"
applied() { grep -F "| o1-dev | $1 |" "$LOG" | grep -q '| ok |'; }
rel() { case "$1" in "$O1"/*) printf '%s' "${1#$O1/}" ;; *) printf '%s' "$1" ;; esac; }
rc_all=0
for file in "$@"; do
  [ -f "$file" ] || die "no such file $file" 2
  r="$(rel "$(cd "$(dirname "$file")" && pwd)/$(basename "$file")")"
  sum="$(shasum -a 256 "$file" | cut -c1-16)"
  if [ "$branch" = dev ]; then
    git -C "$O1" cat-file -e "HEAD:$r" 2>/dev/null || die "$r is not committed on o1/integration (only R-passed files reach o1-dev)"
    git -C "$O1" diff --quiet HEAD -- "$r" || die "$r differs from o1/integration HEAD"
    if applied "$r"; then echo "skip (already applied): $r"; continue; fi
    if [ -f "$MANIFEST" ]; then
      # every manifest file listed before this one must already be applied on o1-dev
      prev="$(grep -oE 'docs/pending-migrations/multisite/[A-Za-z0-9_./-]+\.sql' "$MANIFEST" | awk -v t="$r" '$0==t{exit} {print}')"
      grep -qF "$r" "$MANIFEST" || die "$r is not in the manifest"
      for p in $prev; do case "$p" in *.rollback.sql) continue ;; esac; applied "$p" || die "manifest order: $p must be applied before $r"; done
    else
      die "manifest $MANIFEST missing (F0)"
    fi
  fi
  mode=single; grep -qiE '^-- *o1-transaction: *none' "$file" && mode=none
  opts=(-X -q -v ON_ERROR_STOP=1); [ $mode = single ] && opts+=(--single-transaction)
  out="$("$PSQL" "$url" "${opts[@]}" -f "$file" 2>&1)"; rc=$?
  res=ok; [ $rc -eq 0 ] || { res="failed rc=$rc"; rc_all=1; }
  printf '| %s | o1-%s | %s | %s | %s |\n' "$(date -u +%FT%TZ)" "$branch" "$r" "$sum" "$res" >> "$LOG"
  printf '%s\n' "$out" | sed "s#$url#<db-url>#g" | tail -30
  echo "$res: $r on o1-$branch"
  [ $rc -eq 0 ] || break
done
exit $rc_all
