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

export type GameType = 'quiz' | 'blindtest' | 'this-or-that' | 'name-all' | 'duel';

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
  | 'daily';

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

  shareClick: (type: GameType): void => ev('share_click', { type }),

  crossPromo: (from: GameType, to: CrossPromoTarget): void => ev('cross_promo_click', { from, to }),

  signinClick: (type: GameType): void => ev('result_signin_click', { type }),

  dailyComplete: (kind: string, streak: number): void => ev('daily_complete', { kind, streak }),
};
