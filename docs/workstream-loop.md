# Workstream LOOP - Result-screen harmonization + analytics

## Claude Code Implementation Prompt

---

Workstream LOOP. Two goals: (1) every game's result screen ends in the SAME complete, sticky
loop the quiz result already has, so no game dead-ends and players always have a next action
that keeps them on-site; (2) a thin, free analytics layer so we can see the funnel.

Hard rules: NO em dashes. Real `<Mascot>` only. Git commit only after each step, do NOT push.
Dual-skill audit: `/ui-ux-pro-max` + `/frontend-design` before and after.

DO NOT TOUCH the quiz result screen (`quiz-player.tsx`, the `phase === 'result'` block). It is
the reference model. Every other result screen must be brought UP to it, not the reverse.

---

## Part A - The shared ResultLoop footer

### A0 - Study the reference (read only, change nothing)

Read `apps/quiz/src/components/quiz/quiz-player.tsx` lines 994-1268 (the `result` phase). This
is the target quality bar. Note its ingredients in order: mascot (celebrate/sad) -> branded
score hero (stars, count-up score, score bar, beat-%, verdict) -> primary actions (share +
"Play another") -> Discord line -> conditional brag -> like -> stats row -> my-rank -> XP card
-> comments -> report -> related quizzes -> blindtest cross-link. Match its visual language
(`result-share-card`, `result-share-actions`, stat-cell grid, `btn-primary`/`btn-outline`,
`animate-result-in`, `DiscordResultsLine`, `Mascot`).

### A1 - Build `<ResultLoop>` - the shared footer

**New file:** `apps/quiz/src/components/result/result-loop.tsx`

One reusable component that every non-quiz result screen renders BELOW its own game-specific
score display. It is the "what happens next" engine. Props:

```ts
interface ResultLoopProps {
  game: 'blindtest' | 'this-or-that' | 'name-all' | 'duel';
  // For the share text + emoji-free share line
  score?: number;          // e.g. 8
  max?: number;            // e.g. 10
  scoreLabel?: string;     // "Sharp listener" etc. (game supplies its own verdict)
  shareText: string;       // the full share string the game builds
  shareUrl: string;        // canonical URL to share (the game's hub or the played item)
  // Loop routing
  playAgainHref?: string;  // if replay is a navigation (else omit and pass onPlayAgain)
  onPlayAgain?: () => void;// if replay is in-component state reset
  // Signed-in state, so the nudge only shows to anon
  isSignedIn: boolean;
  // Optional: the group/context, to make cross-promo smart
  groupSlug?: string | null;
  groupName?: string | null;
}
```

It renders, in this order, matching the quiz result's language:

1. **Primary action row** (`result-share-actions` styling):
   - `Play again` (btn-primary) - calls `onPlayAgain` or links `playAgainHref`
   - One **smart cross-promo** button (btn-outline). See A2 for the rotation.

2. **Discord line** - `<DiscordResultsLine surface={`${game}-result`} text="..." />` (reuse
   existing component; blindtest + duel already have one, keep the copy).

3. **Signed-out nudge** (only when `!isSignedIn`) - one consistent card:
   "Sign in to save your score and keep your daily streak" + a `Sign in` link to `/login`.
   Fires the `result_signin_click` analytics event on click. Signed-in users never see this.

4. **The loop grid - two cross-links** styled exactly like the quiz result's blindtest
   cross-link card (`p-3 bg-surface border border-default rounded-xl`, icon + text). These are
   the backlink/loop spine. Which two show depends on `game` (A2).

The component owns NO game state. It is pure presentation + routing + the share handler
(navigator.share with clipboard fallback, same pattern as `quiz-player` handleShare and the
current blindtest share). Every button also fires the matching analytics event (Part B).

### A2 - Smart cross-promo rotation (the loop)

The whole point: never send a finishing player to a dead end. Each game points at the next
best loop. Route so players cycle quiz <-> blindtest <-> games and always have a group thread
to pull.

| Finished game | Cross-promo button (btn-outline) | Loop card 1 | Loop card 2 |
|---|---|---|---|
| blindtest | "Play a {groupName} quiz" (or "Play a K-pop quiz") -> `/{groupSlug}-quiz` or `/quizzes` | This or That game | Daily blindtest / quiz of the day |
| this-or-that | "Try the blind test" -> `/blindtest` | A quiz (group or `/quizzes`) | Name All Members |
| name-all | "Play a {groupName} quiz" -> `/{groupSlug}-quiz` or `/quizzes` | Blind test | This or That |
| duel | "Play a {groupName} quiz" -> group or `/quizzes` | Blind test | Games hub |

