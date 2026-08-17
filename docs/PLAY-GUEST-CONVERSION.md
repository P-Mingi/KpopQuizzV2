# PLAY GUEST-TO-ACCOUNT CONVERSION STRATEGY (2026-08-05)

Research-backed (Duolingo +20% DAU play-first, NYT/Wordle streak-save,
Lichess identity-not-access model, Baymard -24% on forced pre-value
walls, Google One Tap ~2x signups, NYT 2022 streak-wipe backlash).
Full sources in the research digest at the end. Covenant-compatible by
construction: zero dark pattern, zero fake urgency, guest data sacred.

## The doctrine (one sentence)

NEVER gate play; gate IDENTITY: the account is not a door, it is the
name on what the guest already earned.

## The four conversion moments (in priority order)

1. CLAIM THIS RUN (the killer, uses our existing Hall of Fame).
   A guest finishes and lands on the board: render THEIR row inserted
   in place, marked "someone (c'est toi)", grey ghost avatar, empty
   badge slot, next to the full rows of registered players (name +
   avatar + level + bias). One button on the row: "Claim your spot -
   pick your name". One tap Google/passkey, NO email required. The
   score exists either way (honest); the account just names it.
   Endowment effect at peak emotion.
2. STREAK BACKUP (day 3+, quiet). Guests get real localStorage
   streaks on the daily quiz/blindtest. When a streak reaches 3, one
   calm line under the result: "Ta serie ne vit que dans ce
   navigateur. Sauvegarde-la en 10 secondes, sans email." Loss
   aversion with a TRUE statement, never a countdown, never nagging
   (shown max once per streak milestone: 3, 7, 14).
3. STATS VIEW. Guest opens their local stats panel: bottom line
   "Make this permanent on any device" (the Wordle new-phone trigger,
   surfaced before the phone dies).
4. POST-SHARE. After a share-grid copy (once Idle/share grids ship):
   toast "Nice run. Put a name on it?" Share is never gated.

## The trust move that beats everyone

RETROACTIVE MERGE: on signup, ALL prior local history (past daily
scores, streaks, anonymous Hall of Fame rows from this browser) is
merged into the new account, visibly: "Tes 12 parties et ta serie de
5 sont maintenant a toi." NYT wiped streaks in 2022 and burned trust
for years; we do the exact opposite and SAY it. This line goes in the
signup sheet itself.

## Friction rules

- Auth: Google One Tap overlay + Apple + passkey. Username = the only
  required field. Email OPTIONAL, asked later ("for recovery only",
  covenant tone), never marketing-defaulted.
- The claim sheet is 1 screen, 2 taps total. No password path unless
  requested.
- Anonymous play remains complete forever (Lichess model): duels/Elo,
  badges, collections stay account-features (identity), never paywall
  vibes.

## Copy rules (covenant voice)

Say what is true: "ton score reste anonyme si tu veux". Never
"Don't miss out", never confirmshaming ("No thanks, I hate fun" is
banned), never fake scarcity (FTC fined Epic $245M for that road).
Every prompt dismissible, never repeated in the same session.

## Instrumentation (prove it works)

Events: guest_run_completed, hof_row_rendered_ghost, claim_clicked,
onetap_shown/accepted, signup_completed, merge_completed,
streak_prompt_shown/day, D1/D7 retention by cohort (guest vs claimed).
Baseline first (current organic signup rate), then ship moments 1+2,
measure 2 weeks, then 3+4. No vanity metrics: the number that matters
is claimed accounts still active D7.

## Build shape (small, Play-side workstream G-CLAIM)

Step 1: guest local stats + streak store (already partly exists via
results) + ghost row rendering. Step 2: claim flow (One Tap + passkey
+ username picker) + retroactive merge rail. Step 3: prompts 2-4 +
instrumentation + copy pass. Each step proofed (parity: page
indexable set unchanged; privacy: fail-closed; no em dashes).
SERIALIZED after current chantiers per the standing queue; G-HUB fork
finishes first on the Play side.

## Founder welcome message (owner addition, 2026-08-05, VALIDATED)

Every new account receives an automatic in-app notification from the
owner's account: "Welcome {username}! So happy you're here..." warm,
personalized with the username, sent once, right after signup (or
after a claim: reference their run: "nice 8/10 on today's quiz").
HONESTY GUARDRAIL (covenant): the message IS from Mingi and IS
automated; it must not pretend to be hand-typed. Sign it "Mingi,
fondateur" with a warm standard text; no fake "I wrote this just for
you" phrasing. In-app notification ONLY (never an email blast; email
stays optional + recovery-only). Content: welcome + 2-3 genuinely
useful doors (today's quiz, your fandom's Verse space, Discord).
Replies (if the messaging surface allows) land in the owner's real
inbox: automation sends, a human answers. Ships in G-CLAIM step 3
with the prompts + instrumentation (event: welcome_sent, opened).

## Research digest (agent sweep 2026-08-05)

Ranked mechanics: play-first signup (+20% DAU Duolingo) · soft-then-
firm wall (+8.2%) · One Tap (~2x Reddit, +8.2pp median) · streak
save prompts (D7 +14%) · cross-device sync as core promise · gate
identity not access (Lichess) · post-success creation (forced
pre-value = -24%) · passkeys (+10pp login success) · progressive
profiling · share-as-proto-identity. Anti-patterns with receipts:
streak wipes (NYT 2022, Heardle/Spotify), confirmshaming, fake
urgency (FTC/Epic $245M), nagging modals. Sources: taplytics.com,
relaunch.ai, blog.duolingo.com, tomsguide.com, thedailybeast.com,
digiday.com, axios.com, il.ly, developers.google.com, corbado.com,
descope.com, lichess.org, support.chess.com, makeuseof.com,
engadget.com, fyresite.com, cs.umd.edu, baymard.com.
