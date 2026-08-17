# MISSION (RENDER-MODE - is every `revalidate` in this app dead? READ-ONLY. NO push.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

**`cat` this file. Do not `head` it.** Your own correction, and it is the reason it is here.

Graphify PART 0 is Cowork-approved. The override is placed in the project `CLAUDE.md` and
`docs/PLAY-GRAPHIFY-DOCTRINE.md` is updated. 6 commits local, nothing pushed.
**Read-only: no application code, no DDL, no writes, no push.**

## THE QUESTION, AND WHY NOW
This has been open since W7-CLOSE-2 and it is the last unmeasured technical item on the
board. You found that `/pt/games` is marked `ƒ` despite exporting `revalidate = 3600`, and
wrote "something downstream opts it out" without naming it.

My hypothesis, and it is only that: `app/layout.tsx:115` awaits
`(await headers()).get('x-pathname')`. A dynamic API in the ROOT layout opts routes out of
static rendering. If that is what is happening, **every `export const revalidate` in this
app is inert** and every page pays a DB round trip per request rather than once an hour.

Contradicting evidence, which is why this is a measurement and not a conclusion: the
absent-key run recorded 401 build-time `supabaseKey is required.` throws from `q/[slug]`,
which means those routes executed at build. Both cannot be simply true.

**And that root layout is my fix.** I approved the `x-pathname` middleware solution to keep
the chrome out of `/embed`. If it cost the whole site its caching, the miss is mine and it
has been running for weeks.

The timing matters: we are about to point four journalists at this domain. TTFB is not the
reason a story gets written, but it is a real ranking input and a real bill, and pitching
traffic at a site that renders every page cold is a bad order of operations.

## PART 1 - the census
Build, and read the route table. Report the counts of `○` static, `ƒ` dynamic and anything
else, and list which of the pages that export `revalidate` are actually static. That single
table settles the hypothesis without any theory.

## PART 2 - if they are dynamic, prove WHY
Do not stop at "the layout does it". Establish it: does removing the `headers()` call from
the root layout in a scratch build flip routes to static? Do NOT commit that change - build
it, read the table, revert. If the cause is something else entirely, name that instead; I
would rather be wrong with evidence than right by assumption.

And reconcile the contradiction: if the app is fully dynamic, explain the 401 build-time
throws from `q/[slug]`.

## PART 3 - what it costs, in numbers not adjectives
If `revalidate` is inert: how many pages export it, and what does a cold render of the two
heaviest actually cost? You already measured `getAdvertisablePlaylists` at 235-364 ms. Per
request instead of per hour is the difference between a rounding error and a bill.

## PART 4 - options only, no fix
If it is real, give me the ways out with their trade-offs - moving the embed detection out
of the root layout, a route group, PPR, or living with it. **Do not implement any of them.**
The fix touches every page in the app and it gets its own mission with its own before and
after.

## STANDING RULES
- Print `pwd` before every build.
- `cat` the mission.
- A mission is not finished until `docs/loop/REPORT.md` describes it.
- If you skip a part, say so in the report.
- The graph does not answer runtime questions. Doctrine, and this mission is the example.
- No writes, no DDL, no push. Proofs in `docs/proofs/render-mode/`.
