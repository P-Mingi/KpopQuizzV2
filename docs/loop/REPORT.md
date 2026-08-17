# REPORT - W7-CLOSE-2: the real CI condition, a floor under the sitemap, an alert that names the failure.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every gate run. No DDL, no deletes, nothing pushed. Verse untouched. No title or
meta description edited.

Gates (real production build): tsc **0** · build **0** · check:routes **0** ·
check:indexability **0** · check:orphans **0** (floor 705 vs 600; 705 of 705 crawled) ·
check:metadata-dupes **unchanged** (8 groups, 0 non-verse skips, 997 checked).

Proofs: `docs/proofs/w7-close-2/`. BLOCKED: `w7-close-2-degrade` filed as a candidate.

---

## PART 1 - you were right about the condition, and wrong about the consequence

The catch is real: I proved with an **invalid** key, the workflow passed **none**, and an
invalid key constructs while an absent one throws. I ran the condition I had actually
shipped, and it does not behave as the mission predicted.

**The build does not die. `BUILD_EXIT=0`.** `supabaseKey is required.` is thrown 414 times
during it and every one is swallowed by a `safeFetch`. **`/pt/games` is not prerendered**:
the build marks it `ƒ`, dynamic, so it never runs at build time. It has `revalidate = 3600`
but something downstream opts it out, and the marker is what settles it, not the export.

What does break is at request time, and it still had to be fixed:

    /pt/games              -> HTTP 500   (and it IS in the sitemap)
    /blindtest/leaderboard -> HTTP 500   (not in the sitemap)
    /  /blindtest  /quizzes -> HTTP 200  (control)

So the nightly would have run and reported a **real-looking** failure caused by its own
environment: `check:indexability` flags `/pt/games` as a sitemap URL returning 500, and
`check:orphans` silently drops that page's outbound links because non-200 fetches are
skipped. That is worse than not running, because someone would go hunting for a bug in the
page. Your fix was right; the reason to want it is different from the one stated.

**Shipped:** `SUPABASE_SERVICE_ROLE_KEY: not-a-credential-ci-placeholder` in the workflow
`env:`, with a comment explaining that a value which cannot authenticate is the point.
Re-measured with it: `BUILD_EXIT=0`, **zero** construction errors, both pages **200**, and
all three gates run (indexability 0 at 36 sampled pages, orphans 0 at 684, metadata-dupes
1 collision, the known one).

I did **not** make the factory degrade instead of throw. Filed as `w7-close-2-degrade`.

## PART 2 - the floor

`NON_VERSE_FLOOR = 600` in `check-orphans.mts`, checked **before** the crawl, because a
collapsed sitemap is not worth crawling and everything after it would grade a fraction of
the site while passing.

| condition | count | result |
| --- | --- | --- |
| production (service role, /rankings included) | 705 | passes |
| CI (anon only, /rankings excluded by design) | 684 | passes |
| static-only fallback, the collapse it exists for | ~41 | fails |

Proven both ways: passing at 684 and at 705, and failing when the count is below the floor
(temporarily raised to 100000, then reverted). The failure message names the two causes
worth checking first, the timed-out batch and an RLS change. The constant says how to raise
it and warns that hugging the current count turns a collapse detector into a fixture that
breaks the day someone publishes a quiz.

## PART 3 - the alert

Each gate has a step `id` and the failure step reads their outcomes, so the message
resolves to the gates that failed **by name**, or "the app never started on :3021 (no gate
ran)", or "setup failed before any gate ran (checkout, install or build)". `failure()`
still fires for any step; it can no longer call a checkout failure an SEO gate failure.

## Deviations and flags (loud)

1. **The mission's premise was partly wrong and I said so rather than reproducing it.**
   It predicted a build failure at `/pt/games`. The build is green and that page is
   dynamic. The fix stands on the 500s I measured instead.
2. **Simulating CI meant hiding `.env.local`**, which is a mutation of the working tree.
   Every run went through a script with a restore trap and each reported `restored: yes`.
   None of my backups remain. The one `.env.local.bak.deadproject` in the tree is from
   2026-06-10 and gitignored, not mine, and I checked its mtime before saying so.
3. **My first floor placement was after the crawl.** It would still have failed correctly
   but only after several minutes of crawling a sitemap already known to be broken. Moved
   before the crawl.

## Covenant

Every number here is a measured exit code, HTTP status or row count, read back from the
proof file it is stored in. The 500s, the 414 swallowed errors and the `ƒ` marker are all
observations, not inferences from the code.

## Next

The arc is shut. Two things wait on you: `w7-close-1` (retitle the SEVENTEEN quiz, so the
nightly's first run is green) and, whenever it is wanted, `w7-close-2-degrade`. Also still
open: the partner log, and the frozen blind test per-song stats from W7d.

---

STOP. **Nothing was pushed.** report pret.
