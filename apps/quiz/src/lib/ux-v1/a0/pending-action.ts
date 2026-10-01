// Sign-in "continue the action" (DESIGN-SPEC 16.6): before the sign-in sheet
// sends a guest to Google / Discord / the magic link, the page stores WHAT it was
// doing (an action id + a small JSON payload, e.g. the draft id or the score to
// save). After /auth/callback brings them back to the same URL, the page calls
// takePendingAction(id) and continues. Client-only, localStorage (a magic link
// may open in a new tab), expires after 30 minutes, never holds secrets.

const KEY = 'ux:pending-action';
const TTL_MS = 30 * 60 * 1000;

export interface PendingAction {
  id: string;
  path: string;
  payload?: unknown;
  at: number;
}

export function setPendingAction(id: string, payload?: unknown): void {
  try {
    const a: PendingAction = { id, path: window.location.pathname + window.location.search, payload, at: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch { /* storage blocked: the action simply does not resume */ }
}

/** Returns and clears the pending action when it matches `id`, is fresh and was
 *  started on this path. Anything else stays untouched (or is dropped when stale). */
export function takePendingAction(id: string): PendingAction | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as PendingAction;
    if (!a || typeof a.at !== 'number' || Date.now() - a.at > TTL_MS) { localStorage.removeItem(KEY); return null; }
    if (a.id !== id) return null;
    const here = window.location.pathname + window.location.search;
    if (a.path.split('?')[0] !== here.split('?')[0]) return null;
    localStorage.removeItem(KEY);
    return a;
  } catch { return null; }
}

export function clearPendingAction(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
