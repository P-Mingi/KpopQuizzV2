# PLAY BATTLE (1v1) AUDIT - measured, not opinion (2026-08-15, Cowork)

Owner: "the 1v1 duel is currently useless". Cowork measured it in the live DB
instead of taking the impression at face value. The verdict is worse and more
actionable than "useless": the head-to-head has LITERALLY NEVER HAPPENED.

## The numbers (live DB, 2026-06-14 -> 2026-08-15)

| Signal | Value | Read |
|---|---|---|
| battles created | 1,420 | real demand exists, people click it |
| battles finished (a result row) | 1,002 | 418 abandoned mid-battle = 29% quit |
| battles 30d | 492 | still alive today, not a dead feature |
| battles with 2+ players | **0** | THE FINDING: not one head-to-head, ever |
| results from signed-in users | 58 / 1,002 (5.8%) | captures almost no identity |
| page indexable | NO (robots noindex) | zero organic discovery by design |

## Root cause (code-verified)

- `/battle` is really SOLO vs a GHOST: `app/api/battle/[id]/ghost/route.ts` serves a
  recorded past run as the "opponent". That part works.
- A REAL head-to-head exists in code: opening `/battle?b=<id>` loads the challenger's
  same 7 questions (`battle-game.tsx` E5 challenge mode), and a copy-link button
  exists (line ~369, builds the ?b= URL with utm tags).
- But 0 of 1,420 battles ever got a second result row. So the invite loop converts at
  0.0%. The mechanic is not broken - the DISTRIBUTION of the invite is.

Why it converts at zero (diagnosis):
1. The invite is a manual "copy link, go find a friend, hope they open it" - the
   coldest possible social action, and it happens AFTER the emotional peak.
2. There is no opponent supply: no lobby, no queue, no "someone is waiting", no
   asynchronous inbox of open challenges (an unused `/api/battle/pending` exists).
3. Nothing is at stake and nothing persists: 94% of players are anonymous, so a win
   is not attached to any identity, and there is no rematch hook.
4. noindex + weak internal entry points (home CTA, quiz result, games hub) means the
   only traffic is incidental.

## Recommendation (ranked, cheapest first)

R1. REMATCH + INBOX (highest ROI, no new UX paradigm). When you beat a ghost, the
    ghost's owner gets a real challenge in an inbox (`/api/battle/pending` already
    exists, unused). Asynchronous, no concurrency needed, no scheduling. This turns
    1,002 solo runs/2mo into a two-sided loop with the players we ALREADY have.
R2. NAME THE STAKE + CLAIM. At the result screen, insert the PLAY-GUEST-CONVERSION
    "claim this run" moment: the win exists either way, the account just names it.
    Target the 94% anonymous share.
R3. OPEN CHALLENGES BOARD. A public list of unfinished battles ("3 fans left a run
    on BTS, beat it") = opponent supply without needing simultaneity.
R4. HONEST LABEL. Today the UI implies 1v1 but delivers solo-vs-ghost. Either make
    the ghost explicit ("beat NAME's recorded run") or deliver a real opponent.
    Covenant: do not imply a live human when there is none.
R5. INDEXABILITY. Decide deliberately: a battle LANDING page (rules, best runs,
    group picker) can be indexable even if the play surface stays noindex.

## What NOT to build (Cowork verdict on the external AI proposal)

Real-time multiplayer and 128-player tournaments were proposed. Rejected for now:
they need CONCURRENT players. The site has 870 unique voters over 2 months and 138
signed players total. Building live lobbies now = building empty rooms. Revisit once
R1-R3 prove a two-sided loop exists.

## Bonus finding (different feature, do not confuse)

The COMMUNITY fan-duel VOTES (duel_questions/duel_votes) are the single most engaged
mechanic on the whole site: 59,508 votes, 870 unique voters, ~68 votes per voter,
30,707 votes in the last 30 days versus 5,216 quiz plays. 20 questions out-engage 399
quizzes by 6x. It stores only `voter_hash` - zero identity captured. That is a second,
separate, very large opportunity.

## R0 - THE TRIGGER (owner ruling, 2026-08-15) - now the FIRST fix, before R1

Cowork's R1-R5 all assumed players reach /battle. Owner's correction: almost nobody
LAUNCHES a battle at all, because the entry point is a menu, not a moment. The fix is
to spawn the challenge at the emotional peak, on the quiz result screen:

  "8/10. Want to battle someone on this?"
  -> [Challenge a friend]  (copy/share link, the existing ?b= flow)
  -> [Random opponent]     (queue the run as an OPEN challenge; the next player who
                            takes the random button gets served this run to beat)

Design rules for it:
- Fires on the quiz RESULT screen (highest emotion, the screen PLAY-RETENTION already
  flags as "the most under-used surface on the site"), not from a nav entry.
- The stake is explicit and honest: the opponent must beat YOUR score on THIS quiz.
- "Random" solves the opponent-supply problem without concurrency: it is a queue of
  open runs, asynchronous, no live lobby (which the data says we cannot fill).
- The challenger's run is already recorded, so the second player always has a real
  human score to chase - never a fabricated opponent (covenant).
- Pair with R2 (claim this run) so the win attaches to an identity.

Sequence is therefore: R0 (trigger on quiz result) -> R2 (claim) -> R1 (rematch inbox)
-> R3 (open challenges board) -> R4/R5.

## R0b - MORE TRIGGERS (owner asked for additional ideas, 2026-08-15)

The result-screen trigger is the anchor. These multiply it. All are asynchronous
by design: none of them require two players online at once.

T1. SHARE CARD IS THE CHALLENGE. The existing share image already carries a
    score. Make the accompanying link a live challenge URL, not a homepage link.
    "I got 8/10 on this, beat me" - the share we already ship becomes the invite.
T2. LEADERBOARD ROW = BEAT BUTTON. Every Hall of Fame / leaderboard row gets a
    quiet "beat this run" action. Turns a passive ranking into opponent supply.
T3. GROUP HUB SUPPLY. On a group page: "4 fans left an unbeaten run on BTS."
    Converts browse intent into a battle without any social step.
T4. YOUR RUN WAS BEATEN -> RETURN HOOK. Someone beats your recorded run, you get
    told, with one-tap rematch. This is the strongest return trigger we can have:
    "someone challenged me" beats "there is a new quiz" (external AI, correct).
    Requires W3 identity to reach the person, which is why W2 and W3 ship together.
T5. POST-BATTLE CONTINUATION. End of a battle: rematch same opponent, or
    challenge someone new on the same quiz. Never a dead end.
T6. DAILY RIVAL. The daily quiz auto-pairs you with one async rival of similar
    level. One per day, no pressure, pure habit loop.
T7. NON-QUIZ SURFACES. The same trigger on blindtest and game results, not just
    quizzes. Every result screen on the site is a potential challenge origin.
T8. EMBED CHALLENGE (ties to W4). A quiz embedded on a partner site ends with
    "score 8/10 - challenge a friend", which lands the visitor on our battle.
    One mechanic serving retention AND acquisition AND backlinks.

Honesty rule for all of them: the opponent must always be a REAL recorded human
run. Never fabricate an opponent to fill a queue.
