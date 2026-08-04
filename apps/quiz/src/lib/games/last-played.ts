// G-HUB v2 step 4: last-played memory. A tiny localStorage record of the last
// variant slug a player launched per game, so the hub's Play button can reopen
// exactly where they left off (default variant on first ever play). Client-only;
// every call is guarded so it is a no-op during SSR or when storage is blocked
// (private mode, quota). No PII, no cross-game data - just {game: slug}.

const KEY = 'kq:lastPlayed:v1';

export type LastPlayedGame = 'sort-it' | 'match-up' | 'name-them-all' | 'name-all';

function readAll(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Remember that `slug` was the last variant played for `game`. */
export function writeLastPlayed(game: LastPlayedGame, slug: string): void {
  if (typeof window === 'undefined' || !slug) return;
  try {
    const all = readAll();
    all[game] = slug;
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* storage blocked: last-played is a nicety, never required */
  }
}

/** The last variant slug played for `game`, or null if none / storage blocked. */
export function readLastPlayed(game: LastPlayedGame): string | null {
  const all = readAll();
  const v = all[game];
  return typeof v === 'string' && v.length > 0 ? v : null;
}
