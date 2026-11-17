## What this PR does

The owner's five requests of 2026-11-17 on the Kpopdle daily page (bunnyverse.org/fr/daily and /daily) and its admin. Builds on #233, whose
head is merged in here: until #233 is merged into main, this diff also shows its commits.

1. **The guide under the game**: more room above it, and the paragraph that stood open between the two toggles is now a toggle of its own,
   "Qu'est-ce que Kpopdle ?" / "What is Kpopdle?". The text stays in the server HTML (a `<details>`, the site's rule for folded text); the
   JSON-LD is unchanged.
2. **Yesterday's idol**: the line sits 10 px closer to "Entrée choisit la première suggestion · Abandonner", and the name is in the game's
   pink (`--hub-dle-c`).
3. **The guesses grid**: a thin line and a little room between the "Tes essais" header (with its legend) and the column header row.
4. **The idols' pictures** in the grid, the suggestions and the result: the verified trivia picture first (`entity_images`), else a free
   KpopCards photo of the same person (by Wikidata id, a live photo with a named author and a CC licence, never an age-locked subject, never
   NC or ND), else the initials as before. Read on the server, cached 5 minutes, no request per tile, no database change. The KpopCards
   photos that need a credit are listed on the hub's /credits. The harvest photos of lot 6 show once the owner's script has cut their card
   files (`pnpm --filter quiz owner:cards`); until then those idols keep their initials.
5. **The stickers' size**: a saved size reached the page, but two 60 second caches stacked (the hub reads the assets through a 60 s cache
   inside a page rebuilt every 60 s, and the admin, on another build, cannot expire them), so a new size showed only after about 100 s and
   several reloads. The game pages and the daily page now read the stickers on each rebuild (`getLiveStickers`): a saved size shows after the
   page's own 60 s rebuild. The home page keeps its one hour rebuild (its stickers can take up to an hour).

Screenshots before and after (fr and en, desktop 1440 and mobile 390, invented data on a local mock): `docs/o1/evidence/cards/daily-2026-11-17/`.

## Checks

- `tsc --noEmit` and the suites of `components/hub`, `lib/dle`, `lib/photos`, `lib/credits`, the credits pages and the site pages (57 files,
  728 tests): green. No em or en dash in the diff.
- Exact test values changed on the owner's request (listed in the commits): the yesterday line's markup, the stickers read.

## For the owner

Merge. Nothing to apply in the database. For the pictures of the lot 6 idols, run the lot 7 steps (PR #234), whose script cuts the card
files.

Not merged: the owner merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
