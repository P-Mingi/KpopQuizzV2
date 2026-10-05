// F7a: a page that asks for a script file the server no longer has (a page kept by
// the browser from an earlier build) throws a ChunkLoadError while rendering, and the
// visitor gets "Something went wrong". Firefox reuses such a page: `next start` sends
// prerendered pages with `s-maxage=3600, stale-while-revalidate=31532400` and Firefox
// honours stale-while-revalidate on a page load, Chromium does not. One reload fetches
// the current page and its current files; a second failure on the same path shows the
// error as before (never a reload loop).

/** True for the error a missing or unreachable script file raises (webpack, Turbopack, ES import). */
export function isChunkLoadError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { name, message } = err as { name?: unknown; message?: unknown };
  if (name === 'ChunkLoadError') return true;
  const msg = typeof message === 'string' ? message : '';
  return /Failed to load chunk|Loading chunk [^ ]+ failed|Loading CSS chunk|error loading dynamically imported module|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg);
}

const KEY = 'kq-chunk-reload';
/** A reload counts for this long: a later failure on the same path may reload again. */
export const RELOAD_WINDOW_MS = 60_000;

interface Store { getItem(k: string): string | null; setItem(k: string, v: string): void }

/**
 * Read only: may `path` reload now? False when the same path was reloaded less than
 * RELOAD_WINDOW_MS ago, or when the store cannot be read (no proof that a loop cannot
 * start, so no reload). Safe to call while rendering.
 */
export function mayReload(store: Store | null, path: string, now: number): boolean {
  if (!store) return false;
  let raw: string | null;
  try { raw = store.getItem(KEY); } catch { return false; }
  let last: { path?: unknown; at?: unknown } | null = null;
  try { last = raw ? (JSON.parse(raw) as { path?: unknown; at?: unknown }) : null; } catch { last = null; }
  return !(last && last.path === path && typeof last.at === 'number' && now - last.at >= 0 && now - last.at < RELOAD_WINDOW_MS);
}

/** Whether to reload `path` now, recording the reload in `store` (false when the record cannot be kept). */
export function claimReload(store: Store | null, path: string, now: number): boolean {
  if (!store || !mayReload(store, path, now)) return false;
  try {
    store.setItem(KEY, JSON.stringify({ path, at: now }));
    return store.getItem(KEY) !== null;
  } catch {
    return false;
  }
}
