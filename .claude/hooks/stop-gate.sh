#!/usr/bin/env bash
# Verse Working System V2 - Stop gate. The worker cannot end a turn with red types.
# Scoped to `tsc --noEmit` (fast, reliable "not red"); the full next-build + route +
# token gates run at step/closing-sweep boundaries (a full build per turn-end is ~2
# min and would clobber the dev server .next). Exit 2 = block the turn from ending.
cd /Users/louis/IT/Dev/projects/KpopQuizzV2/apps/quiz 2>/dev/null || exit 0
if ! npx tsc --noEmit -p tsconfig.json > /tmp/verse-stop-tsc.log 2>&1; then
  echo "STOP BLOCKED: tsc is red - fix the type errors before ending the turn (tail /tmp/verse-stop-tsc.log)." >&2
  exit 2
fi
# Fast token gate too (owner ruling 2026-08-04); the full build stays a step gate.
if ! npm run check:verse-tokens > /tmp/verse-stop-tokens.log 2>&1; then
  echo "STOP BLOCKED: Verse token gate is red - raw hex in a Verse surface (tail /tmp/verse-stop-tokens.log)." >&2
  exit 2
fi
exit 0
