// Workstream LOOP, part B - the whole analytics layer, six events, no new dep.
//
// Rides the <Analytics /> from @vercel/analytics already mounted in layout.tsx,
// so custom events land in the Web Analytics we already pay for. No PostHog, no
// second script tag, no cookie banner surface.
//
// Rules that keep this cheap and safe:
//   - Six event names, fixed. Nothing else gets added here casually.
//   - Props are enums and numbers only. No usernames, emails, ids, or free text,
//     so there is no PII and no high-cardinality dimension to blow up the tier.
//   - Fire and forget. track() is wrapped so a blocked/failed beacon can never
//     take a result screen down with it.

import { track } from '@vercel/analytics';

// W2: 'battle' added so the 1v1 can reuse the existing six events (game_start /
// game_complete / share_click) instead of inventing a battle-only scheme. No new
// event names, no new props.
export type GameType = 'quiz' | 'blindtest' | 'this-or-that' | 'name-all' | 'duel' | 'personality' | 'sort-it' | 'match-up' | 'name-them-all' | 'battle';

/** Where the claim block was rendered. Small enum on purpose. */
export type ClaimSurface = 'quiz-result' | 'battle-result' | 'game-result' | 'stats';

/** Why a claim did not move any rows. Fixed codes, never free text. */
export type ClaimRefusal = 'no_browser_id' | 'anon_id_mismatch' | 'nothing_to_claim' | 'sign_in_required' | 'error';

/** Where a cross-promo sends the player. Kept as a small enum on purpose. */
export type CrossPromoTarget =
  | 'quiz'
  | 'group-quiz'
  | 'quizzes'
  | 'blindtest'
  | 'this-or-that'
  | 'name-all'
  | 'duel'
  | 'games'
  | 'daily'
  | 'create'
  | 'login-debate'
  | 'verse';

/** True when this play was launched from a ?daily= link (home daily row, /daily). */
export function isDailyLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has('daily');
  } catch {
    return false;
  }
}

function ev(name: string, props?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return;
  try {
    if (props) track(name, props);
    else track(name);
  } catch {
    // Analytics must never break the app. A dropped event is always cheaper
    // than a broken result screen.
  }
}

export const analytics = {
  gameStart: (type: GameType, daily = false): void => ev('game_start', { type, daily }),

  gameComplete: (type: GameType, score: number, max: number, daily = false): void =>
    ev('game_complete', { type, score, max, daily }),

  // `type` also accepts 'fancard' for the F2c Fan Card share, without a new event.
  shareClick: (type: GameType | 'fancard'): void => ev('share_click', { type }),

  // `from` also accepts 'community' so the community page can attribute its
  // war-map CTA and daily cards without a new event name.
  crossPromo: (from: GameType | 'community' | 'verse', to: CrossPromoTarget): void => ev('cross_promo_click', { from, to }),

  signinClick: (type: GameType): void => ev('result_signin_click', { type }),

  dailyComplete: (kind: string, streak: number): void => ev('daily_complete', { kind, streak }),

  // W3b - the claim funnel. ONE name carrying a `step`, rather than four new event
  // names, so the six-name rule above bends as little as possible. Props stay
  // enum/number only, no PII: `surface` is where the block was, `reason` is a fixed
  // refusal code, `moved` is a row count.
  //
  // Why a new name at all: the DB can see COMPLETED (rows moved) but it can never
  // see SHOWN or REFUSED, and no existing event means either. The tap itself reuses
  // result_signin_click where that already fits. Flagged in the REPORT for reversal
  // if the owner would rather keep the file at six.
  claimFunnel: (
    step: 'shown' | 'started' | 'completed' | 'refused',
    surface: ClaimSurface,
    detail?: { reason?: ClaimRefusal; moved?: number },
  ): void =>
    ev('claim_funnel', {
      step,
      surface,
      ...(detail?.reason ? { reason: detail.reason } : {}),
      ...(typeof detail?.moved === 'number' ? { moved: detail.moved } : {}),
    }),
};
