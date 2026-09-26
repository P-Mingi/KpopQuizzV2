#!/bin/sh
# C1: run the pixel check in chunks of states (all four combos each), re-minting the
# test user's storage state (Playwright setup project) before each chunk so no signed-in
# render uses an expired session. Usage: sh run-chunks.sh "a,b,c" "d,e" ...
# Needs UX11_CHROMIUM. Run from anywhere; paths are absolute to this worktree.
H="$(cd "$(dirname "$0")" && pwd)"
WT="$(cd "$H/../../../../../../.." && pwd)"
for chunk in "$@"; do
  rm -f "$WT/apps/quiz/e2e/.auth/test-user.json"
  (cd "$WT/apps/quiz" && pnpm exec playwright test --project=setup >/dev/null 2>&1) || echo "setup failed"
  node "$H/c1-pixel.mjs" --states "$chunk"
  echo "chunk done: $chunk"
done
