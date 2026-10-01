// Ranked blindtest: every rule number in one place (DESIGN-SPEC 15.4 + 17.6).
// Pure module: no DB, no Next imports. The pending migration
// (docs/pending-migrations/v11-p7-ranked.sql) mirrors the few numbers the SQL
// side needs (best 5, Master 12,000, top 100); keep them in sync.

/** Songs in one ranked run. */
export const ROUND_COUNT = 10;
/** "Which song is this?" rounds per run. */
export const SONG_ROUNDS = 6;
/** "Who sings this?" rounds per run. */
export const ARTIST_ROUNDS = 4;
/** Server-drawn difficulty mix per run, by community accuracy. */
export const DIFFICULTY_MIX = { easy: 4, medium: 4, hard: 2 } as const;

/** Clip length and answer window. */
export const ROUND_MS = 10_000;
/** Full speed bonus below this answer time. */
export const FULL_SPEED_MS = 2_000;
/** Points for a right answer before speed and combo. */
export const BASE_POINTS = 100;
/** Speed bonus ceiling. */
export const MAX_SPEED_BONUS = 100;
/** Combo multiplier in tenths: x1.0 for the first right answer, +0.1 per right answer in a row. */
export const COMBO_BASE_TENTHS = 10;
export const COMBO_STEP_TENTHS = 1;
/** Combo cap, x2.0. */
export const COMBO_CAP_TENTHS = 20;

/** Season score = sum of the best N runs of the season. */
export const BEST_RUNS = 5;
/** The first N finished runs of a season are placement runs. */
export const PLACEMENT_RUNS = 5;
/** Ranked runs a player may START per UTC day (quit and abandoned runs count). */
export const DAILY_RUN_LIMIT = 15;
/** Season length. */
export const SEASON_LENGTH_DAYS = 56;
/** Legend = the top N Masters of the season, recomputed nightly. */
export const LEGEND_SLOTS = 100;

// ---- fair play -------------------------------------------------------------
/** No human names a song this fast after the clip starts: faster is rejected. */
export const MIN_ANSWER_MS = 300;
/** Server-measured time includes the round trip and the clip load; this much is forgiven. */
export const LATENCY_ALLOWANCE_MS = 1_500;
/** The client may not claim more time than the server saw pass, beyond this clock jitter. */
export const CLOCK_TOLERANCE_MS = 250;
/** An issued run must be finished within this window, else it is recorded as a quit run. */
export const RUN_TTL_MS = 15 * 60_000;

// ---- song draw -------------------------------------------------------------
/** A song's accuracy is trusted once it has been answered this many times. */
export const MIN_PLAYS_FOR_ACCURACY = 20;
/** Accuracy at or above this is easy. */
export const EASY_ACCURACY = 0.7;
/** Accuracy at or above this (and below easy) is medium; below is hard. */
export const MEDIUM_ACCURACY = 0.4;
/** Wrong options shown next to the right one. */
export const DISTRACTORS = 3;
