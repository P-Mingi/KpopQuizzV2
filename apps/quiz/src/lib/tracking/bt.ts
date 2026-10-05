'use client';

// V12 blindtest run tracking, client side (SYSTEM.md section 1).
//
// trackBtRun() is the ONLY way a blindtest UI records a run: the legacy hub game,
// the legacy playlist player, every v11 flow (playlists, groups, themes, daily,
// challenge) and later ranked and live. It posts to POST /api/track/bt-run:
//   start   when the first clip really plays (a browser that never plays audio is
//           not a run),
//   finish  on the results screen (completed = true, fetch keepalive) or when the
//           player quits or leaves the page (completed = false, navigator.sendBeacon).
//
// Its own switch: NEXT_PUBLIC_BT_TRACKING (default off). Off = nothing is sent and
// the endpoint answers 404. It does not depend on the v11 or v12 flags.
//
// Fire and forget: a failed, blocked or refused call never reaches the game. No
// personal data: a random run id, the browser's random anon id (lib/anon-id.ts,
// the same one plays.anon_id carries), and what was played. This module is
// client-safe and also holds the vocabulary the server validates against
// (lib/tracking/bt-server.ts).

import { getAnonId } from '@/lib/anon-id';

import { BT_TRACKING, BT_TRACK_ENDPOINT, UUID_RE, btSourceFor, buildBtPayload } from './bt-shared';

import type { BtRunEvent, BtRunSource } from './bt-shared';

export { BT_TRACKING, BT_TRACK_ENDPOINT, BT_MODES, BT_SOURCES, bestCombo, btPlaylistId, btSourceFor, buildBtPayload, utcDate } from './bt-shared';
export type { BtRunContext, BtRunEvent, BtRunMode, BtRunPayload, BtRunResult, BtRunSong, BtRunSource, BtPlaylistInput } from './bt-shared';

// ---------------------------------------------------------------------------
// Browser side.
// ---------------------------------------------------------------------------

/** A fresh run id, or null when the browser cannot make one (the run is then not tracked). */
export function newBtRunId(): string | null {
  if (!BT_TRACKING || typeof window === 'undefined') return null;
  try {
    return crypto.randomUUID();
  } catch {
    return null;
  }
}

/** Page language for `bt_runs.locale` (the `lang` of <html>, 'en' when unknown). */
export function btLocale(): string {
  if (typeof document === 'undefined') return 'en';
  const lang = (document.documentElement.lang || 'en').toLowerCase();
  return /^[a-z]{2}(-[a-z]{2})?$/.test(lang) ? lang : 'en';
}

/** Source of a run started on the current page. */
export function btSourceHere(kind: 'free' | 'daily' | 'challenge'): BtRunSource {
  if (typeof window === 'undefined') return 'other';
  return btSourceFor(kind, window.location.pathname, window.location.search);
}

/** The `c` code of a challenge link, read before the page drops it from the URL. */
export function btChallengeCodeHere(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = (new URLSearchParams(window.location.search).get('c') ?? '').toUpperCase();
    return /^[A-Z0-9]{4,12}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

// One start and one finish per run id, whatever the UI does (Strict Mode double
// effects, a quit followed by pagehide, a results effect that runs twice).
const started = new Set<string>();
const finished = new Set<string>();

/** Test hook: forget the sent ids. */
export function resetBtTrackingForTests(): void {
  started.clear();
  finished.clear();
}

/**
 * Record one event of a run. Returns true when a request was handed to the
 * browser. Never throws and never waits: the game does not depend on it.
 *
 * A finish with `completed: false` goes through navigator.sendBeacon so it
 * survives the page going away; the others use fetch with keepalive.
 */
export function trackBtRun(event: BtRunEvent): boolean {
  if (!BT_TRACKING || typeof window === 'undefined') return false;
  try {
    if (!UUID_RE.test(event.run_id)) return false;
    const seen = event.event === 'start' ? started : finished;
    if (seen.has(event.run_id)) return false;
    // A finished run never starts again (a late 'playing' event after a quit).
    if (event.event === 'start' && finished.has(event.run_id)) return false;
    seen.add(event.run_id);

    const body = JSON.stringify(buildBtPayload(event, getAnonId()));
    if (event.event === 'finish' && !event.completed && typeof navigator.sendBeacon === 'function') {
      // text/plain keeps the beacon a "simple" request; the route parses the text as JSON.
      if (navigator.sendBeacon(BT_TRACK_ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return true;
    }
    void fetch(BT_TRACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'same-origin',
    }).catch(() => { /* tracking never breaks a run */ });
    return true;
  } catch {
    return false;
  }
}
