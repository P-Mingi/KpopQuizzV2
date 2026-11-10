// Home v4 (2026-11-10, HOME-AUDIT.md P1-3): the honest daily counter. The two daily games (Kpopdle, Otakudle) are finished on this device, so
// their state comes from this device's finished plays (lib/dle/local.ts readHistory, the same read as the badge of the Daily games tab and
// of /daily) and, for a game still being played, from what dle_day says about this browser's token (the same call as the board of /daily). The
// quizzes of the day are finished on their own sites: for a signed-in fan the server knows (lib/site/hub/home-done.ts). "x of y played today"
// counts only what can be finished here, so it can reach y of y. Pure: no browser, no storage of its own.
import type { DleGameId } from '@/lib/dle/games';
import type { LocalHistory } from '@/lib/dle/local';

/** The two games of the home, in the order the cards and "Play next" take them. */
export const DAY_GAMES = ['kpopdle', 'otakudle'] as const;
export type DayGame = (typeof DAY_GAMES)[number];

/** The game of lib/dle/games.ts each card is. */
export const DAY_GAME_ID: Readonly<Record<DayGame, DleGameId>> = { kpopdle: 'kpopdle-idol', otakudle: 'otakudle' };

export type GameState =
  | { readonly kind: 'todo' }
  | { readonly kind: 'prog'; readonly guesses: number }
  | { readonly kind: 'done'; readonly won: boolean; readonly guesses: number };

export const TODO: GameState = { kind: 'todo' };

/** The state of one game today: a finished play of this device wins over a play in progress, which wins over nothing. */
export function gameState(history: LocalHistory, progress: Readonly<Partial<Record<DayGame, number>>>, game: DayGame, today: string): GameState {
  const play = history[DAY_GAME_ID[game]]?.[today];
  if (play) return { kind: 'done', won: play.won, guesses: play.guesses };
  const guesses = progress[game];
  return guesses !== undefined && guesses > 0 ? { kind: 'prog', guesses } : TODO;
}

export interface DayCounts {
  readonly done: number;
  readonly total: number;
  readonly left: number;
  /** The first game of the list not finished, or null when every game is (the quizzes of the day are not "next": they have their own rows). */
  readonly next: DayGame | null;
}

/**
 * The counter of the day. `games` are the games of the home (none while the daily games are closed), `quizzes` the quizzes of the day the
 * server tracks for this fan (none for a guest: the server cannot know). total = games + quizzes, so done can reach total.
 */
export function dayCounts(states: Readonly<Record<DayGame, GameState>>, games: readonly DayGame[], quizzes: { readonly total: number; readonly done: number }): DayCounts {
  const gamesDone = games.filter((g) => states[g].kind === 'done').length;
  const total = games.length + quizzes.total;
  const done = gamesDone + quizzes.done;
  return { done, total, left: total - done, next: games.find((g) => states[g].kind !== 'done') ?? null };
}
