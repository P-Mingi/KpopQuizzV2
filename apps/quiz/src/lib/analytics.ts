// Workstream LOOP part B + O1 measure lane: the whole analytics layer, no new dep.
//
// Rides the <Analytics /> from @vercel/analytics already mounted in layout.tsx,
// so custom events land in the Web Analytics we already pay for. No PostHog, no
// second script tag, no cookie banner surface.
//
// Rules that keep this cheap and safe:
//   - The event names are fixed (the dashboard series continue). Nothing else gets added casually.
//   - Every property is an ENUM from the tables below (or a small number for claim_funnel `moved`).
//     No slug, id, username, email or free text. buildEvent() checks each value against its
//     table and DROPS the whole event when one is not in it, so a new caller cannot leak a
//     high-cardinality value by accident.
//   - At most 7 properties per event (the plan caps differ; site, game and mode always go first).
//   - Fire and forget. track() is wrapped so a blocked/failed beacon can never
//     take a result screen down with it.

import { track } from '@vercel/analytics';

// ---- the enums -------------------------------------------------------------------------------

export const SITES = ['kpop', 'hub', 'anime'] as const;
export const GAMES = ['quiz', 'blindtest', 'dle', 'cards'] as const;
export const MODES = ['classic', 'daily', 'challenge', 'ranked', 'relaxed', 'resume', 'embed', 'unlimited', 'solo', 'duel'] as const;
/** The quiz type, the playlist family, the -dle variant or the card ruleset. */
export const KINDS = [
  // quiz types (QuizType)
  'multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder',
  // blind test families
  'bt_all', 'bt_group', 'bt_mix', 'bt_daily', 'bt_challenge', 'bt_ranked',
  // -dle variants (DleGameId)
  'kpopdle-idol', 'kpopdle-group', 'kpopdle-song', 'otakudle', 'otakudle-one-piece', 'otakudle-dragon-ball',
  // card rulesets
  'cards_standard',
] as const;
export const SCORE_BANDS = ['0-39', '40-69', '70-99', '100'] as const;
export const SURFACES = ['result', 'fancard', 'dle_result', 'quiz_page'] as const;
export const FROMS = ['home', 'result', 'nav', 'hub', 'share', 'direct'] as const;
export const STREAK_BUCKETS = ['1', '2', '3-6', '7+'] as const;
export const DEPTHS = ['1', '2-3', '4-7', '8+'] as const;
export const SIGNIN_STATES = ['true', 'false'] as const;

export type Site = (typeof SITES)[number];
export type Game = (typeof GAMES)[number];
export type Mode = (typeof MODES)[number];
export type Kind = (typeof KINDS)[number];
export type ScoreBand = (typeof SCORE_BANDS)[number];
export type Surface = (typeof SURFACES)[number];
export type From = (typeof FROMS)[number];
export type StreakBucket = (typeof STREAK_BUCKETS)[number];
export type Depth = (typeof DEPTHS)[number];

// Kept for the callers that only say which play surface they are on.
export type GameType = 'quiz' | 'blindtest';

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
  | 'daily'
  | 'create'
  | 'login-debate'
  | 'verse';

const CROSS_TARGETS: readonly string[] = ['quiz', 'group-quiz', 'quizzes', 'blindtest', 'daily', 'create', 'login-debate', 'verse'];
const CROSS_FROM: readonly string[] = ['quiz', 'blindtest', 'community', 'verse'];
const CLAIM_STEPS: readonly string[] = ['shown', 'started', 'completed', 'refused'];
const CLAIM_SURFACES: readonly string[] = ['quiz-result', 'battle-result', 'game-result', 'stats'];
const CLAIM_REASONS: readonly string[] = ['no_browser_id', 'anon_id_mismatch', 'nothing_to_claim', 'sign_in_required', 'error'];

type Props = Record<string, string | number | boolean>;

// ---- pure helpers (unit tested) ---------------------------------------------------------------

function oneOf<T extends string>(table: readonly T[], v: unknown): v is T {
  return typeof v === 'string' && (table as readonly string[]).includes(v);
}

/** The score as one of four bands. A max of 0 or a non-finite number gives null (the event is then dropped). */
export function scoreBand(score: number, max: number): ScoreBand | null {
  if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return null;
  const pct = Math.round((Math.min(Math.max(score, 0), max) / max) * 100);
  if (pct >= 100) return '100';
  if (pct >= 70) return '70-99';
  if (pct >= 40) return '40-69';
  return '0-39';
}

export function streakBucket(streak: number): StreakBucket {
  if (!Number.isFinite(streak) || streak <= 1) return '1';
  if (streak === 2) return '2';
  if (streak < 7) return '3-6';
  return '7+';
}

