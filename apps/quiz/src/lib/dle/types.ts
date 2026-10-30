// Daily games (step 1): the shapes the dle functions of Postgres return (019-dle-core.sql). Pure types, no I/O. The app never
// compares two entities: it shows the statuses dle_guess sends back.

export type DleLocale = 'en' | 'fr';

/** A column's result for one guess. near: the striped cell (same parent group, mother company, a year or two off). */
export type DleStatus = 'correct' | 'near' | 'wrong' | 'unknown';
/** From the guess to the target: up = the target is higher (later, younger generation number). */
export type DleArrow = 'up' | 'down' | null;

export type DleColumnKind = 'single' | 'multi' | 'number' | 'ordinal';

/** A column value: v the value or values, p the parents (sub-unit's group, agency's mother company). */
export interface DleValue {
  readonly v: string | number | readonly (string | number)[] | null;
  readonly p?: readonly string[];
}

export interface DleCell {
  readonly key: string;
  readonly status: DleStatus;
  readonly arrow: DleArrow;
}

export interface DleGuess {
  readonly id: string;
  readonly result: readonly DleCell[];
}

export interface DlePublicEntity {
  readonly id: string;
  readonly name: string;
  readonly attrs: Readonly<Record<string, DleValue>>;
  /** Storage path of the 96 px WebP, only when its licence is verified; null: the client shows the initials. */
  readonly thumb: string | null;
}

export interface DleStats {
  readonly plays: number;
  readonly wins: number;
  readonly give_ups: number;
  /** guess_hist[n - 1]: wins in n guesses; the last bucket holds 20 and more. */
  readonly guess_hist: readonly number[];
}

/** dle_guess, dle_give_up and the `play` of dle_day. target and stats only once the play is over. */
export interface DlePlayState {
  readonly date: string;
  readonly game_no: number;
  readonly status: 'playing' | 'won' | 'given_up';
  readonly guesses: readonly DleGuess[];
  readonly hints: readonly { readonly key: string; readonly value: unknown }[];
  readonly target: DlePublicEntity | null;
  readonly stats: DleStats | null;
}

/** dle_day. yesterday only once yesterday is closed (03:00 UTC); stats null under 100 plays. */
export interface DleDay {
  readonly game: string;
  readonly now: string;
  readonly date: string;
  readonly game_no: number;
  readonly seconds_left: number;
  readonly yesterday: { readonly date: string; readonly game_no: number; readonly answer: DlePublicEntity } | null;
  readonly stats: DleStats | null;
  readonly play: DlePlayState | null;
}

export interface DlePoolEntity extends DlePublicEntity {
  readonly search: readonly string[];
}

/** dle_pool: the columns and every entity of the pool (never the targets' flag, the weights or the hints). */
export interface DlePool {
  readonly game: string;
  readonly universe: string;
  readonly attributes: readonly { readonly key: string; readonly kind: DleColumnKind; readonly near: number | null }[];
  readonly entities: readonly DlePoolEntity[];
}
