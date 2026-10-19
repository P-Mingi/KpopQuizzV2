# Lot (c), part 2, lane LC: the passport in the app (one account across the three sites)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-LC, branch o1/LC (part 1 already put SQL 003 to 008 there and on
o1-scratch). Q = apps/quiz/src, S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1. Read this brief, the code
you change, Q/lib/passport/types.ts, Q/lib/site/registry.ts, and the SQL 003 to 008 signatures (grep them); nothing else.
## Rules
- Never push, never touch production, never use a connector or the supabase, vercel or gh commands. Never open ~/kpq-o1/secrets; never
  print a URL with a key, a token, a code or a ticket. Database writes only on o1-scratch (S/env.sh scratch -- <command>).
- Never edit tests, gates, docs/o1/contracts, scripts/o1, Q/middleware.ts, apps/quiz/next.config.ts, vercel.json,
  Q/app/api/quiz/create/route.ts, Q/app/api/cron/ensure-daily-quiz/route.ts. No en or em dash, no emoji.
- kpopquiz.org stays byte for byte: every kpop call keeps today's arguments; with the flag off nothing new is reachable.
## The jump (flag PASSPORT_JUMP, server env, default off)
Chain: source site GET /auth/passport/out?to&next&via mints a ticket and 302s to the target's /auth/arrive?from&next&t[&via]; the target
sets the transaction cookie and 302s to the identity site's GET /auth/authorize?client&state&code_challenge&method=S256&prompt=none,
which, when the user is signed in there, issues a one-time code (passport_issue_code) and 302s to the target's GET /auth/land; land is a
tiny HTML page (CSP nonce, no layout, Referrer-Policy no-referrer) that posts the code from the URL fragment to POST /api/passport/redeem;
redeem checks state and PKCE, calls passport_redeem_code, makes the session with the service role (generateLink magiclink then verifyOtp,
no email sent), then rpc ensure_membership(<site>, 'jump', via), and answers the next path (same origin only, through safeReturnTo).
- Files: Q/app/(site)/auth/passport/out/route.ts, Q/app/(site)/auth/arrive/route.ts, Q/app/(site)/auth/authorize/route.ts,
  Q/app/(site)/auth/land/route.ts, Q/app/api/passport/redeem/route.ts (shared by the 3 builds; each reads SITE.id first and 404s
  outside its sites). If the anime or hub build does not reach Q/app/(site)/auth, add the thinnest re-export under
  Q/app/sites/[site]/auth/... that imports the shared handler (rule 18: never a copy).
- Flag off: out 302s to the target page signed out, arrive 302s to next, authorize, land and redeem answer 404.
- Q/lib/passport/ticket.ts: HMAC-SHA256 with PASSPORT_TICKET_SECRET (same on the 3 sites), domain labels in one MAC_LABELS constant;
  ticket valid 10 minutes, code 60 seconds; PKCE S256; client IP hashed with NET_IP_HASH_SALT. Missing secret = the flag is off.
- Cookies: `__Host-pp_tx` on https, `pp_tx` only on http localhost or *.localhost; HttpOnly, SameSite=Lax, Path=/, Max-Age=300, no Domain,
  Secure on https. No other new cookie. Sessions stay per host.
- Q/lib/auth/return-to.ts: safeReturnTo gains an optional third param `site` (origin from the registry); without it, today's result.
- Outcomes logged with passport_log_event: ok, replay, pkce_fail, state_mismatch, expired, open_redirect, banned, unconfirmed,
  other_user (409 when another user is already signed in on the target), no_session (crawler or signed out at the identity site).
## Per-site XP and profile
- Q/lib/passport/xp.ts awardXpForSite(site, ...): kpop calls rpc award_xp with today's exact arguments; anime and hub call
  award_world_xp. Switch the callers in Q/app/api/quiz/[id]/play/route.ts and Q/app/api/game/[id]/play/route.ts.
- Q/lib/network/profile.ts profileForSite(profile, membership, site): pure; on kpop it returns the same object as today.
- Q/lib/constants.ts getLevelInfo(xp, site?): optional site, kpop result unchanged.
- Q/lib/daily-streak.ts: anime branch reads and writes world_memberships; kpop path unchanged. Q/lib/badges/award.ts scoped with forSite.
- Q/app/api/passport/merge-anon/route.ts passes p_site only off kpop. Q/app/api/auth/create-profile/route.ts: non-kpop branch calls
  create_profile_for_site; kpop insert unchanged. Call ensure_membership on the first anime write of a user.
## Checks (all must pass; never weaken a test)
1. Unit tests next to the code: ticket (sign, verify, expiry, tamper), PKCE, the cookie name per protocol, safeReturnTo with site,
   profileForSite on kpop equals today's object, awardXpForSite argument shapes, each route with the flag off (404 or 302 as above), and
   each outcome of the list above on the handlers with a mocked Supabase. `pnpm -C apps/quiz exec vitest run <your tests>` green, and
   `pnpm -C apps/quiz exec vitest run src/lib/auth` green (return-to.test.ts untouched).
2. One end-to-end proof on o1-scratch, two local servers (read S/dev-multi.sh header for usage, flag on, local secrets you generate for
   the run only): a fixture account signed in on the kpop server follows /auth/passport/out?to=anime&next=/&via=k.menu and lands signed in
   on the anime server; then world_memberships has its anime row with joined_via 'jump' and via_code 'k.menu'. Spec in
   apps/quiz/e2e/o1/LC/jump.o1.ts; evidence (outcome, rows, no secret) in docs/o1/reports/LC/jump.md.
3. `pnpm -C apps/quiz exec tsc --noEmit` 0 errors; `S/check.sh $PWD` ok.
Commit on o1/LC ("o1: LC ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: last sha, files changed (count), the checks with results, what is left unspecified and what you decided.
