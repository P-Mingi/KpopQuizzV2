// Run PWA (docs/o1/PWA-PLAN.md, section 4): what the install banner remembers on the device, and the rule that decides whether it shows.
// One localStorage key, no account, no server. Every read and write survives a storage that throws (a private window, blocked site data) or
// holds garbage: the banner then simply has nothing remembered, and since a visit can never be counted it never shows.
// Pure over a storage it is given and a clock, so the tests run it on a Map.

import { isNoBannerPath } from './paths';

import type { PwaApp } from './config';

export interface KeyStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PWA_KEY = 'kq:pwa:v1';
/** The daily games keep their finished plays here (lib/dle/local.ts K_HISTORY): read only, a win there is a daily game win. */
export const DLE_HISTORY_KEY = 'dle:v1:history';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Dismissed means gone for 30 days (plan, section 4). */
export const DISMISS_MS = 30 * DAY_MS;
/** A new visit starts after 30 minutes of silence. The banner never shows on the first one. */
export const VISIT_GAP_MS = 30 * 60 * 1000;
export const MIN_VISITS = 2;
/** Finished quizzes that earn the banner (the plan says 2 or 3). */
export const FINISHED_QUIZZES = 3;
/** After the kill worker has run, the page does not register again for a day. */
export const KILL_QUIET_MS = DAY_MS;
/** The state is saved at most this often while a visit goes on. */
export const TOUCH_MS = 60 * 1000;

export interface PwaState {
  /** Visits so far, this one included. */
  readonly visits: number;
  /** The last time a page of this device was open, ms. */
  readonly lastSeen: number;
  /** Quizzes finished on this device since the banner started counting. */
  readonly quizzes: number;
  /** The banner stays away until this time, ms. */
  readonly dismissedUntil: number;
  /** The app was installed (appinstalled, or the user accepted the install window). */
  readonly installed: boolean;
  /** The kill worker ran: no registration and no banner until this time, ms. */
  readonly killedUntil: number;
}

export const EMPTY_STATE: PwaState = { visits: 0, lastSeen: 0, quizzes: 0, dismissedUntil: 0, installed: false, killedUntil: 0 };

const num = (v: unknown, max = Number.MAX_SAFE_INTEGER): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? Math.floor(v) : 0);

/** The stored state, cleaned: a missing, broken or foreign value is the empty state. */
export function readState(store: KeyStore | null): PwaState {
  try {
    const raw = store?.getItem(PWA_KEY);
    if (!raw) return EMPTY_STATE;
    const o = JSON.parse(raw) as Record<string, unknown> | null;
    if (!o || typeof o !== 'object' || Array.isArray(o)) return EMPTY_STATE;
    return {
      visits: num(o.visits, 1_000_000), lastSeen: num(o.lastSeen), quizzes: num(o.quizzes, 1_000_000),
      dismissedUntil: num(o.dismissedUntil), installed: o.installed === true, killedUntil: num(o.killedUntil),
    };
  } catch {
    return EMPTY_STATE;
  }
}

/** Saves the state; false when the storage refuses (nothing is remembered then). */
export function writeState(store: KeyStore | null, state: PwaState): boolean {
  try {
    store?.setItem(PWA_KEY, JSON.stringify(state));
    return store !== null;
  } catch {
    return false;
  }
}

/** Counts the visit this moment belongs to: a new one after VISIT_GAP_MS of silence (or the first ever), else the same one, kept alive. */
export function touchVisit(state: PwaState, now: number): PwaState {
  if (state.lastSeen === 0 || now - state.lastSeen > VISIT_GAP_MS || now < state.lastSeen) return { ...state, visits: state.visits + 1, lastSeen: now };
  return now - state.lastSeen >= TOUCH_MS ? { ...state, lastSeen: now } : state;
}

export const withFinishedQuiz = (s: PwaState): PwaState => ({ ...s, quizzes: Math.min(s.quizzes + 1, 1_000_000) });
export const withDismissal = (s: PwaState, now: number): PwaState => ({ ...s, dismissedUntil: now + DISMISS_MS });
export const withInstalled = (s: PwaState): PwaState => ({ ...s, installed: true });
export const withKill = (s: PwaState, now: number): PwaState => ({ ...s, killedUntil: now + KILL_QUIET_MS });

/** True when a finished play of the daily games on this device is a win (a read of lib/dle/local.ts's history, never a write). */
export function hasDailyWin(store: KeyStore | null): boolean {
  try {
    const raw = store?.getItem(DLE_HISTORY_KEY);
    if (!raw) return false;
    const games = JSON.parse(raw) as unknown;
    if (!games || typeof games !== 'object' || Array.isArray(games)) return false;
    for (const days of Object.values(games as Record<string, unknown>)) {
      if (!days || typeof days !== 'object' || Array.isArray(days)) continue;
      for (const play of Object.values(days as Record<string, unknown>)) {
        if (play && typeof play === 'object' && (play as { won?: unknown }).won === true) return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/** What the browser can offer: its own install window (kept beforeinstallprompt), the two gestures of iOS Safari, or nothing. */
export type InstallOffer = 'prompt' | 'ios' | null;

export interface DecisionContext {
  readonly app: PwaApp;
  readonly now: number;
  readonly state: PwaState;
  readonly pathname: string;
  /** The page is inside a frame (an embed): never. */
  readonly framed: boolean;
  /** display-mode standalone or the iOS home screen app: already installed. */
  readonly standalone: boolean;
  /** A full screen element, or the shell's game and creation modes. */
  readonly immersive: boolean;
  readonly dailyWin: boolean;
  readonly offer: InstallOffer;
}

export type Decision = { readonly show: false; readonly reason: string } | { readonly show: true; readonly kind: 'prompt' | 'ios' };

/** The whole rule of section 4, one reason per refusal, in the order the plan lists them. */
export function decide(c: DecisionContext): Decision {
  const no = (reason: string): Decision => ({ show: false, reason });
  if (c.framed) return no('framed');
  if (c.standalone) return no('standalone');
  if (c.state.installed) return no('installed');
  if (c.state.killedUntil > c.now) return no('killed');
  if (c.state.dismissedUntil > c.now) return no('dismissed');
  if (c.immersive) return no('immersive');
  if (isNoBannerPath(c.app, c.pathname)) return no('play-or-account-page');
  if (c.state.visits < MIN_VISITS) return no('first-visit');
  if (c.state.quizzes < FINISHED_QUIZZES && !c.dailyWin) return no('not-earned');
  if (c.offer === null) return no('nothing-to-offer');
  return { show: true, kind: c.offer };
}
