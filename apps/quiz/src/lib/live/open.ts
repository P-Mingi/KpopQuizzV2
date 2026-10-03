// Is the live blindtest open? One answer for every page that shows a door to it
// (the /blindtest live band, the landings, the theme pages, the group hub tile).
// The probe is the one GET /api/live makes (a real GET read on live_rooms through
// the store's ping, never a HEAD count). Fail closed: any error, a missing table,
// a missing key or a probe that throws means "not open". With the v12 flag off it
// answers false without any read. The answer is kept briefly per server instance
// so a page render does not cost one read per door.

export const LIVE_OPEN_TTL_MS = 60_000;

export interface LiveOpenProbe {
  /** The v12 flag (isUxV12). Off: false, and the probe never runs. */
  enabled: () => boolean;
  /** Resolves true only when the mode answered open (GET /api/live would be 200). */
  probe: () => Promise<boolean>;
  now?: () => number;
  ttlMs?: number;
}

/** A cached, fail closed "is live open" function around one probe. */
export function liveOpenChecker(deps: LiveOpenProbe): () => Promise<boolean> {
  const now = deps.now ?? Date.now;
  const ttl = deps.ttlMs ?? LIVE_OPEN_TTL_MS;
  let cached: { at: number; open: boolean } | null = null;
  return async () => {
    if (!deps.enabled()) return false;
    if (cached && now() - cached.at < ttl) return cached.open;
    let open = false;
    try {
      open = (await deps.probe()) === true;
    } catch {
      open = false;
    }
    cached = { at: now(), open };
    return open;
  };
}

/**
 * The browser side (the join page, issue C2-003): does this answer of GET /api/live
 * say the mode is not open? Only a clear no (503 not_live, or 404 with the flag
 * off); a network error (status 0) or a server error leaves the form, which then
 * fails soft on its own answer.
 */
export function liveAnswerSaysClosed(r: { ok: boolean; status: number; error?: string | null }): boolean {
  return !r.ok && (r.error === 'not_live' || r.status === 404);
}
