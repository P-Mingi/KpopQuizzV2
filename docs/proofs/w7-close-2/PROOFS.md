# W7-CLOSE-2 - proofs

`pwd` printed before every gate run. Numbers here are read back from the files beside this
one.

## PART 1 - the CI condition, and a correction to the mission's premise

The mission was right that my W7-CLOSE proof ran the wrong condition: I used an **invalid**
key, the workflow passed **none**, and those are different code paths.

It was **wrong about the consequence**, and I measured rather than agreed.

### A) The variable ABSENT (`part1-ci-condition.txt`)

    BUILD_EXIT=0

The build does **not** die. `supabaseKey is required.` is thrown 414 times during it, and
every one is swallowed by a `safeFetch`:

    401  [q/[slug]      6  [community]     2  [sitemap]
      1  [tot/all]      1  [stats]         1  [rankings]  1  [rankings/meta]  1  [pt/home]

**`/pt/games` is not prerendered.** The build output marks it `ƒ` (dynamic, server-rendered
on demand), so it never runs at build time and cannot fail it. The prediction that "the
build step throws before a single gate runs" does not hold.

What actually breaks is at request time, and it is still worth fixing:

    /pt/games              -> HTTP 500   (and it IS in the sitemap, 1 <loc>)
    /blindtest/leaderboard -> HTTP 500   (not in the sitemap, 0 <loc>)
    /  /blindtest  /quizzes -> HTTP 200  (control)

So with the variable absent the nightly would have run, and reported a **real** failure
caused by its own environment: `check:indexability` flags `/pt/games` as a sitemap URL
returning 500, and `check:orphans` silently loses that page's outbound links because a
non-200 fetch is skipped. A gate blaming the site for its own missing env is worse than a
gate that does not run, because someone would go looking for a bug in the page.

### B) The PLACEHOLDER, which is what the workflow now ships

    BUILD_EXIT=0
    'supabaseKey is required.' occurrences: 0
    /pt/games              -> HTTP 200
    /blindtest/leaderboard -> HTTP 200

The client constructs, its queries fail as 401s inside `safeFetch`, and both pages render
degraded instead of 500. The variable is named `not-a-credential-ci-placeholder` and the
workflow comment says why a value that cannot authenticate is deliberate.

### C) All three gates against that placeholder build

    check:indexability   EXIT=0   36 sampled pages index-consistent
    check:orphans        EXIT=0   floor 684 vs 600; 684 of 684 crawled, complete
    check:metadata-dupes EXIT=1   1 collision group   <- the known w1-ctr / w7-close-1

`check:indexability` samples 36 here versus 34 in the absent-key run, which is the two
formerly-500 pages coming back.

I did **not** make `createServiceRoleClient` degrade instead of throw. That touches every
caller and the mission said not to; it is filed in BLOCKED.md as `w7-close-2-degrade`.

## PART 2 - the floor (`part2-floor.txt`)

`NON_VERSE_FLOOR = 600` in `apps/quiz/scripts/check-orphans.mts`, checked **before** the
crawl, because a collapsed sitemap is not worth crawling and every assertion after it
would grade a fraction of the site while passing.

It has to straddle both real numbers and still catch a collapse:

| condition | count | result |
| --- | --- | --- |
| production (service role, /rankings included) | 705 | passes, prints `705 vs 600` |
| CI (anon only, /rankings excluded by design) | 684 | passes, prints `684 vs 600` |
| static-only fallback, the collapse it exists for | ~41 | would fail |

Proven in both directions. Passing at 684, and failing when the count is below the floor
(temporarily raised to 100000, then reverted):

    Sitemap floor FAILED: the non-verse sitemap has 684 URLs, below the floor of 100000.
    ... Likely causes: the sitemap's DB batch timed out and fell back to static-only
    (~41 URLs), or an RLS policy now hides rows the anon key used to read.
    EXIT=1

The constant carries a comment saying how to raise it and that raising it to hug the
current count would turn a collapse detector into a fixture that breaks the day someone
publishes a quiz.

## PART 3 - the alert names the failing step

Each gate now has a step `id`, and the failure step reads their outcomes:

    check:indexability -> id: indexability
    check:metadata-dupes -> id: dupes
    check:orphans -> id: orphans

The message resolves to one of three things: which gate(s) failed by name, "the app never
started on :3021 (no gate ran)", or "setup failed before any gate ran (checkout, install
or build)". `failure()` still fires for any failed step, but it can no longer call a
checkout failure an SEO gate failure.

Structural check of the workflow: 0 tabs, 0 uses of the `secrets` context inside an `if:`
(it is not available there), 4 step ids, and the placeholder present in `env:`.

## Gates on the real production build

tsc **0** · build **0** · check:routes **0** · check:indexability **0** ·
check:orphans **0** (floor 705 vs 600; 705 of 705 crawled, complete) ·
check:metadata-dupes **unchanged** (8 collision groups, 0 non-verse skips, 997 checked).

`/pt/games` and `/blindtest/leaderboard` both serve **200** in production, confirming the
500s were purely an artefact of the simulated CI environment and not something this
mission introduced.

## Housekeeping

The CI simulations hid `.env.local` to reproduce a runner with no env file. Each ran
through a script with a restore trap, and every run reported `restored: yes`. None of my
backups remain in the tree. The one `.env.local.bak.deadproject` present is from
2026-06-10, predates this session, and is gitignored.
