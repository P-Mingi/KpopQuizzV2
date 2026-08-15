# REPORT - W2 BATTLE TRIGGER: make the 1v1 actually happen

Repo guard: `git remote -v` = `https://github.com/P-Mingi/KpopQuizzV2.git`. Correct repo.
No DDL was run. Nothing pushed. Verse untouched.

Gates: `npx tsc --noEmit` -> **0** · `npm run build` -> **0** · `check:routes` -> **0**.
`check:metadata-dupes` unchanged: W2 adds only API routes, no indexable page, so the
indexable set is byte-identical to W1's run.

Commits: `df65c57` (A/B/C) · `4a47a28` (D) · this phase (owner's two follow-ups).
Proofs: `docs/proofs/w2-battle/`.

---

## THE HEADLINE

**A battle has two players in it for the first time.** 1,420 battles over two months,
1,002 finished, and the audit's finding was that not one had ever had a second player.
Re-verified independently before building (paginated past the 1000-row cap, so no
undercount):

```
battle_results rows: 1005 · battles with >= 1 result: 1005
battles with 2+ DISTINCT players: 0 · max distinct players on any battle: 1
```

After the build, an end-to-end run through the real UI plus a second player:

```
battle 09d68d7b-00c6-45be-9196-16da2bfe8a41   quiz 5d2c7c50 (the quiz actually played)
  row 1: 184311da08e548a6  score 2/5  challenger? true
  row 2: 2e6e8a2041796ee2  score 4/5  challenger? false
  DISTINCT players: 2   winner: the accepter (4 beat 2)

SITE-WIDE: battles with 2+ DISTINCT players: 1  (was 0)
```

Proof files: `partA-baseline-before.txt`, `partA-challenge-created.txt`,
`partA-two-result-rows.txt`.

**Method, stated plainly:** context A is a real browser playing a real quiz and
clicking the real button. Context B is a second identity created with a distinct
`x-forwarded-for`, because `anonHash` is `sha256(ip + day)` and two browsers on this
machine share 127.0.0.1, so they would collapse into ONE player locally. The XFF
header is exactly how production tells two players apart, so this exercises the real
code path, not a stub.

---

## PART A - the trigger

`POST /api/battle/challenge` creates a battle FROM the run just played.

- **No DDL needed, confirmed against the live schema first** (`partA-schema-probe.txt`):
  `battles` already has `quiz_id · group_slug · question_ids · questions ·
  challenger_hash · challenger_score`, and `battle_results` is a separate table with
  one row per player run. `quizzes.questions` and `battles.questions` are the SAME
  shape, so a quiz run copies across with no mapping (`partA-question-shapes.txt`).
- **Why not `/api/battle/start`:** it calls `selectBattleQuestions()` and mints a
  fresh random 7. That is the missing-stake bug the workstream exists to fix, and
  that helper has no "use exactly these questions" mode.
- **Trust model:** the client sends the ORDER it played, never the content. Every
  question is matched against the quiz's stored questions and the SERVER's copy is
  persisted, so a forged body cannot inject text or move the correct answer. A
  deliberately bogus payload returns `400 Questions do not match this quiz`.
- **The result state now carries the run.** `phase: 'result'` used to drop
  `questions` and `answers`, which is precisely why the old CTA could only launch an
  unrelated battle.
- The challenger's own run is written as a real `battle_results` row. That is what
  makes a finished challenge hold TWO rows.
- Guests are never gated. Rate limit: 20 challenges per hour per anon hash.

## PART B - random opponent

`GET /api/battle/random` serves an existing OPEN challenge: same group first, then
closest score, then most recent.

**The pool was already full before we shipped anything** (`partB-open-pool-before.txt`):

```
open challenges (challenger finished, nobody else has run it): 863
  quiz-linked 453 · group-linked 410
scores: 7 -> 269, 6 -> 172, 5 -> 150, 4 -> 100, 3 -> 82, 2 -> 43, 1 -> 34, 0 -> 13
```

So "random opponent" serves real recorded humans from day one. Verified live: a third
identity drew `73868427` from a pool of 258 for blackpink, and the own-run exclusion
holds (the draw never returns the caller's own battle).

**COVENANT kept:** never fabricates an opponent, never pads the queue, never serves a
player their own run.

**`/api/battle/pending` was NOT reused, and the mission's premise about it is wrong.**
It is not an opponent queue and it is not unused: it returns `pending_questions` for
the E6 crowd-confirm hook, and `battle-game.tsx:465` calls it on every battle reveal.
It only looks dead because it renders nothing when no questions are pending.
Overloading it would have buried an unrelated feature, so PART B is a new route.

**Empty state:** honest copy, and unreachable today by construction because the pool
is 863 real runs. The branch and its copy are proven by forcing the client state
(`p3-empty-pool-mobile-390.png`), clearly labelled: the stub returns the exact
`{battle: null}` shape the route emits. No fake pool was created.

## PART C - the share is the challenge

Captured live from the real CTA (`partC-share-is-the-challenge.txt`):

```
I got 1/5 on "BTS music video trivia - can you get 100%?", beat me
http://localhost:3021/battle?b=7fbaa597...&utm_source=share&utm_medium=social&utm_campaign=battle_challenge
```

Real score, real title, a LIVE challenge URL. Reuses the existing `?b=` accept flow,
the existing utm tags and the existing OG path. No new image system.

## PART D - the seo_intro trap (separate commit, `4a47a28`)

`seo_intro` no longer touches the meta description; the W1 data-driven formula always
wins. It keeps rendering as the visible intro paragraph at the top of the group page,
which it already did (`group-quiz-page.tsx:118,152`), so the "additive, visible only"
ruling needed only the description branch removed.

---

## The owner's two follow-ups (this phase)

### 1. The challenge screen, rebuilt as a duel

`p4-accept-anon-mobile-390.png` and `p5-accept-signedin-mobile-390.png`.

A duel card: challenger on the left behind a red wash, the site `VsBadge` in the
middle, YOU on the right. `GET /api/battle/[id]` now resolves the challenger's profile
(a second keyed read, because `battle_results` and `profiles` both FK to `auth.users`
and have no FK to each other, so a PostgREST embed is impossible).

- **Signed in:** real avatar photo, display name with their accent colour, `@handle`,
  `Lv 11 · Bias`, `bias ATZ OT8`, `0W of 5 battles`. All real columns.
- **Anonymous:** initials mark, `@fan_48a6`, `no account`. **No invented face, no
  invented level, no invented record.** This is the common case: 94% of battle results
  are anonymous.
- The stake now names the real quiz, and the CTA carries the challenge red
  (`--wrong`) rather than the brand pink.

**A copy bug was fixed on the way:** the accept screen claimed "the same 7 questions"
on every challenge. A challenge from a 5-question quiz now says 5.

### 2. Notifications: the honest answer

**No, a challenge did not touch the notification system, and it still cannot be fully
delivered. Two separate reasons, one of which is yours to unblock.**

- **Built:** `notifyRunBeaten()` fires when someone genuinely beats a challenger's
  run, linking straight back to `/battle?b=<id>` for the rematch. This is R0b T4, the
  strongest return trigger in your own audit.
- **Styled red as asked:** the challenge notification is the only type that is another
  player coming for you, so unread it uses `--wrong` (a real red) for the card, the
  icon chip and the title, with a crossed-swords glyph, instead of the brand pink
  every other unread notification uses. Read state calms down like the rest so the
  inbox does not stay shouting.
- **BLOCKED on you:** `creator_notifications.type` has a CHECK constraint that rejects
  `battle_beaten`. DDL is owner-run and this mission says block rather than migrate,
  so the SQL is written and waiting:
  `docs/pending-migrations/154_battle_challenge_notification.sql`. The insert fails
  soft until you apply it, so nothing else breaks. See BLOCKED.md.
- **A limit worth knowing:** `creator_notifications.user_id` is NOT NULL against
  `auth.users`, so only a challenger who was SIGNED IN can ever be notified. With 94%
  of results anonymous, this hook covers a thin slice until W3 identity lands. That is
  why the audit pairs W2 and W3.
- Found and fixed on the way: `verse_watch` was live in the DB CHECK but had drifted
  out of the TS union and out of the prefs CASE, so it silently bypassed user mute
  settings. Migration 154 fixes that too.

---

## Deviations and flags (loud)

1. **The mission's claim that `/api/battle/pending` is unused is incorrect.** It is
   live on every battle reveal, for a different feature. Not reused, by decision.
2. **The two-player proof uses a forged `x-forwarded-for` for the second identity.**
   Unavoidable locally: both browsers share one IP and would be one player. Named
   here rather than buried.
3. **The empty-pool state is proven by a forced client state**, not a real empty pool,
   because 863 real open runs exist. Labelled in the script and in the proof.
4. **The red notification cannot be shown end to end** until migration 154 is applied.
   The styling is implemented and typechecks; there is no screenshot of a live red
   notification and I am not going to fake one.
5. **`score` is client-reported**, exactly as the existing battle and quiz systems
   already work (battle-game.tsx scores client-side). W2 did not change that trust
   model; hardening it is its own piece of work.
6. **`question_ids` is filled with throwaway UUIDs**, matching what `/api/battle/start`
   already does. The column is `uuid[] NOT NULL` and is never read anywhere in the app.
7. A NUL byte landed in `challenge/route.ts` during authoring and was stripped; the
   file is clean (checked across every touched file).

## Next

W3 (claim this run / identity) is the multiplier: it turns anonymous challengers into
people who can be notified, named and beaten back. Until then the loop works but only
the link-share and random-draw halves are fully alive.

---

STOP. **Nothing was pushed.** report pret.
