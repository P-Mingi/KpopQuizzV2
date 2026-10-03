#!/bin/sh
# C1 (V12 run): one batch of states (at most 10), all four combos each, against :3071.
# Re-mints the test user's storage state first (Playwright setup project, reused when < 45 min old).
# Usage: sh run-batch.sh v11|v12 "a,b,c"
H="$(cd "$(dirname "$0")" && pwd)"
WT="$(cd "$H/../../../../../../.." && pwd)"
UX11_CHROMIUM="$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell"
export UX11_CHROMIUM
(cd "$WT/apps/quiz" && PLAYWRIGHT_BASE_URL=http://localhost:3071 pnpm exec playwright test --project=setup >/dev/null 2>&1) || echo "setup failed"
node "$H/c1-pixel-$1.mjs" --states "$2"
echo "batch done: $1 $2"
