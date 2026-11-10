#!/bin/bash
# run-scen.sh <rowsfile> <specfile>
W=/private/tmp/claude-501/-Users-louis-IT/1c194dbf-f1c6-4918-a72e-85a0ed70b346/scratchpad/slots
cp $W/$1 $W/rows-live.json
for p in $(lsof -tiTCP:3123 -sTCP:LISTEN); do kill $p; done; sleep 2
rm -rf /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-slots/apps/quiz/.next/cache/fetch-cache /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-slots/apps/quiz/.next/server/app
($W/startnext.sh > $W/next.log 2>&1 &)
until curl -s -o /dev/null http://hub.localhost:3123/robots.txt; do sleep 2; done
curl -s -o /dev/null http://hub.localhost:3123/; curl -s -o /dev/null http://hub.localhost:3123/kpopdle
cd $W && node crops.mjs /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-slots/docs/o1/reports/L1/slots/img $2