export function depthBucket(pages: number): Depth {
  if (!Number.isFinite(pages) || pages <= 1) return '1';
  if (pages <= 3) return '2-3';
  if (pages <= 7) return '4-7';
  return '8+';
}

/** The `from` of a ?daily=...&from=... link; anything outside the enum, or no value, is `direct`. */
export function parseFrom(search: string): From {
  try {
    const v = new URLSearchParams(search).get('from');
    return oneOf(FROMS, v) ? v : 'direct';
  } catch {
    return 'direct';
  }
}

export function readFrom(): From {
  if (typeof window === 'undefined') return 'direct';
  return parseFrom(window.location.search);
}

/** True when this play was launched from a ?daily= link (home daily row, /daily). */
export function isDailyLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).has('daily');
  } catch {
    return false;
  }
}

/** The site of this page: the build's id, else the host (the hub's games ride the same code on bunnyverse.org). */
export function currentSite(): Site {
  const env = process.env.NEXT_PUBLIC_SITE_ID;
  if (env === 'anime' || env === 'hub') return env;
  if (typeof window !== 'undefined' && /bunnyverse/i.test(window.location.hostname)) return 'hub';
  return 'kpop';
}

/** The analytics mode of a quiz run. A challenge beats a daily, a daily beats a relaxed run; an embed plays as embed whatever else. */
export function quizRunMode(f: { embed?: boolean; challenge?: boolean; daily?: boolean; relaxed?: boolean }): Mode {
  if (f.embed) return 'embed';
  if (f.challenge) return 'challenge';
  if (f.daily) return 'daily';
  if (f.relaxed) return 'relaxed';
  return 'classic';
}

/** The analytics mode and kind of a blind test run: the playlist family, never the playlist itself. */
export function btRunAnalytics(run: 'free' | 'daily' | 'challenge', playlist: string, grouped: boolean): { mode: Mode; kind: Kind } {
  if (run === 'daily') return { mode: 'daily', kind: 'bt_daily' };
  if (run === 'challenge') return { mode: 'challenge', kind: 'bt_challenge' };
  if (playlist === 'ranked') return { mode: 'ranked', kind: 'bt_ranked' };
  return { mode: 'classic', kind: grouped ? 'bt_group' : playlist === 'all' ? 'bt_all' : 'bt_mix' };
}

// ---- the visit depth (audit 02 P2-3): a sessionStorage page counter ---------------------------

const DEPTH_KEY = 'kq_visit_pages';

/** Called by the Analytics beforeSend on each page view: counts the pages of this tab session. */
export function countPageView(): void {
  if (typeof window === 'undefined') return;
  try {
    const n = Number(window.sessionStorage.getItem(DEPTH_KEY) ?? '0');
    window.sessionStorage.setItem(DEPTH_KEY, String((Number.isFinite(n) ? n : 0) + 1));
  } catch {
    // storage blocked: the depth is then 1
  }
}

export function visitDepth(): Depth {
  if (typeof window === 'undefined') return '1';
  try {
    return depthBucket(Number(window.sessionStorage.getItem(DEPTH_KEY) ?? '1'));
  } catch {
    return '1';
  }
}

// ---- the typed events -------------------------------------------------------------------------

export interface PlayInput {
  game: Game;
  mode: Mode;
  kind: Kind;
  /** Only read for a daily play. */
  from?: From;
  site?: Site;
}

function playBase(i: PlayInput): Props | null {
  const site = i.site ?? currentSite();
  if (!oneOf(SITES, site) || !oneOf(GAMES, i.game) || !oneOf(MODES, i.mode) || !oneOf(KINDS, i.kind)) return null;
  return { site, game: i.game, mode: i.mode, kind: i.kind };
}

