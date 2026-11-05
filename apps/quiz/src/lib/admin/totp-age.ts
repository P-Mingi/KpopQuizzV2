// ADMIN-2 (owner, 2026-10-30; PLAN-ADMIN-2 section 5): a new TOTP code after 12 hours. The verified access token carries the `amr` claim,
// the list of the ways the session was proven, each with the time (UNIX seconds) it last was; auth-js hands it back as
// currentAuthenticationMethods. The `totp` entry holds the time of the last code. This module is pure (no clock of its own, no import):
// the guard passes the time, so the tests freeze it.

/** How long a code stays good: 12 hours. */
export const TOTP_MAX_AGE_MS = 12 * 60 * 60 * 1000;
/** A timestamp this far ahead of our clock is not believed (clock drift between the auth server and the function). */
export const TOTP_FUTURE_SKEW_MS = 60 * 1000;

/** GoTrue writes `totp` (auth-js lists `mfa/totp` too). Both mean a code of an authenticator app was verified. */
const TOTP_METHODS: ReadonlySet<string> = new Set(['totp', 'mfa/totp']);

/**
 * The time (ms) of the most recent verified TOTP entry, or null. A bare string entry (the RFC 8176 form of a custom hook) has no time and is
 * ignored, like any entry without a finite timestamp: only a dated `totp` entry proves a code was typed.
 */
export function lastTotpAt(methods: unknown): number | null {
  if (!Array.isArray(methods)) return null;
  let last: number | null = null;
  for (const entry of methods as unknown[]) {
    if (!entry || typeof entry !== 'object') continue;
    const { method, timestamp } = entry as { method?: unknown; timestamp?: unknown };
    if (typeof method !== 'string' || !TOTP_METHODS.has(method)) continue;
    if (typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp <= 0) continue;
    const ms = timestamp * 1000;
    if (last === null || ms > last) last = ms;
  }
  return last;
}

/** True when a TOTP code was verified no more than 12 hours before `nowMs`. No `totp` entry, or one from the future, is not fresh. */
export function totpIsFresh(methods: unknown, nowMs: number): boolean {
  const at = lastTotpAt(methods);
  if (at === null) return false;
  const age = nowMs - at;
  return age >= -TOTP_FUTURE_SKEW_MS && age <= TOTP_MAX_AGE_MS;
}
