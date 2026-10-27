#!/bin/bash
# Run O1, lane O2: the <script> and <link rel="preload"> tags of kpop pages rendered by a production server (next start of
# apps/quiz/.next, an offline kpop build) against a fake Supabase (fake-supabase.cjs: 24 quizzes, 4 groups, 48 songs).
#   kpop-render-count.sh render <name>    renders /trending, /easy-kpop-quizzes, /hard-kpop-quizzes, /bts-quiz and /bts-trivia into $O1_RENDER/<name>
#   kpop-render-count.sh compare <a> <b>  the number and the list of script and preload tags of each page; exit 0 only when the counts are equal
# The build-time prerender of the list pages is dropped first, so they are rendered with data (24 cards). Ports 4102 (next) and 4199 (fake).
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
QUIZ="$(cd "$HERE/../../.." && pwd)"
OUT="${O1_RENDER:-${TMPDIR:-/tmp}/o1-O2-render}"
PAGES="trending easy-kpop-quizzes hard-kpop-quizzes bts-quiz bts-trivia"
stop() { for p in 4102 4199; do kill $(lsof -ti tcp:$p) 2>/dev/null; done; sleep 1; }
cmd="${1:-}"; shift || true
case "$cmd" in
  render)
    name="${1:?usage: kpop-render-count.sh render <name>}"; out="$OUT/$name"; rm -rf "$out"; mkdir -p "$out"
    cd "$QUIZ" || exit 1
    [ -d .next ] || { echo "no apps/quiz/.next: build first" >&2; exit 1; }
    stop
    node -e '
const fs = require("fs"), p = ".next/prerender-manifest.json", m = JSON.parse(fs.readFileSync(p, "utf8"));
for (const r of ["trending", "easy-kpop-quizzes", "hard-kpop-quizzes"]) { delete m.routes["/" + r]; for (const e of [".html", ".rsc", ".meta", ".segments"]) fs.rmSync(".next/server/app/" + r + e, { recursive: true, force: true }); }
fs.writeFileSync(p, JSON.stringify(m));'
    rm -rf .next/cache/fetch-cache
    FAKE_PORT=4199 node "$HERE/fake-supabase.cjs" > "$out/fake.log" 2>&1 &
    sleep 1
    env NEXT_PUBLIC_SITE_ID=kpop NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=o1-offline-anon SUPABASE_SERVICE_ROLE_KEY=o1-offline-service \
      FAKE_PORT=4199 NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS="--require $HERE/fetch-redirect.cjs" pnpm exec next start -p 4102 > "$out/next.log" 2>&1 &
    for i in $(seq 1 60); do curl -s -o /dev/null http://127.0.0.1:4102/ && break; sleep 1; done
    for p in $PAGES; do
      code=$(curl -s -o "$out/$p.html" -w "%{http_code}" "http://127.0.0.1:4102/$p")
      grep -o '<script[^>]*src="[^"]*"[^>]*>' "$out/$p.html" | grep -o 'src="[^"]*"' | sort > "$out/$p.scripts"
      grep -o '<link[^>]*rel="preload"[^>]*>' "$out/$p.html" | grep -o 'href="[^"]*"' | sort > "$out/$p.preloads"
      echo "$name /$p http $code scripts $(wc -l < "$out/$p.scripts" | tr -d ' ') preloads $(wc -l < "$out/$p.preloads" | tr -d ' ') quiz cards $(grep -o 'ux-qcard' "$out/$p.html" | wc -l | tr -d ' ')"
    done
    stop ;;
  compare)
    a="${1:?usage: kpop-render-count.sh compare <a> <b>}"; b="${2:?usage: kpop-render-count.sh compare <a> <b>}"
    bad=0
    for p in $PAGES; do
      [ -f "$OUT/$a/$p.scripts" ] && [ -f "$OUT/$b/$p.scripts" ] || { echo "/$p: not rendered in both"; bad=1; continue; }
      sa=$(wc -l < "$OUT/$a/$p.scripts" | tr -d ' '); sb=$(wc -l < "$OUT/$b/$p.scripts" | tr -d ' ')
      pa=$(wc -l < "$OUT/$a/$p.preloads" | tr -d ' '); pb=$(wc -l < "$OUT/$b/$p.preloads" | tr -d ' ')
      ok=equal; { [ "$sa" = "$sb" ] && [ "$pa" = "$pb" ]; } || { ok=DIFFERENT; bad=1; }
      echo "/$p: scripts $sa/$sb, preload links $pa/$pb, $ok"
    done
    [ $bad = 0 ] && echo "RESULT: same number of script and preload tags in $a and $b" || echo "RESULT: the tags differ between $a and $b"
    exit $bad ;;
  *) echo "usage: kpop-render-count.sh render <name> | compare <a> <b>" >&2; exit 2 ;;
esac
