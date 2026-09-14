# REPORT - GAMES HUB REDESIGN: setup + recon done, build NOT started. This is NOT report-pret.

Repo guard OK (origin = P-Mingi/KpopQuizzV2). Branch `feat/games-hub-redesign` off main (ba1aaf1).
Honest status: I completed the setup and full recon and mapped the data-honesty plan, but I did NOT
build the redesign. A pixel-fidelity mission audited by pixel diffs must not be rushed; I am stopping
at the clean pre-build boundary and reporting, per the mission's own rule, rather than shipping
unaudited pixel work. Do not read this as done.

## Done
- Branched `feat/games-hub-redesign` from main. `feat/tierlist-social` (unpushed e93315d, the OG
  share-card sizing fix from earlier this session) left untouched, as instructed.
- Read the whole mission + `docs/design/games/README.md`; viewed all three oracles (Main 1440,
  Mobile 390, CardAnatomy) and the card build notes.
- Understood the existing data + components: `getGamesData` (`unstable_cache` 3600s: rankings,
  personalityGroups, songCount, nameAllCount), `counts`, `liveRanking = pickDaily(publicRankings)`;
  the current `GamesHub` (gh2-*) + `blind-streak`, `hub-last-played`, `pt/games`.
- Versioned the pixel source of truth (`docs/design/games/`) on the branch.

## Data-honesty findings (what CAN ship real, per the README SAMPLE list)
- "N fans playing today": FEASIBLE and real. The `plays` table has `created_at` (used by
  pulse/compute), so a 24h count is a cheap indexed read; it will be added INSIDE `getGamesData`
  (cost fence: no new per-request read, no API).
- This or That "N votes": real from `liveRanking.total_votes` (no "today" suffix).
- Mode-count chips (Name Them All, Sort It, Match-Up, This or That): real from `counts`.
- Band answer chips: real song titles from a small cached list added to `getGamesData`, picked
  deterministically per UTC day with `pickDaily`, excluding today's actual daily answers.
- "Notify me" (K-pop Idle): NO notify/subscribe/newsletter mechanism exists in the repo, so it will
  render as non-interactive "Coming soon" in that slot (no dead button), as the mission directs.
- STILL OPEN: the real Sort It round length and Match-Up board time are NOT in the playlist configs
  (`lib/games/sort-it.ts`, `match-up.ts` hold only blurbs); they live in the game player runtime and
  must be located before those stat lines can ship real (otherwise they would be sample values).

## Not started (the actual mission)
- PART A: rebuild `GamesHub` + CSS pixel-for-pixel (header + 2 chips, dark daily band with the
  countdown + CSS waveform + answer chips, filter chips + client filter, the 8 real-face cards, the
  ranking strip) at 1440 and 390.
- PART B: JSON-LD gains Tier Lists after Duel; keep metadata/canonical/hreflang + crawlable cards.
- PART C: assess whether the blindtest player can lazy-mount in the band on tap with zero load cost;
  otherwise keep "Play today's" as a link to /blindtest and defer MidPlay. NOT assessed yet.
- Tests (e2e desktop + mobile, unit), pixelmatch proofs at both viewports, CI green, the proof
  battery. None done.

## The one gate
This mission needs a focused build pass; it is not complete and must not be pushed or called
push-ready. Nothing was pushed. `docs/loop/queue/MISSION-cost.md` stays parked, untouched.
