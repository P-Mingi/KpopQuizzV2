# W7b - the A-Z directory and the orphan gate

All numbers below are from the SERVED HTML of a production build on :3021.

## 1. The directory contains every group with a published quiz

`directory-vs-sql.txt`:

    SQL says groups with >=1 published quiz: 37
    directory links to distinct group hubs:  37
    MISSING from the directory: 0
    EXTRA (linked but no published quiz): 0
    37 link instances for 37 hubs      <- each group linked exactly once
    COUNT MISMATCHES vs SQL: 0

**The count source matters.** `groups.quiz_count` is denormalised and counts unpublished
rows. It disagrees with reality on 4 of 37 groups, and the page shows the true number:

| group | groups.quiz_count | rendered | real published |
| --- | --- | --- | --- |
| bts | 30 | **27** | 27 |
| blackpink | 27 | **22** | 22 |
| stray-kids | 27 | **26** | 26 |
| artms | 5 | **4** | 4 |

Had the directory trusted the denormalised column it would have advertised "30 quizzes"
above a list of 27.

Generation is shown only where recorded: 2 x 2nd Gen, 12 x 3rd Gen, 12 x 4th Gen,
4 x 5th Gen, and **7 groups show no generation tag at all** rather than a guessed one.

## 2. The 11 formerly orphaned hubs now have an inbound link

`inbound-after.txt`, counted in the served HTML of /groups:

    /akmu-quiz 1 · /loona-quiz 1 · /kickflip-quiz 1 · /xikers-quiz 1 · /loossemble-quiz 1
    /artms-quiz 1 · /treasure-quiz 1 · /tws-quiz 1 · /monsta-x-quiz 1
    /dreamcatcher-quiz 1 · /astro-quiz 1

## 3. The home page links the directory

    href="/groups" on /: 1
    anchor text: "All K-pop groups →"

Descriptive anchor, not "click here". Both capped surfaces (rail slice(0,10), pills
slice(0,13)) now point at the directory instead of /quizzes.

## 4. The gate, RED then GREEN

**RED, before the directory existed** (`gate-RED-before.txt`, run against the previous
production build): 71 orphans named by URL, including 7 group hubs.

**After** (`gate-unscoped-after.txt`): 64 orphans, and **zero group hubs**. The delta is
exactly the class the directory closed.

**GREEN on that class** (`gate-scoped-GREEN.txt`):

    ORPHANCHECK_SCOPE='^/[a-z0-9-]+-quiz$' npm run check:orphans
    Orphan gate passed: every IN-SCOPE sitemap URL of the 682 non-verse ones has at
    least one inbound internal link from the 198 crawled pages.

**And the scoped gate still fails when it should** (`gate-scoped-RED-injected.txt`),
so the pass above is not the scope hiding a failure:

    ORPHANCHECK_SCOPE='^/[a-z0-9-]+-quiz$' ORPHANCHECK_INJECT='/nobody-links-here-quiz'
    Orphan gate FAILED: 1 sitemap URL(s) ...
      x /nobody-links-here-quiz

Inbound links are always counted from the full crawl; `ORPHANCHECK_SCOPE` only narrows
what is asserted on, so a scoped run cannot manufacture a pass by ignoring links.

## 5. The crawl boundary, stated in the gate's own output

Every run prints it, pass or fail:

    Orphan gate: 682 non-verse sitemap URLs, crawled 198 of 198 sampled pages
    ... Because the crawl SAMPLES (198 of 682 URLs), this is a FLOOR on inbound links,
    not a proof of zero: a page listed here could still be linked from a page outside
    the sample.

Offenders are always listed by URL, never as a bare count.

## 6. Gates

tsc 0 · build 0 · check:routes 0 · check:indexability **0** (run against a RUNNING
server this time) · check:metadata-dupes **unchanged**: still exactly 8 collision groups,
0 non-verse skips, and `/groups` appears in none of them. Checked URLs went 971 -> 975.