When `groupSlug` is known, prefer the group-specific quiz link (`/{groupSlug}-quiz`) - that is
the strongest backlink (keeps the fan on their bias). Fall back to `/quizzes` when unknown.
All internal links are real `<Link href>` (crawlable, keeps SEO juice on-site).

### A3 - Wire ResultLoop into each game (quiz result stays untouched)

For each, KEEP the game's existing score display (winner card, grid, breakdown, etc.). Just
REPLACE its ad-hoc action buttons + add the footer with `<ResultLoop>`.

**A3.1 Blindtest** (`apps/quiz/src/components/blind-test/blindtest-game.tsx`, results block
~line 414-476):
- Keep the mascot + `bt-result-card` + `bt-breakdown`.
- Remove the current `bt-result-actions` (Play again / Share) + the standalone Discord + the
  "Change playlist" button. Replace with `<ResultLoop game="blindtest" ... />`.
- `onPlayAgain={start}`. `shareUrl` = `/blindtest`. `shareText` = existing string.
- Pass `groupSlug/groupName` when the playlist was a group pick (the game knows `playlist`).
- **Add the missing daily wire:** if the game was launched in daily mode (`?daily=true` from
  Workstream N, or if N not shipped yet, skip this line and note it), call
  `completeDaily('blindtest')` on finish. If N is not merged, at minimum add
  `completeDaily('game')`-style credit is NOT correct for blindtest; leave a TODO tied to N.

**A3.2 This or That** (`apps/quiz/src/components/game/this-or-that-game.tsx`, result block
~line 271-362):
- Keep the winner circle, win-rate bar, bracket journey.
- Remove the ad-hoc "Play again"/"Back" buttons. Add `<ResultLoop game="this-or-that" ... />`.
- `onPlayAgain={startGame}`. `shareUrl` = `/games/this-or-that`. Build a `shareText` like
  `"My #1 is {winner.name} - who's yours? kpopquiz.org/games/this-or-that"` (this screen has
  NO share today; adding it).
- **Fix the missing daily wire:** this screen never calls `completeDaily`. The duel screen
  does. When launched via `?daily=game`, call `completeDaily('game')` on reaching `result`
  (mirror `duel-game.tsx` line 176). Verify the GOTD "this or that" daily link actually lands
  here and now credits the streak.

**A3.3 Name All** (`apps/quiz/src/components/game/name-all-player.tsx`, result block
~line 614-752):
- Keep the stars, score, member grid, missed list, stats.
- Remove the "Try again"/"Back to games" buttons. Add `<ResultLoop game="name-all" ... />`.
- `onPlayAgain` resets to start (existing setPhase('start')). `shareUrl` = the game's page.
  `shareText` = `"I named {found}/{total} {groupName} members. Can you? kpopquiz.org"`.
- Already calls `completeDaily('game')` - keep it.

**A3.4 Duel** (`apps/quiz/src/components/duel/duel-game.tsx`):
- Read its result block. Keep its vote-reveal display. Swap ad-hoc actions for `<ResultLoop
  game="duel" ... />`. It already calls `completeDaily('game')` - keep it.

### A4 - Consistency pass

After wiring, every game result reads: [game-specific score display] -> ResultLoop [play again
+ smart cross-promo -> Discord -> (anon) sign-in nudge -> two loop cards]. Visual tokens match
the quiz result (same card styles, same button classes, same spacing rhythm). Confirm dark +
light parity and the 440px mobile column width used by the quiz result.

---

## Part B - Analytics (thin, free, Vercel only)

No new dependency, no new script tag, no PostHog. Use the `@vercel/analytics` `track()` that
ships with the `<Analytics/>` already mounted in `layout.tsx`. Custom events are included in
the Web Analytics events we already pay for. Keep it to SIX events, no PII, no high-cardinality
values.

### B1 - `lib/analytics.ts`

