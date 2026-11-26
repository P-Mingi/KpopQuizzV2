// Daily games (step 1): the shapes the dle functions of Postgres return (019-dle-core.sql). Pure types, no I/O. The app never
// compares two entities: it shows the statuses dle_guess sends back.

export type DleLocale = 'en' | 'fr';

/** A column's result for one guess. near: the yellow cell (same parent group, mother company, a year or two off). */
export type DleStatus = 'correct' | 'near' | 'wrong' | 'unknown';
/** From the guess to the target: up = the target is higher (later, younger generation number). */
export type DleArrow = 'up' | 'down' | null;

export type DleColumnKind = 'single' | 'multi' | 'number' | 'ordinal';

/**
 * A column value: v the value or values, p the parents (sub-unit's group, agency's mother company), l the words to show when v is a number that stands for something
 * (an arc or a saga order, a series order, "No bounty" for 0; 024). The comparison never reads l. A bounty never revealed is the text "Unknown" (L37), not 0.
 */
export interface DleValue {
  readonly v: string | number | readonly (string | number)[] | null;
  readonly p?: readonly string[];
  readonly l?: string;
}

export interface DleCell {
  readonly key: string;
  readonly status: DleStatus;
  readonly arrow: DleArrow;
}

export interface DleGuess {
  readonly id: string;
  readonly result: readonly DleCell[];
  /** L42: a guess of the right anime also carries its cells of step 2 (Otakudle only). */
  readonly step2?: readonly DleStepCell[];
}

export interface DlePublicEntity {
  readonly id: string;
  readonly name: string;
  readonly attrs: Readonly<Record<string, DleValue>>;
  /** Storage path of the 96 px WebP, only when its licence is verified; null: the client shows a designed card. */
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
  /** L40: the order in which this play found the answer that day (won plays only); absent before L40 is applied. */
  readonly solve_rank?: number | null;
  /** L40: the plays of the day; absent before L40 is applied. */
  readonly players_today?: number;
  /** L42 (Otakudle): 1 while no guess is a character of the right anime, 2 from the first one. Absent: the one board game. */
  readonly step?: 1 | 2;
  /** L42, from step 2: the slug and the title of the anime, the guess that found it, the guesses that are its characters, how many characters it has in the pool, and the columns of step 2. */
  readonly series?: string;
  readonly series_label?: string;
  readonly step1_guesses?: number;
  readonly step2_guesses?: number;
  readonly step2_total?: number;
  readonly step2_columns?: readonly DleStepColumn[];
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
  /** L40: the plays of the day whatever the floor of 100 on `stats` (the client shows it from 10); absent before L40 is applied. */
  readonly players_today?: number;
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

// ---- Otakudle in two steps (L42, owner request of 2026-11-26). Every field is absent before L42 is applied: the client then plays the one board game.

/** A value of a column of step 2: v, and l (the words of an ordinal step or an arc, in English) with lf (in French when it differs). */
export interface DleStepValue {
  readonly v: string | number | readonly (string | number)[] | null;
  readonly l?: string;
  readonly lf?: string;
}

/** One cell of step 2: the status against the target and the value of the guessed character. */
export interface DleStepCell extends DleCell {
  readonly value?: DleStepValue | null;
}

/** A column of step 2, in the order of the board. label and help are in English and French for the columns of L42a; the columns of One Piece and Dragon Ball carry none (the app has their words). */
export interface DleStepColumn {
  readonly key: string;
  readonly kind: DleColumnKind;
  readonly near?: number;
  readonly label?: Readonly<Record<DleLocale, string>>;
  readonly help?: Readonly<Record<DleLocale, string>>;
}
