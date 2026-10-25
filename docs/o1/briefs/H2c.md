# Lane H1, lot H2c: wire the real data into the new FanQuiz home (H2a page + H2b data)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-h2c, branch o1/h2c (H2a 912947c + H2b 4715bdc + o1/integration,
merged clean). Q = apps/quiz/src. Briefs H2a.md and H2b.md (same folder as this one) and their rules apply; the design is
docs/o1/design/fanquiz-hub/. Read this brief, docs/o1/requests/H1.md, Q/lib/site/hub/home-types.ts, home-*.ts, home-viewer.ts,
Q/lib/site/hub/data/*, docs/o1/reports/H2/diff.md and data.md, and the code you change. Never `git add -A`; files by path.
## Do
1. Each home loader returns its block from the H2b module (Q/lib/site/hub/data/*), mapped to the H2a shape; no sample data is left
   in a render path (samples stay only in tests). A null block disappears and its grid adapts, as the design's sc-if does.
2. home-viewer.ts: real progress and streaks of the signed-in viewer (the existing XP, level and daily streak code of each site);
   signed out as the design.
3. Real quiz slugs and canonical links (registry netOrigin); Surprise me draws from the H2b surprise pool; the countdown targets the
   real rotation (00:05 UTC, Paris time shown as the design does, right in winter and summer); the blind test shows the real number
   of songs and plays the real 10 second preview of the first song.
4. The search button (no action in the design): a link to the canonical search page of KpopQuiz when the filter is All or KpopQuiz,
   of OtakuQuiz when the filter is OtakuQuiz. Nothing else new.
5. The email template patch of docs/o1/requests/H1.md (OtakuQuiz wordmark): apply it to both copies so render.test.ts stays green.
6. The passport block keeps HubShares' wording (owner: reuse HubShares); note it in diff.md as the one wording difference.
## Checks
Unit tests: each loader maps its module (null, error and normal paths), no sample in render paths (a test greps for the sample
names of the design script), links canonical. tsc 0, full vitest green, check.sh ok, hub, anime and kpop builds green, the two
kpop chunk scripts against o1/integration. Screenshots with real data from o1-dev (scripts/o1-tools/dev-up.sh) at 1440 and 390,
signed out and signed in (scripts/o1-tools/signin-link.sh), in docs/o1/reports/H2/real-*.png; update diff.md (block by block:
only logos, data and the passport wording may differ).
Commits on o1/h2c ("o1: H2c ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 8 lines:
sha, files, screenshots, differences left, what still lacks data, checks.
