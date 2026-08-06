# /caveman report - PUSH-GATE-1: DONE (PG-1 + PG-2), PG-3 was a no-op (flagged)

Built the VERSE_PUBLIC fail-closed hide + teaser (PG-1), captured the local-prod head
snapshots (PG-2), and ran the games merge (PG-3 = already up to date - see the flag below).
Precondition met first: tsc clean on main, games chat moved to .worktrees/play-games, single
writer again. Nothing pushed.

## PG-1 - the VERSE_PUBLIC switch (committed b77795a)

Fail-closed: VERSE_PUBLIC absent or not 'true' => the Verse is HIDDEN.
- `visibility.ts` (edge-safe, no Supabase): verseHidden(), isGatedVersePath (all /verse/* +
  /build/* + verse admin queues; allowlist = /verse teaser + /verse/promises covenant),
  hasAuthCookie (sb-*-auth-token presence).
- middleware: anonymous (cookieless) hit on a gated Verse route -> 302 /verse. No Supabase
  call (the edge-timeout law holds). 302 parks the SEO equity ("coming back", not 410).
- roles.ts isVersePrivileged() = admin OR curator/space_admin of any space. /verse serves the
  teaser to everyone else; /verse/[slug]/layout redirects a signed-in non-curator (belt+braces).
- verse-teaser.tsx: "The Verse is being built" + the covenant + games links, verse tokens,
  light/dark. The one Verse page that stays indexable.
- sitemap: hidden => only /verse + /verse/promises; every other Verse URL dropped.
- Pure short-circuit: flag true => verseHidden() false => zero changed code runs => today's
  behavior. .env.local sets VERSE_PUBLIC=true so local dev + gates are unaffected.

PG-1 proofs (docs/proofs/push-gate-1/):
- probe-anon.txt / probe-prodbuild.txt: anonymous, on BOTH the dev server and the real
  production build - /verse/bts, /verse/bts/members/jungkook, /verse/bts/community,
  /verse/bts/discography, /build, /build/bts, /admin/space-images, /admin/member-review,
  /admin/verse ALL 302 -> /verse; /verse + /verse/promises 200; /games untouched.
- curator-and-sitemap.txt: owner session sees the REAL pages (spaces, members, the real
  /verse directory - not the teaser); sitemap = 2 verse routes hidden vs 2097 flag-true.
- flag-true-parity.txt: the switch is a short-circuit, flag true = byte-identical; empirical
  /verse/bts 200 real, full sitemap returns.
- teaser screenshots light + dark captured in-session (good contrast both, the ink floor holds).
- gates: tsc 0, routes 342, verse-tokens clean, em-dash clean.

## PG-2 - head snapshots (docs/proofs/push-gate-1/heads-local.txt)

Real LOCAL PRODUCTION BUILD (next build + next start, VERSE_PUBLIC hidden - exactly what prod
will run). The build SUCCEEDED (buildability confirmed, beyond tsc; check:routes + verse-tokens
run inside `npm run build`). Captured title / description / canonical / robots / og:title /
JSON-LD @type for: / , /games, /blindtest, /games/name-them-all, /games/sort-it, /quizzes,
/rankings, /pt/leaderboard. Raw, for Cowork to diff against LIVE PROD.
- One observation for Cowork (out of my V-BUILDER scope, a games/pt surface): several titles
  carry a DOUBLED suffix "... | KpopQuiz | KpopQuiz" (/blindtest, /rankings, /pt/leaderboard).
  Worth checking against prod - likely a title-template regression in the games batch.

## PG-3 - merge play-games: ALREADY UP TO DATE (flag for the owner)

`git merge play-games` -> "Already up to date." play-games (f860d32) is an ANCESTOR of main
(it is main~1); the worktree is clean; there is NO divergent games batch to merge - the games
work is already on main. This is NOT a conflict (so not a hard block), and the post-merge gates
all pass on the current main. BUT: if the games chat still has a batch to ship, it has not been
committed to play-games yet - the owner should confirm the games work is complete on main before
the push, or advance play-games and re-invoke PG-3. Detail in docs/proofs/push-gate-1/merge.txt.

## STOP

PG-1 committed (b77795a); PG-2 + PG-3 proofs written; this report filed. Nothing pushed - the
owner sets VERSE_PUBLIC=false in Vercel Production, Cowork audits heads vs prod, the owner pushes.
Step 5 + receipts R-A/R-B run after the push (unchanged spec).
