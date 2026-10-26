# Admin images on otakuquiz.org, part 2: the admin UI and the display (owner, 2026-10-26)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-admfront, branch o1/admfront (= o1/integration). Q = apps/quiz/src.
Part 1 (docs/o1/briefs/ADM-back.md, same folder) builds the API in parallel: code against its shapes exactly (mock them in tests).
Read both briefs, the anime design tokens (Q/styles/sites/anime/*, orange, DM Sans), the existing admin pages, and the code you change.
## Rules
As ADM-back.md (no push, no production, kpop unchanged, never `git add -A`, no dashes, no emoji). New CSS only under the anime scope.
## Do
1. /admin on otakuquiz.org with tabs (Images first; room for more). Server gate: not an admin, 404. Same design as the site
   (orange, DM Sans, white cards), light and dark, fully usable with the keyboard (tab order, focus rings, Enter and Space, Escape).
2. Images tab: left, the 50 series with search, a filter (with image / without image) and a counter ("34/50 series, 120/412
   characters"); right, the chosen series: its cover slot, then the grid of its characters, a portrait slot each. Each slot: the
   current image (or the neutral placeholder), a preview in place (card, series header, personality result), and two ways to change
   it: drag and drop or an "Upload" button, or a "Paste image URL" field and an "Import" button. Buttons: Replace, Remove (back to
   the bundled photo or the placeholder), Set focal point (a click on the image sets object-position). Fields required before
   saving: source URL, author, licence (CC0, public domain, CC BY, CC BY-SA, my photo, licensed by the rights holder, other + note).
   Upload progress shown; errors in plain words.
3. Display everywhere a series or a character shows on the anime build (series and character pages, cards, the hub's anime blocks,
   personality results): the owner's image first, else the bundled photo, else the neutral placeholder, with the focal point as
   object-position; the attribution line under the image for CC BY and CC BY-SA; every image on /credits.
## Checks
Unit tests (gate, list filter and counter, form validation, focal point, display order, attribution rule, credits), tsc 0, full vitest
green, check.sh ok, three builds, two kpop chunk scripts. Screenshots (after ORCH merges part 1, or against a mocked API): the list,
an open series, an upload in progress, light and dark, in docs/o1/reports/ADM/. Commits on o1/admfront ("o1: ADM front ..."; last
line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Hand back at most 6 lines.
