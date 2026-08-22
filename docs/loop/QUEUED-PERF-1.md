# MISSION (PERF-1 - buy back /leaderboard without touching the root layout. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

**`cat` this file. Do not `head` it.**

W5 HOTFIX is Cowork-approved and its refusal to push was the right call. 1 commit local.

## THE DECISION, AND WHY IT IS NOT THE LAYOUT
Your render-mode measurement stands: the root layout's `await headers()` costs 35 pages
their ISR, and the concentrated cost is `/leaderboard` at ~720ms and `/games` at ~265ms on
every request. Your own sequencing note was to fix `/leaderboard` first and confirm the
saving before touching a layout every page depends on. **That is what we are doing, and there
is a second reason you could not have known:**

We are about to send four one-shot pitches to journalists, and the report page is one of the
35. Changing the root layout this week means re-proving the W4b embed covenant (chrome absent
from served HTML *and* the RSC payload, which took two attempts) on the same days a stranger
first clicks our link. Wrong week. The layout gets its own mission after the pitch window.

So: **do not touch `src/app/layout.tsx`.** Fix the cost where it actually is.

## THE ANGLE
`/leaderboard` is 25 lines. It exports `revalidate = 300` and its comment says the design
intent out loud: public sections baked, personal bits as client islands. **The page was
written for ISR and the layout silently took it away.** We are not inventing caching, we are
restoring what the author already asked for, one layer down: cache the DATA rather than the
page, so it works regardless of render mode.

## PART 1 - measure before you touch anything
Where do the ~720ms go? Per query, not per page. `CommunityContent` and everything it calls:
how many DB round trips, which ones dominate, and are any of them sequential that could be
concurrent. Report the list with timings, and the same for `/games` at ~265ms.

If the time turns out not to be in the database, say so and stop before PART 2. A cache is
the wrong tool for a rendering cost, and I would rather this mission end at PART 1 than ship
the wrong fix confidently.

## PART 2 - the safety gate, and it is the one that matters
**Anything cached must be identical for every visitor.**

Before caching a single read, prove that nothing in `CommunityContent`'s server path reads
cookies, the session, `createServerClient`, or any per-user state. The page comment claims
personal bits are client islands. Verify it, do not trust it. If any server-side read is
user-dependent, that read is excluded from the cache and you say which and why.

Getting this wrong serves one visitor's data to another. It is the only irreversible mistake
available in this mission, and it is worth more of your time than the optimisation.

## PART 3 - the fix, smallest form that works
Cache the public reads with a TTL of **300 seconds**, matching the `revalidate` the page
already declares, so the freshness contract does not change. Whatever mechanism you choose,
say why it survives the fact that the route is dynamic.

Do not add a route, a schema change, a dependency or a config flag. Do not "while I am here"
anything.

## PART 4 - prove it, before and after, against a production build
Three consecutive requests each, same method as your render-mode measurement, so the numbers
are comparable to the ones already in the ledger:
  - `/leaderboard` and `/games`, before and after
  - a page you did NOT touch, as a control
  - and state plainly whether requests 2 and 3 get faster. That is the whole point.

Then the four gates. `check:orphans` unscoped, `check:metadata-dupes` unchanged at 8.

## WHAT SUCCESS LOOKS LIKE
`/leaderboard` serves in well under 720ms on repeat, no visitor ever sees another's data, the
root layout is byte-identical to HEAD, and the diff is small enough to read in one sitting.

If the honest outcome is "the cost is real but the fix is bigger than this mission", write
that in BLOCKED.md with the evidence and ship nothing. That answer has been right twice this
week.

## STANDING RULES
- Print `pwd` before every build.
- A mission is not finished until `docs/loop/REPORT.md` describes it.
- If you skip a part, say so.
- Recompute before writing any number in prose.
- No DDL, no database writes, no push.
- Proofs in `docs/proofs/perf-1/`.