```ts
import { track } from '@vercel/analytics';

type GameType = 'quiz' | 'blindtest' | 'this-or-that' | 'name-all' | 'duel';

// Fire-and-forget. Guards against SSR. Never throws.
function ev(name: string, props?: Record<string, string | number | boolean>) {
  try { track(name, props); } catch { /* analytics must never break the app */ }
}

export const analytics = {
  gameStart:   (type: GameType, daily = false) => ev('game_start', { type, daily }),
  gameComplete:(type: GameType, score: number, max: number, daily = false) =>
                 ev('game_complete', { type, score, max, daily }),
  shareClick:  (type: GameType) => ev('share_click', { type }),
  crossPromo:  (from: GameType, to: string) => ev('cross_promo_click', { from, to }),
  signinClick: (type: GameType) => ev('result_signin_click', { type }),
  dailyComplete:(kind: string, streak: number) => ev('daily_complete', { kind, streak }),
};
```

Six events total: `game_start`, `game_complete`, `share_click`, `cross_promo_click`,
`result_signin_click`, `daily_complete`. That is the entire funnel: start -> complete ->
(share | cross-promo | signup) and the daily retention signal. Nothing more.

### B2 - Fire points

- `game_start`: at the moment each game leaves setup/intro and begins (quiz `START`, blindtest
  `start()`, tot `startGame`, name-all begin, duel begin). Include `daily` when launched from a
  `?daily=` link.
- `game_complete`: when each result phase is reached (all 5 games, quiz included - this is the
  ONE analytics addition allowed in quiz-player: a single `analytics.gameComplete(...)` call,
  no visual change).
- `share_click`: inside `ResultLoop`'s share handler + the quiz result's `handleShare`.
- `cross_promo_click`: on the ResultLoop cross-promo button + loop cards (`from` = game, `to` =
  destination slug like 'blindtest' / 'quiz' / 'this-or-that').
- `result_signin_click`: on the anon nudge sign-in link.
- `daily_complete`: fold into `completeDaily` in `lib/daily-played.ts` - fire once with the
  returned `{ kind, streak }` when the server confirms a streak day. One central call covers
  every daily.

### B3 - Non-negotiables

- No usernames, no emails, no IDs, no free text in event props. Only the enums + numbers above.
- `track()` never blocks or throws (wrapped in try/catch).
- No effect on SSR/ISR - all calls are client-side in `'use client'` components.
- Stays inside the Vercel free Web Analytics tier (6 low-cardinality events; the current bill
  line "Web Analytics Events" already exists and is covered by the $20 credit at this volume).

---

## Build order (commit after each, do NOT push)

1. **B1** - `lib/analytics.ts` + fold `daily_complete` into `completeDaily`. Commit.
2. **A1** - build `<ResultLoop>` (with share handler + analytics wired). Commit.
3. **A3.1** - blindtest result uses ResultLoop. Commit.
4. **A3.2** - this-or-that result uses ResultLoop + FIX missing `completeDaily('game')`. Commit.
5. **A3.3** - name-all result uses ResultLoop. Commit.
6. **A3.4** - duel result uses ResultLoop. Commit.
7. **B2** - add `game_start` + `game_complete` fire points across all 5 games (incl. the single
   quiz `gameComplete` call). Commit.
8. **A4** - consistency + dark/light + mobile pass. Commit.

---

## Verification

- [ ] Quiz result screen visually + behaviorally UNCHANGED (diff shows only one added
      `analytics.gameComplete` line, nothing else)
- [ ] Every game result ends with: play again + smart cross-promo + Discord + (anon) nudge +
      two loop cards
- [ ] Cross-promo prefers the group-specific `/{groupSlug}-quiz` when group is known
- [ ] This-or-that now shares AND now credits the daily streak when launched via `?daily=game`
- [ ] Blindtest daily wire present (or TODO tied to Workstream N if N not merged)
- [ ] All cross-links are real `<Link>` (crawlable, on-site)
- [ ] Signed-out nudge shows only to anon; signed-in never sees it
- [ ] All 6 analytics events fire at the right joints; props are enums/numbers only, no PII
- [ ] `track()` failures cannot break any screen (try/catch verified)
- [ ] Dark + light parity, 440px mobile column matches quiz result
- [ ] tsc clean, build green, zero em/en dashes
- [ ] No new npm dependency added (Vercel analytics only)

/caveman report after each step: what changed, before/after screenshots of each game result,
the cross-promo routing table as built, and the 6 events confirmed firing.
