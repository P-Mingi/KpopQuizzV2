# F6c: editorial profiles (AU3-004)

## Progress
- Done: AU3-004. Next: nothing. Blockers: none.

## Item
- AU3-004, commit `5cd8f87` (owner F2), `apps/quiz/src/components/profile/ux-v1/passport.tsx`. Only when
  `isTeam` and `isUxV12()`: the stats keep `quizzes made` and `plays received` (the account's work as a creator);
  streak, groups mastered, quizzes played, average score and blindtests played are dropped. The tabs are only
  Quizzes: no Overview (fandom war strip, pinned badges, groups mastered, recent activity, the "has no badges yet"
  empty state), no History, no Badges. Level, XP bar, bias, pinned badge, fandom meta were already gone (F2).
- Tests: 6 new render tests appended to `apps/quiz/src/lib/editorial-exclusions.test.ts` (no existing test
  touched), props with every fan block filled (streak 12, a mastered group, an earned and pinned badge, war, history):
  team public and personal show none of 15 fan markers and one tab; a fan keeps every block with the flag on;
  flag off, `isTeam` renders the same bytes as the props without it, and a fan's page is the same bytes flag on
  and off. File: 12 of 12. Whole app: vitest 1912 of 1912, `tsc --noEmit -p .` exit 0.
- Byte proof against the code before the change: a scratch render test (not committed) hashed the passport
  (sha256) for fan personal and public with the flag on and off, and team props with the flag off, before and
  after the edit: the 6 hashes are identical.

## NOT verified
- No browser check: `/u/<username>` of a real editorial account was not loaded on a dev server (render tests
  only), so CSS of a one-tab row is not seen. `/me` and `/profile` were never loaded signed in.
- Bios in a fan voice (AU3-004 second half) are data: owner decision, not changed.
