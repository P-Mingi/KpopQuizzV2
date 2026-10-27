#!/bin/bash
# apply-local.sh <db> <file>...: like migrate-dev.sh (same transaction rule) on the local PG18 cluster.
db="$1"; shift
for file in "$@"; do
  mode=single; grep -qiE '^-- *o1-transaction: *none' "$file" && mode=none
  opts=(-X -q -v ON_ERROR_STOP=1); [ $mode = single ] && opts+=(--single-transaction)
  out="$(/opt/homebrew/opt/postgresql@18/bin/psql -h 127.0.0.1 -p 54392 -U postgres -d "$db" "${opts[@]}" -f "$file" 2>&1)"; rc=$?
  [ -n "$out" ] && printf '%s\n' "$out" | tail -10
  echo "$([ $rc -eq 0 ] && echo ok || echo "failed rc=$rc"): $(basename "$file") ($mode) on local:$db"
  [ $rc -eq 0 ] || exit 1
done
