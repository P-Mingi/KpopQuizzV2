# MISSION (W7-CLOSE-2 - three small things, then the arc is shut). NO PUSH.

## REPO GUARD
KpopQuizzV2 ONLY. `git remote -v` must be https://github.com/P-Mingi/KpopQuizzV2.git.
Otherwise (nuri / bloom share this bus) execute NOTHING, one line in that repo's
BLOCKED.md, stop.

W7-CLOSE is Cowork-approved (fe8f457). Verse PAUSED. Nothing pushed. 39 commits local.

This is the last mission of the arc, and it is deliberately tiny. Do not widen it. Anything
you find that is not one of these three goes into BLOCKED.md as a candidate and stays there.

## WHAT W7-CLOSE EARNED
You answered the key question with a measurement and the answer saved us a permanent
security cost. Two things stood out: you found the `/rankings` gap by simulation AFTER your
own table sweep had said "all covered", and you reported that your measurement was the thing
at fault. And you refused to switch `getRankingsIndex` to anon, because `duel_votes` reads 0
under anon by design and the site would have shown every ranking as locked. Retracting the
false notification claim from your own BLOCKED entry is the same instinct.

## PART 1 - the simulation was not the CI condition (this is the blocking one)
Your proof ran `SUPABASE_SERVICE_ROLE_KEY=invalid-key-ci-simulation npm run build`. The
committed workflow passes **no such variable at all**. Those are different code paths:

  node_modules/.pnpm/@supabase+supabase-js@2.100.1/.../dist/index.mjs:367
    if (!supabaseKey) throw new Error("supabaseKey is required.");

An INVALID key constructs fine and fails later as a 401, which is why your build was green.
An ABSENT key throws at construction. And `createServiceRoleClient()` is called as a bare
statement, outside any `safeFetch` or try, in two public pages:
  - `src/app/pt/games/page.tsx:36` - has `revalidate = 3600`, no dynamic escape, so it is
    PRERENDERED AT BUILD. The build step throws before a single gate runs.
  - `src/app/blindtest/leaderboard/page.tsx:69` - dynamic (it awaits `searchParams`), so it
    500s per request instead, which the crawlers would then report as a broken page.

Ship the condition you actually proved: put the placeholder in the workflow's `env:`, named
so nobody mistakes it for a credential, with a comment saying why a value that cannot
authenticate is deliberate. Then re-run the CI simulation with the variable ABSENT first, so
you have seen the failure you are fixing, and again with the placeholder.

If you instead want to make `createServiceRoleClient` degrade rather than throw, that is a
bigger change touching every caller - do NOT do it here, write it in BLOCKED.md.

## PART 2 - nothing asserts a floor on the sitemap
Moving the sitemap to anon was right, and it means production output is now governed by RLS.
So a policy change can silently shrink the sitemap, and all three gates stay GREEN, because
each one grades whatever the sitemap says. There is no minimum-count assertion anywhere; I
grepped. That is the same shape as the static-only fallback you correctly called a green
that means nothing, one level up.

Add a floor. Keep it dumb and legible: a committed constant, the gate prints the real count
next to it, and it fails when the count drops below. It must work at BOTH numbers we know
about - 705 non-verse in production, 684 under CI anon - so the floor is a collapse detector,
not a fixture that breaks the day someone publishes a quiz. Say in a comment how to raise it
and why raising it is a deliberate act.

## PART 3 - the alert names the wrong thing
`if: failure()` fires for any failed step, including checkout, install and build, and the
message always says "SEO gates FAILED". The first alert this workflow ever sends would
therefore name the wrong failure. Make it say which step failed.

## STANDING RULES
- Print `pwd` before every gate run.
- Prove against the real condition, not a nearby one. That is the whole content of PART 1.
- Numbers in the REPORT must match the numbers in the proof files.
- Never `git diff` to prove a covenant: it does not see untracked files. Grep the tree.
- Capture exit codes, not just the last line of output.
- No DDL, no deletes, no push. Prepared SQL goes to `docs/pending-migrations/`.
- Proofs in `docs/proofs/w7-close-2/`, committed.
