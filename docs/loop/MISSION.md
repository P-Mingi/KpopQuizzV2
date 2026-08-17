# MISSION (W7d - make the gates real, collapse the last divergent surface). NO PUSH.

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

W7c is Cowork-approved (84182a5). Verse PAUSED. Nothing pushed. 37 commits local.

## WHAT W7C EARNED
The scope flag is gone, the gate fails on an injected orphan, the crawl is complete, and
the phantom-orphan finding was the best work of the arc: you nearly fixed eight problems
that did not exist and you checked first. `/data/pulse/2026-07` not being removed, and
`/guess-the-kpop-idol` not getting a second link, are both right for the same reason.

This mission is what the audit found underneath it.

## PART 1 - a gate nobody runs is a document (the big one)
`.github/workflows/` contains seven files: birthdays, daily-quiz, indexnow, leaderboard,
news, setup, youtube. All content crons. **NONE of the three gates runs anywhere.**
`check:indexability`, `check:metadata-dupes` and `check:orphans` exist only as package
scripts a human remembers to type. We have spent three missions building assertions that
cannot fail a push.

Fix the ones that can honestly be automated:
- Write a workflow that runs the gates against a built, running app.
- `check:orphans` at 679 fetches is slow and you already said it belongs in a nightly.
  Agreed: nightly (schedule), not on push. `check:indexability` and
  `check:metadata-dupes` are cheaper - measure them and put them wherever they honestly
  fit; if either is also too slow for push, say so and put it in the same nightly rather
  than inventing a faster but weaker assertion.
- A failing nightly must be VISIBLE. If a red nightly nobody looks at is the likely
  outcome, say so and propose how it surfaces.

**BLOCK, do not guess:** these gates need a running server and DB credentials. Check what
secrets the repo actually has. If the env is not there, do NOT stub the check, do NOT
point it at production, do NOT fabricate a workflow that will fail on first run. Write
exactly what is missing in BLOCKED.md and stop that part.

## PART 2 - "one definition" is two surfaces out of three
The report says the sitemap and the index cannot drift again. True. But the picker on the
SAME PAGE still uses its own rule: `src/lib/db/queries/blindtest.ts`,
`MIN_SONGS_FOR_GROUP = 15`, no clip condition. Measured consequences of two rules on one
page:
- **akmu (11 songs) and taeyang (13)** are now advertised in the sitemap and linked on
  `/blindtest`, and the picker on that same page does NOT offer them.
- The **23 playable-but-unadvertised** playlists you flagged in Next are the mirror image:
  offered by the picker, linked by nothing, in no sitemap.

You moved the drift, you did not remove it. Collapse the third surface onto
`blind-test-playlists.ts` too, or state in the report why the picker must keep a different
threshold - a real reason, not the comment already in the file.

## PART 3 - the clip condition may have no runtime meaning
`getAdvertisablePlaylists` requires clip-ready rows in `blind_test_songs`. I traced the
game: `/blindtest/group-X` -> `blind-test-player.tsx` -> `/api/blind-test/generate`, which
reads **`songs`** and re-fetches Deezer previews. `blind_test_songs` is read by admin, by
`/verse/*`, by `/api/blind-test/modes`, and by the stats loop in `/api/blind-test/play`.
**Nothing in the group blind test path consults it.**

If that holds, then `hasClips` excludes 23 fully playable playlists on a criterion the game
never checks, and the justification in the file ("advertised-basis: it has clip-ready
rows") is circular - it is advertisable because the old sitemap advertised it.

MEASURE IT, do not reason about it: pick a group that has >= 10 clean `songs` rows and NO
`blind_test_songs` clip rows, hit `/api/blind-test/generate` for it locally, and report
whether a full round comes back. Then either drop the clip condition and advertise the 23,
or keep it with the runtime reason written down. Both are fine. Guessing is not.

## PART 4 - the sitemap batch got more expensive inside a 15s race
`sitemap.ts` races the dynamic batch against `SITEMAP_BATCH_TIMEOUT_MS = 15000`, and on
timeout it emits a **static-only sitemap** - every quiz, group and playlist URL gone. W7c
replaced one capped query (`limit 5000`, one round trip) with `getAdvertisablePlaylists`,
which paginates `songs` AND `blind_test_songs` sequentially inside that same race.

Not observed failing. The blast radius is total, so measure rather than assume: time the
sitemap route cold, report the batch duration and the playlist read's share of it. If it
is a meaningful fraction of 15s, cache the playlist set (it changes when songs are
imported, not per request) or move it out of the raced batch with its own fallback, so a
slow playlist read costs the blindtest URLs and not the whole sitemap.

## PART 5 - report only, no fix without evidence
`/api/blind-test/play` updates per-song stats by selecting `blind_test_songs` by the ids in
`body.choices`, but those ids come from `/api/blind-test/generate`, which selects from
`songs`. If the two tables do not share an id space, `if (!song) continue` means
`times_played`, `times_correct` and `avg_answer_time` have been silently frozen. Check
whether the ids match. Report what you find. Do NOT fix it in this mission - if it is
real it is its own mission with its own before/after.

## STANDING RULES
- Print `pwd` before every gate run. Two near-misses came from a cwd reset making a
  command that never ran look like a clean result.
- Anything that must be ABSENT is proven against the served HTML of a production build.
- Never `git diff` to prove a covenant: it does not see untracked files. Grep the tree.
- Capture the exit code, not just the last line of output. `gate-GREEN-unscoped.txt` ends
  with `EXIT=` and nothing after it.
- No DDL, no deletes, no push. Prepared SQL goes to `docs/pending-migrations/`.
- Proofs in `docs/proofs/w7d/`, committed.
- When you are unsure which of two honest options applies, BLOCK and say so. Every time
  you have done that this arc it was the right call.
