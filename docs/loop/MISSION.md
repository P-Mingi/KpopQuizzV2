# MISSION (W5 HOTFIX - the report page 404s in PRODUCTION. NO push until I audit.)

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

**`cat` this file. Do not `head` it.**

Render-mode is Cowork-approved and the finding is excellent. This mission is unrelated and
it is urgent: **the report is live-linked and unreachable.**

## WHAT I MEASURED FROM OUTSIDE, JUST NOW

    https://kpopquiz.org/data/pulse                          200, loads
      and it contains: "See also The K-pop Knowledge Report 2026"
      linking to https://kpopquiz.org/data/knowledge-report-2026

    https://kpopquiz.org/data/knowledge-report-2026          404
    https://kpopquiz.org/data/knowledge-report-2026/         404
    https://kpopquiz.org/data/knowledge-report-2026/dataset  404

The Vercel production deployment `dpl_CCDqSvtNoEUdXYidd7BExu3YdQcQ` is **READY**, target
production, commit **5b47c6e**, which contains all of this work. `/data/pulse` serving the
link proves the deployed build includes the PART 1 changes. So the route is in the build and
it 404s anyway.

**This is the exact scenario the pitch could not survive.** Four journalists, one shot each,
two links, both dead. Nothing goes out until this is green in production.

## WHAT I RULED OUT, SO YOU DO NOT REDO IT
- **Not the route allowlist.** `src/lib/route-allowlist.ts:60` carries `'/data'`, which
  covers this path by `startsWith`, and `/data/pulse` proves that prefix works.
- **Not a failed deploy.** State is READY on the right commit.
- **Not a stale alias**, unless the `/data/pulse` copy predates PART 1, which it does not.

## WHAT I SUSPECT, AND IT IS ONLY A SUSPICION
`dataset/route.ts:18` reads `join(process.cwd(), '..', '..', 'docs', 'data',
'w5-dataset.md')` with `force-static`. That path is resolved relative to the build's cwd and
reaches OUTSIDE the app directory. It works locally. Whether it resolves the same way in
Vercel's build, and whether the file is traced into the deployment, is the first thing I
would check. If that route fails, find out whether it can take the page's segment down with
it.

Do not stop at my suspicion. **Get the actual status code and the actual error**, from
Vercel's runtime logs and build logs for that deployment, not from a local build. A local
build cannot reproduce this: our own `check:orphans` crawled 706 URLs green against
localhost while production was serving a 404 on one of them.

## THAT LAST SENTENCE IS THE REAL FINDING, AND IT NEEDS FIXING TOO
Three gates grade `http://localhost:3021`. Production is a different artefact, built
differently, on a different filesystem. **Every green we have ever reported is a statement
about a local build.** Report what it would take for at least `check:indexability` to run
against the live domain after a deploy, and what it would cost. Do not build it in this
mission.

## THE JOB
1. Diagnose from production evidence. Name the cause with the log line that proves it.
2. Fix it, minimally. This is the one mission where shipping matters more than elegance.
3. Prove it against **the live domain**, not localhost: both URLs 200, the dataset serving
   markdown byte-identical to `docs/data/w5-dataset.md`, and the `/data/pulse` link resolving.
4. Re-run all four gates.
5. **You may push for this one**, because a fix that sits unpushed fixes nothing and the
   live site is currently linking to a 404. Push only after step 3 passes locally, and say
   in the report exactly what you pushed. Then I verify the live domain myself.

If the cause turns out to be something that cannot be fixed in a small diff, STOP, write it
in BLOCKED.md with the evidence, and do not push.

## STANDING RULES
- Print `pwd` before anything.
- A mission is not finished until `docs/loop/REPORT.md` describes it.
- If you skip a part, say so.
- Prove against the served response of the real thing. That rule was written for a
  production build; this mission is why it has to mean the production DEPLOYMENT.
- No DDL, no database writes.
- Proofs in `docs/proofs/w5-hotfix/`.
