# Review R, lot b, lane P1: the passport on otakuquiz.org (one pass, blockers only)
Read-only review of `git -C /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-P1 diff o1/integration...o1/P1`.
Write only docs/o1/reviews/P1.md inside /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1 and do not commit it (ORCH does).
Never open ~/kpq-o1/secrets, never write a database, never push, no connector, no supabase, vercel or gh.
## A blocker is only one of these
1. GET /auth/confirm or POST /api/passport/after-signin: an open redirect (next, returnTo), a session for the wrong user, a banned user
   kept signed in, a token_hash usable twice or logged, a route reachable on kpop, ensure_membership called with an attacker-chosen site.
2. A member page (/u) or any read made with the service role that returns a column outside the public list, or a member with no
   activated membership on this site, a banned one, or a private field (email, sign-in methods).
3. A write (favourite_characters, follows, header, settings, onboarding, create_profile_for_site) that can act for another user, write a
   kpop row from the anime site, or bypass RLS with the service role where the user's own client should be used.
4. Sign-out that leaves a session behind on the anime site, or changes the kpop sign-out.
5. An oshi pick above the reader's spoiler progress that is accepted, or a spoiler-tagged name leaked into HTML before the shield allows it.
6. Any kpop route, query, argument or render tree that differs from o1/integration (check the snapshots made from the base are really
   from the base: they must not be rewritten from head).
Anything else (style, naming) is not a blocker: at most 5 lines of notes.
## Output
docs/o1/reviews/P1.md: PASS or BLOCKED, then each blocker with file:line, why, and the smallest fix. Hand back at most 8 lines.
