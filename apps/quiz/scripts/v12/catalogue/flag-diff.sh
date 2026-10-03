#!/bin/sh
# One capture of /api/blind-test/generate on a dev server started with the given flags, then the
# server is stopped. Run from apps/quiz:
#   sh scripts/v12/catalogue/flag-diff.sh <label> <NEXT_PUBLIC_UX_V1 or ""> <NEXT_PUBLIC_UX_V12 or ""> <out dir>
# generate only reads, so nothing is written to the database.
LABEL="$1"; V1="$2"; V12="$3"; OUT="$4"; PORT=3062
mkdir -p "$OUT"
NEXT_PUBLIC_UX_V1="$V1" NEXT_PUBLIC_UX_V12="$V12" NODE_OPTIONS='--max-http-header-size=32768' pnpm exec next dev -p "$PORT" > "$OUT/$LABEL.dev.log" 2>&1 &
npx tsx scripts/v12/catalogue/flag-diff.mts "http://localhost:$PORT" "$OUT/$LABEL.json"
CODE=$?
for pid in $(lsof -ti "tcp:$PORT"); do kill "$pid" 2>/dev/null; done
sleep 2
for pid in $(lsof -ti "tcp:$PORT"); do kill -9 "$pid" 2>/dev/null; done
rm -f "$OUT/$LABEL.dev.log"
exit $CODE
