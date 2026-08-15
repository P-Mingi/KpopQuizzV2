'use client';

// W3 PART A1 - the browser id.
//
// A random UUID, generated ONCE per browser and kept in localStorage. It is the
// only thing that lets a guest later put their name on runs they already made.
//
// It is NOT a fingerprint and must never become one: it is not derived from IP,
// user agent, screen size, timezone or anything else about the device. It is random,
// it belongs to the browser, and clearing site data ends it. That is by design, and
// it is why claiming can never reach back to the 36,158 guest plays made before this
// shipped: those rows carry no id and never will.
//
// `player_hash` (sha256(ip + day)) is deliberately NOT used for this: 199 of those
// hashes cover more than one run, the largest covers 15, so it would hand a signup
// strangers' runs made behind the same IP on the same day.

const KEY = 'nq_anon_id';

/** Get this browser's id, creating it on first use. Null when storage is unavailable. */
export function getAnonId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    // Private mode / storage blocked: play is NEVER gated on this. The run is
    // simply written with anon_id NULL, exactly as it was before W3.
    return null;
  }
}
