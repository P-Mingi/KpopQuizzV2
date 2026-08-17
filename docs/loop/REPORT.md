# REPORT - W7-CLOSE: CI is real, on the two secrets we already had. No new key.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every gate run. No DDL, no deletes, nothing pushed. Verse untouched. No title or
meta description edited.

Gates (real build): tsc **0** · build **0** · check:routes **0** · check:indexability
**0** · check:orphans **0** (705 of 705, complete crawl) · check:metadata-dupes
**unchanged** (8 groups, 0 non-verse skips, 997 checked).

Proofs: `docs/proofs/w7-close/`. BLOCKED: `w7d-ci` resolved, `w7-close-1` filed.

---

## PART 1 - outcome (b), and the good half of (a) came with it

**The service role key is not needed and is not requested.** Measured table by table,
anon returns identical counts for everything the non-verse sitemap batch reads: quizzes
400=400, groups 88=88, games 24=24, tot_categories 20=20, pulse_reports 1=1, songs
4120=4120. The non-verse sitemap now runs on `createPublicReadClient`, and production
output is byte-identical: **3046 URLs, 705 non-verse, 2341 verse**, verified on a build
with the real environment.

`check:indexability` also dropped to anon. It only reads `quizzes` and `groups`, both
MATCH, and that was the last reason anyone would have needed a key in CI.

**The CI simulation is the proof that matters.** A build with an invalid service role key:
`BUILD_EXIT=0`, Verse skipped with a clean warning, and **zero static-only fallbacks**.
That fallback was the entire risk in my w7d-ci block: before this change the same build
would have emitted ~41 static URLs and any gate on it would have been a lie. It now emits
**684 non-verse URLs** and all three gates run against them.

**What CI does not cover, stated in numbers:** 21 of 705 non-verse URLs (`/rankings` and
its 20 pages, 3%) and all 2341 Verse URLs.

**I found the 21 the hard way, and it corrects my own measurement.** My first sweep used
the table list in the mission and reported that anon covered everything non-verse. The CI
build then produced 684 instead of 705, and the missing 21 were `/rankings`, which
`getRankingsIndex()` builds from `duel_votes`: **0 rows under anon, 60361 under service
role**. RLS is right to hide per-user votes, so I did not switch that call. Doing so
would have made every ranking read as locked on the live site, not just in the sitemap.

`.github/workflows/seo-gates.yml` runs nightly at 04:30 UTC, builds, boots the app, runs
all three gates (each still runs if an earlier one failed), and posts to Discord on
failure. Two bugs fixed before commit rather than on first run: `secrets` is not available
in a step-level `if:` (moved into the shell via `env:`), and the gates were guarded with
`always()`, which would have run them even when the app never booted.

**A correction to my last BLOCKED entry.** `w7d-ci` claimed "6 of the 7 existing workflows
already have failure notification wired". That was **wrong**: my grep matched
`DISCORD_TOKEN`, which is those workflows' own bot credential, not a failure hook.
**No workflow in this repo notifies on failure.** The new one is the first, and it no-ops
cleanly when no webhook secret exists, so it is useful today and louder once one does.

**The nightly will be RED on its first run.** Under CI conditions `check:metadata-dupes`
reports exactly 1 collision: the SEVENTEEN duplicate already filed as `w1-ctr`. Filed as
`w7-close-1`, because a nightly that is red from day one for a known reason is how a team
learns to ignore a red nightly. It is a 30-second admin retitle and then the first run is
green.

## PART 2.1 - deduped, counted not asserted

`getAdvertisablePlaylists` is wrapped in React `cache()`. Counted in one traced build:
**4 call sites invoked, 3 real DB reads**. `/blindtest` asks twice and reads once, which
is the duplicated `songs` pagination gone. Trace lines are env-gated and silent otherwise.

## PART 2.2 - /pt/blindtest

Renders correctly: HTTP 200, h1 present, the same 79-group picker, akmu and taeyang
included. No playlist section added, as instructed.

**Alphabetical is right for that page too, and the old order was worse than "count
descending" sounds.** The previous sort was by *how many songs we happen to have
catalogued* for each group. That is an implementation detail leaking into the UI: it told
users nothing actionable and fronted whichever group we imported most for. The picker is
79 unlabelled name chips with **no search box**, so the only action is hunting for a name,
and alphabetical is the order that makes hunting predictable in both locales.

**Should /pt link its playlists? Yes, eventually.** `/pt/blindtest` is in the sitemap and
links none of the 97, the same shape as the bug W7c fixed on `/blindtest`. Not an orphan
risk today because the English index links them all. Not done here, as instructed.

## Deviations and flags (loud)

1. **You caught a real number mismatch and here is the cause.** W7d's report said the
   playlist read cost "153-253 ms" while `part4-timing.txt` recorded 364/235/256. I quoted
   the exploratory run in prose and then re-ran the script when saving the proof file, so
   the committed artefact recorded a different, slower run. The conclusion held at either
   number, which is exactly why it would never have been caught. Every number in this
   report is read back from the file it is stored in.
2. **My PART 1 measurement was incomplete and the simulation caught it, not me.** I
   measured the tables I was handed instead of asking what else the sitemap calls. The
   21-URL gap is small, but the habit that produced it is not.
3. **A false claim in my last BLOCKED entry**, corrected above and in BLOCKED.md itself.
   I asserted failure notification existed on the strength of a grep that matched a
   different thing entirely.

## Covenant

Every count in this report is a measured row count or a served-HTML count, and the ones
that differ between anon and service role are named with both numbers rather than
summarised. Nothing is estimated.

## Next

The arc is closed. `w7-close-1` (retitle the SEVENTEEN quiz) is the one thing standing
between this workflow and a green first run. Still open and unrelated: the partner log,
and the frozen blind test per-song stats from W7d, which still wants its own mission.

---

STOP. **Nothing was pushed.** report pret.