/** The properties of an event, or null when any value is not in its enum (the event is then not sent). */
export function buildEvent(name: string, input: Record<string, unknown>): Props | null {
  switch (name) {
    case 'game_start': {
      const p = playBase(input as unknown as PlayInput);
      if (!p) return null;
      if (p.mode === 'daily') {
        const from = input.from ?? 'direct';
        if (!oneOf(FROMS, from)) return null;
        p.from = from;
      }
      return p;
    }
    case 'game_complete': {
      const p = playBase(input as unknown as PlayInput);
      const band = scoreBand(Number(input.score), Number(input.max));
      if (!p || !band) return null;
      p.score_band = band;
      if (p.mode === 'daily') {
        const from = input.from ?? 'direct';
        if (!oneOf(FROMS, from)) return null;
        p.from = from;
      }
      const depth = input.depth ?? '1';
      if (!oneOf(DEPTHS, depth)) return null;
      p.depth = depth;
      return p;
    }
    case 'daily_complete': {
      const site = (input.site ?? currentSite()) as unknown;
      const from = input.from ?? 'direct';
      if (!oneOf(SITES, site) || !oneOf(GAMES, input.game) || !oneOf(FROMS, from)) return null;
      if (typeof input.signed_in !== 'boolean' || !oneOf(STREAK_BUCKETS, input.streak_bucket)) return null;
      return { site, game: input.game, signed_in: input.signed_in, streak_bucket: input.streak_bucket, from };
    }
    case 'share_click': {
      const site = (input.site ?? currentSite()) as unknown;
      if (!oneOf(SITES, site) || !oneOf(SURFACES, input.surface)) return null;
      // The fan card is not a game: its share carries no game.
      if (input.game === undefined) return input.surface === 'fancard' ? { site, surface: input.surface } : null;
      if (!oneOf(GAMES, input.game)) return null;
      return { site, game: input.game, surface: input.surface };
    }
    case 'result_signin_click': {
      const site = (input.site ?? currentSite()) as unknown;
      if (!oneOf(SITES, site) || !oneOf(GAMES, input.game)) return null;
      return { site, game: input.game };
    }
    case 'cross_promo_click': {
      const site = (input.site ?? currentSite()) as unknown;
      if (!oneOf(SITES, site) || !oneOf(CROSS_FROM, input.from) || !oneOf(CROSS_TARGETS, input.to)) return null;
      return { site, from: input.from, to: input.to };
    }
    case 'debate_vote': {
      // A debate vote and where it was cast (the result screen is `result`). Enum only, no debate id.
      const site = (input.site ?? currentSite()) as unknown;
      if (!oneOf(SITES, site) || !oneOf(FROMS, input.from)) return null;
      return { site, from: input.from };
    }
    case 'claim_funnel': {
      const site = (input.site ?? currentSite()) as unknown;
      if (!oneOf(SITES, site) || !oneOf(CLAIM_STEPS, input.step) || !oneOf(CLAIM_SURFACES, input.surface)) return null;
      const p: Props = { site, step: input.step, surface: input.surface };
      if (input.reason !== undefined) {
        if (!oneOf(CLAIM_REASONS, input.reason)) return null;
        p.reason = input.reason;
      }
      if (input.moved !== undefined) {
        if (typeof input.moved !== 'number' || !Number.isFinite(input.moved) || input.moved < 0) return null;
        p.moved = Math.min(Math.round(input.moved), 10000);
      }
      return p;
    }
    default:
      return null;
  }
}

function ev(name: string, input: Record<string, unknown>): boolean {
  if (typeof window === 'undefined') return false;
  const props = buildEvent(name, input);
  if (!props) return false;
  try {
    track(name, props);
    return true;
  } catch {
    // Analytics must never break the app. A dropped event is always cheaper
    // than a broken result screen.
    return false;
  }
}

export const analytics = {
  gameStart: (i: PlayInput): boolean => ev('game_start', { ...i }),

  gameComplete: (i: PlayInput & { score: number; max: number }): boolean =>
    ev('game_complete', { ...i, depth: visitDepth() }),

  shareClick: (surface: Surface, game?: Game): boolean => ev('share_click', { surface, game }),

  // `from` also accepts 'community' so the community page can attribute its
  // war-map CTA and daily cards without a new event name.
  crossPromo: (from: GameType | 'community' | 'verse', to: CrossPromoTarget): boolean => ev('cross_promo_click', { from, to }),

  /** A vote of the daily debate, and the surface it came from (the quiz result screen is `result`). */
  debateVote: (from: From): boolean => ev('debate_vote', { from }),

  signinClick: (game: Game): boolean => ev('result_signin_click', { game }),

  dailyComplete: (i: { game: Game; signedIn: boolean; streak: number; from?: From; site?: Site }): boolean =>
    ev('daily_complete', { game: i.game, signed_in: i.signedIn, streak_bucket: streakBucket(i.streak), from: i.from ?? readFrom(), site: i.site }),

  // W3b - the claim funnel. ONE name carrying a `step`. Props stay enum/number only, no PII:
  // `surface` is where the block was, `reason` is a fixed refusal code, `moved` is a row count.
  claimFunnel: (
    step: 'shown' | 'started' | 'completed' | 'refused',
    surface: ClaimSurface,
    detail?: { reason?: ClaimRefusal; moved?: number },
  ): boolean => ev('claim_funnel', { step, surface, reason: detail?.reason, moved: detail?.moved }),
};
