# /caveman report - PUSH-GATE-1b: reconcile DONE (owner rulings A-D applied), gate re-proven

Applied the owner's A-D rulings (L-084) to the `origin/main` merge, re-proved the gate at the
merged tip, and left main STRICTLY ahead of origin/main so the owner's push is a clean
fast-forward. Nothing pushed.

## 1b-2 - the merge (commit ae93720, "merge: reconcile origin/main (push-gate-1b, owner rulings A-D)")

Re-ran `git merge origin/main`; 19 conflicts, resolved EXACTLY per the rulings:
- A) games/home/mobile (games-hub, match-up/sort-it players + [slug] pages, name-them-all,
  home-group-pills, mobile-top-bar) -> LOCAL. Removed remote's net-new game-preview.tsx +
  games-spotlight.tsx (backlog per A) AND the orphaned game-mode-card.tsx + gotd-ui.ts that
  only referenced them (local's self-contained hub imports none of the cluster; nothing kept
  references them - verified 0 imports).
- B) styles/globals.css -> UNION. Kept local's carousel-arrow/trending/quiz-row blocks + the
  Verse block; remote's non-conflicting games/badges/mobile CSS auto-merged in. Remote's `.bcoin`
  block was a DUPLICATE of local's already-present `.bcoin` (globals.css:812) - dropped the dup
  (no duplicate selectors), so the audited local badge coin styling is the single source.
- C) SPLIT: /u + /me 520-col alignment -> REMOTE (a fix local never had). Badges system
  (badge-icon, badge-grid, badges.ts) -> LOCAL (V-UPGRADE-1; local badges.ts already exports the
  full rarity API that badge-coin.tsx consumes). Remote's 5-tier rarity LOOK -> BACKLOG.
- D) Pinterest pipeline (question-pin*, generate route/script) -> REMOTE. Regenerating the
  manifest/csv against the current DB TIMED OUT (>3 min over ~2900 quizzes in this sandbox), so
  per the ruling's fallback I shipped remote's committed artifacts as-is - FLAGGED: manifest/csv
  reflect P-Mingi's Aug-3 catalog, not today's; re-run `npx tsx scripts/generate-question-pins.mts`
  in a normal env to refresh.

## 1b-3 - re-proved the gate at the merged tip

- tsc 0 · check:routes 343 · verse-tokens clean · full `npm run build` SUCCEEDED (buildability
  confirmed at the merged tip; the build script runs routes + tokens too).
- PG-1 anonymous probe on the MERGED prod build (hidden): /verse/bts, members, community, /build,
  admin all 302 -> /verse; /verse + /verse/promises 200 (probe-merged.txt). The merge did not
  reopen the gate.
- PG-2 heads re-captured at the merged tip -> docs/proofs/push-gate-1/heads-local-2.txt (same 8
  quiz surfaces; consistent with heads-local.txt - the pre-existing doubled "| KpopQuiz" suffix on
  /blindtest + /rankings persists, unchanged by the merge).
- Em-dash clean on the merged source files. Main STRICTLY AHEAD: `git rev-list --left-right --count
  origin/main...main` = 0 (behind) / 306 (ahead). Clean fast-forward for the owner.

## Also this turn (owner-flagged, separate commit 924fe1c)

The owner noticed the mobile top-bar search icon disappeared. Cause: ruling A took the LOCAL
mobile top bar, which predated P-Mingi's "mobile search button" (ac5408c). Restored just that
button onto the local top bar (a /search link, same 34px footprint as the +, outline style,
Play-only, to its left) - verified on the mobile viewport.

## Backlog (from the rulings, for the Play track)

- game-preview.tsx + games-spotlight.tsx (P-Mingi's net-new games-hub components; not merged).
- Remote's 5-tier badge RARITY look, to be re-applied OVER the local (V-UPGRADE-1) badge system.
- Refresh the Pinterest manifest/csv from the current DB (regen timed out here).

## STOP

Merge + re-proof committed. Nothing pushed. Cowork re-audits the heads vs live prod, the owner
sets VERSE_PUBLIC=false in Vercel Production, and the OWNER pushes (clean fast-forward) from a
plain terminal. Step 5 + R-A/R-B follow the push.
