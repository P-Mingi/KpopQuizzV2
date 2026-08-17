# REPORT - W5 HOTFIX: the page does not 404 in production. No fix shipped, nothing pushed.

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. `pwd` printed
before every step. Mission `cat`-ed. No DDL, no database writes. **Nothing pushed, because
there was nothing to fix.**

Proofs: `docs/proofs/w5-hotfix/`.

---

## The answer: both URLs are 200 and always were, on this deployment

    https://kpopquiz.org/data/pulse                          200  text/html
    https://kpopquiz.org/data/knowledge-report-2026          200  text/html
    https://kpopquiz.org/data/knowledge-report-2026/dataset  200  text/markdown

The page is 83,811 bytes of real content with the v4 figure `6,257` and the full "What we
cannot say" section. The dataset is **byte-identical** to `docs/data/w5-dataset.md`, 57,370
bytes both sides. `x-matched-path: /data/knowledge-report-2026`, so the route resolves.

## The proof, from Vercel's logs rather than a local build

**The current production deployment is the same one you measured** —
`dpl_CCDqSvtNoEUdXYidd7BExu3YdQcQ`, commit `5b47c6e`. It is still the newest; no redeploy
happened between your 404 and my 200. Same artefact, both results.

404s on that deployment, grouped by path, last 3 hours:

    /sitemap.xml.gz   1

**That is the whole list.** The report paths never 404'd on the live artefact. Its last hour
is 2,350 × 200 against a single 404, and that one is a sitemap variant.

404s on the **previous** deployment, `dpl_UTmPvyyoReCf3HNpjadTXnoSxwrF`, commit `fab3911`:

    /quizzes/new                          8
    /quizzes/most-liked                   7
    /data/knowledge-report-2026/dataset   2
    /wonder-girls-trivia                  1
    /data/knowledge-report-2026           1
    /sitemap.txt                          1

**There they are.** `fab3911` predates the report page entirely, so a 404 from it is correct
behaviour, not a bug. The 404s you saw are logged against the deployment that does not
contain the route.

Your suspicion about `join(process.cwd(), '..', '..', 'docs', ...)` is disproved rather than
untested: the dataset route serves 57,370 bytes of correct markdown from production right
now, so the traced file resolves in Vercel's build exactly as it does locally.

## The loose end I am not going to paper over

The timing does not fully reconcile and I would rather say so than invent a story:

    fab3911 (no report page) deployed : 2026-08-17T14:40:17Z
    5b47c6e (has report page) deployed: 2026-08-17T18:39:29Z
    mission file written              : 2026-08-17T19:41:12Z
    my check returned 200             : 2026-08-17T19:43:20Z

The new deployment was live **about an hour before the mission was written**, so "the alias
had not switched yet" does not cleanly explain a measurement taken at 19:41. What the logs
prove is *which deployment served those 404s*, and it is unambiguous. What I cannot pin is
the minute your external check actually ran. If it ran before 18:39 and the mission was
written up later, everything fits exactly; I have no evidence either way and I am not going
to assert it.

The one detail that argues for a later run is your note that `/data/pulse` already carried
the "See also" link, which only exists in `5b47c6e`. If both checks were in the same pass,
that pass straddled the switch.

## Steps I did not do, and why

**No fix (step 2), no push (step 5).** There is no defect. The mission authorised a push for
a fix; shipping a change to a live site to correct a problem that does not exist would be
worse than doing nothing. If you want the deployment re-promoted or an alias re-pointed, that
is your call and I have not touched it.

**Gates (step 4): I ran one, against production, and skipped the other three.** With no code
change, re-running localhost gates would prove nothing about this incident. Running them
against the live domain does, so that is what I did — see below. `check:orphans` against
production would issue ~708 requests at the live site and `check:metadata-dupes` about 1,000;
I did not fire that at production traffic unasked.

## The real finding, and it is closer to solved than you think

You are right that every green we have reported is a statement about a local build. But the
capability is already there and I proved it rather than costing it:

**All three HTTP gates already read a base URL** — `INDEXCHECK_BASE_URL`,
`METADUPE_BASE_URL`, `ORPHANCHECK_BASE_URL`. Run just now, no code changed:

    INDEXCHECK_BASE_URL=https://kpopquiz.org npm run check:indexability
    -> Indexability guard: 708 sitemap URLs, sampling 37 against https://kpopquiz.org
    -> PASSED, exit 0

So "what would it take" is: **one env var and a job that runs after the deploy**. The cost is
not engineering, it is three decisions:

1. **When it runs.** A post-deploy hook, or the existing nightly pointed at production
   instead of a local build. The nightly is the cheaper start and it already exists.
2. **What it is allowed to hit.** `check:indexability` samples 37 URLs and is harmless.
   `check:orphans` crawls all 708 and `check:metadata-dupes` about 1,000; against production
   that is real traffic and it will pollute analytics unless it is excluded by user agent.
3. **Coverage stays honest.** Against production the anon-key limitation disappears, so the
   gate would cover `/rankings` and Verse too, and the workflow's stated coverage numbers
   would need rewriting to match.

Not built, per the mission.

## Deviations and flags (loud)

1. **The mission's premise did not hold, so most of its steps did not apply.** I did not
   diagnose a cause, fix it, or push, because the evidence says there is nothing wrong. That
   is the honest outcome and it is stated plainly rather than dressed as work.
2. **I could not fully explain the timing**, only which deployment served the 404s. Section
   above.
3. **One 404 does exist on the live deployment**: `/sitemap.xml.gz`, one request in three
   hours. Not investigated, not in scope, and flagged only so it is not a surprise later.

## Covenant

Every status code here is from `curl` against `https://kpopquiz.org`, and every log figure is
from Vercel's runtime logs for a named deployment id. Nothing in this report is from a local
build, which is the rule this mission exists to enforce.

---

STOP. **Nothing was pushed, and nothing was fixed, because nothing was broken.** report pret.
