# REPORT - RENDER-MODE: your hypothesis is right, and narrower than you feared.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every build. Mission `cat`-ed, not `head`-ed. **Read-only: no application code
committed, no DDL, no writes, nothing pushed.** The scratch edit auto-reverted and the source
is verified clean.

Proofs: `docs/proofs/render-mode/`.

---

## PART 1 - the census settles it

Baseline build, source exactly as shipped:

    route-table rows : 366
    static           :   5
    dynamic          : 361

The only five static routes in the entire application:

    /data/knowledge-report-2026/dataset   /llms.txt   /pinterest-feed.xml
    /robots.txt                           /sitemap.xml

Every one is a route handler with an explicit `force-static`. **No page in this app is
static.** 86 files export `export const revalidate`, and exactly **1** of them is static in
the shipped build, and that one is `/pinterest-feed.xml`, a route handler.

So: **every page-level `revalidate` in this app is inert.** Confirmed.

## PART 2 - the cause, established rather than assumed

One line changed in a scratch build, `src/app/layout.tsx:115`, plus its now-unused import:

    const isEmbed = ((await headers()).get('x-pathname') ?? '').startsWith('/embed');
      ->  const isEmbed = false;

| | static | dynamic |
| --- | --- | --- |
| **with** the `headers()` call | **5** | 361 |
| **without** it | **63** | 295 |

Of the 86 routes exporting `revalidate`: **1 static with it, 36 without it.**

**Your hypothesis is confirmed, and it is narrower than "every `revalidate` is dead because
of this line".** The root layout costs **35 pages** their ISR. The other 50 `revalidate`
exports are inert for their own reasons and would stay dynamic even if the layout were
fixed. That distinction matters for PART 4: fixing the layout recovers 35 pages, not 86.

The 36 that recover include `/leaderboard`, `/games`, `/groups`, `/blindtest`, `/data/pulse`,
`/data/knowledge-report-2026`, the games sub-pages and the SEO landing pages. Full list in
the proof.

**The first scratch attempt failed and I am reporting it rather than hiding it**: removing
the call without the import gave `Type error: 'headers' is declared but its value is never
read`. Re-run with both removed, it built clean. The failure is in the proof file.

### Reconciling the contradiction you flagged

Both facts are true at once, and the build output says so directly:

    Generating static pages using 7 workers (0/826)

**826 pages are rendered during the build.** That is where the 401 `q/[slug]` throws came
from, and `q/[slug]` additionally declares `generateStaticParams` (11 routes do) which queries
the DB itself. Next renders the routes at build, encounters the root layout's dynamic API,
and marks them `ƒ`. **The render happens; the output is not reusable.** So the app pays the
build-time DB traffic *and* re-renders per request. It is the worst of both, not evidence of
working static generation.

## PART 3 - the cost, in numbers

Three consecutive requests each, production build, warm process:

| route | req 1 | req 2 | req 3 |
| --- | --- | --- | --- |
| `/leaderboard` | 726ms | 732ms | **710ms** |
| `/games` | 253ms | 287ms | **259ms** |
| `/blindtest` | 138ms | 115ms | **126ms** |
| `/groups` | 26ms | 12ms | 12ms |
| `/data/knowledge-report-2026` | 11ms | 7ms | 7ms |

**The numbers do not fall on repeat.** That is the direct evidence, better than the route
table: an ISR hit would serve request 2 in single-digit milliseconds. Every request
re-renders.

The two heaviest that would otherwise be ISR are **`/leaderboard` at ~720ms** and **`/games`
at ~265ms**, on every single request instead of once an hour. `/groups` and the report page
are cheap because their work is mostly static content, so the recoverable saving is
concentrated in a handful of pages rather than spread across all 35.

## PART 4 - options, not a fix

No implementation, per the mission. Four ways out, with what each costs:

**1. Move the embed detection out of the root layout.** The middleware already knows the
path; it could set a header the `/embed` layout reads, or `/embed` could carry its own
minimal layout. Recovers all 35 pages. The cost is that W4b's guarantee gets re-proven from
scratch: the chrome must be absent from the served HTML *and* the RSC payload, which is the
exact thing that took two attempts to get right the first time.

**2. A route group.** `(site)` and `(embed)` with separate layouts is the idiomatic Next
answer and removes the conditional entirely. I measured this cost in W4b and refused it then:
it relocates every one of ~60 routes. That refusal was endorsed at the time. It is still the
cleanest end state and still the largest diff.

**3. PPR (Partial Prerendering).** Designed for exactly this: a static shell with the dynamic
bit streamed. It is the most modern answer and the least proven here, and it would need its
own measurement pass before I would trust a number from it.

**4. Live with it.** Defensible for 33 of the 35 pages, which cost 7-140ms. It is not
defensible for `/leaderboard` at 720ms per request, and a targeted fix for that one page
alone may be worth more than the site-wide change.

My read, offered as opinion and not measurement: **1 is the right size**, and the honest
sequencing is to fix `/leaderboard` first and confirm the saving is real before touching a
layout that every page depends on.

## On whose miss this is

You wrote that if the `x-pathname` fix cost the site its caching, the miss is yours. I do not
think that is where it lands. The design was sound and the alternative was correctly refused
on cost. What was missing is that **nobody measured the render mode afterwards** — not you
when you approved it, and not me when I built it and then twice looked straight at a `ƒ`
marker (`/pt/games` in W7-CLOSE-2, and again here) and wrote "something downstream opts it
out" without opening the route table that was already in my build log.

The route table was in every build output for weeks. That is the cheap check nobody ran.

## Deviations and flags (loud)

1. **Three full builds this mission** (baseline, failed scratch, clean scratch) plus a fourth
   to restore `.next`, because the scratch build had overwritten it with an artefact that did
   not match the source. Leaving that in place would have made the next session's
   measurements silently wrong.
2. **The 63-vs-5 comparison is from a build with a behaviour change**, not just a compile
   change: `isEmbed = false` means the scratch build renders chrome into `/embed`. It is
   valid for counting render modes and invalid for anything else. Not committed, reverted,
   verified clean.
3. **I did not measure PPR or any option in PART 4.** They are described from the code and
   from prior missions, and option 3 in particular is unmeasured here.

## Covenant

Every number is from a build log or a `curl` against a production build, both preserved in
the proofs. The scratch comparison changed exactly one expression and one import, and the
source file is byte-identical to HEAD afterwards.

---

STOP. **Nothing was pushed.** report pret.
