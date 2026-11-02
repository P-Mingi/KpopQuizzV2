// Daily games step 4: what stays on this device (board Reglages.dc.html: "Gardées sur cet appareil"): the browser token of the plays, the finished
// plays that make the stats and the streaks, and the settings. Pure over a storage it is given, so the tests run it on a Map. Every read and
// write survives a storage that throws (a private window) or holds garbage: the page keeps working with nothing remembered.
import { addDays } from './day';
import { builtGames } from './games';

import type { DleGameId } from './games';
import type { DleLocale } from './types';

export interface KeyStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const K_TOKEN = 'dle:v1:token';
const K_HISTORY = 'dle:v1:history';
const K_SETTINGS = 'dle:v1:settings';
/** The key of the "How far are you?" choice, which Otakudle no longer has (CR-026): never written again, still erased with the rest. */
const K_RETIRED_PROGRESS = 'dle:v1:progress';

function readJson(store: KeyStore, key: string): unknown {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : null;
  } catch {
    return null;
  }
}
function write(store: KeyStore, key: string, value: string): void {
  try { store.setItem(key, value); } catch { /* a full or blocked storage: this visit keeps its state in memory */ }
}

// ---- the token ------------------------------------------------------------------------------------------------------------------

/** A new token of the shape dle_check accepts (^[A-Za-z0-9_-]{16,64}$), from the browser's random source. */
export function newToken(random: (bytes: Uint8Array) => Uint8Array = (b) => globalThis.crypto.getRandomValues(b)): string {
  const bytes = random(new Uint8Array(24));
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  return Array.from(bytes, (b) => abc[b % 64]!).join('');
}

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{16,64}$/;

export function getToken(store: KeyStore): string {
  let t: string | null = null;
  try { t = store.getItem(K_TOKEN); } catch { t = null; }
  if (t && TOKEN_SHAPE.test(t)) return t;
  return resetToken(store);
}

/** dle_token_taken: this browser's token belongs to another account's play. A new one, never that play. */
export function resetToken(store: KeyStore): string {
  const t = newToken();
  write(store, K_TOKEN, t);
  return t;
}

// ---- the finished plays ---------------------------------------------------------------------------------------------------------

export interface LocalPlay { readonly won: boolean; readonly guesses: number }
export type LocalHistory = Readonly<Record<string, Readonly<Record<string, LocalPlay>>>>;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function cleanHistory(raw: unknown): LocalHistory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, Record<string, LocalPlay>> = {};
  for (const [game, days] of Object.entries(raw as Record<string, unknown>)) {
    if (!days || typeof days !== 'object' || Array.isArray(days)) continue;
    const clean: Record<string, LocalPlay> = {};
    for (const [date, play] of Object.entries(days as Record<string, unknown>)) {
      const p = play as { won?: unknown; guesses?: unknown } | null;
      if (DATE.test(date) && p && typeof p.won === 'boolean' && typeof p.guesses === 'number' && p.guesses > 0 && p.guesses <= 300) clean[date] = { won: p.won, guesses: p.guesses };
    }
    out[game] = clean;
  }
  return out;
}

export const readHistory = (store: KeyStore): LocalHistory => cleanHistory(readJson(store, K_HISTORY));

/** Records a play that is over; called again with the same day it changes nothing (the server's state is the truth). */
export function recordPlay(store: KeyStore, game: string, date: string, play: LocalPlay): LocalHistory {
  const h = readHistory(store);
  const next: LocalHistory = { ...h, [game]: { ...(h[game] ?? {}), [date]: play } };
  write(store, K_HISTORY, JSON.stringify(next));
  return next;
}

export interface GameStats {
  readonly plays: number;
  readonly wins: number;
  /** null with no win. */
  readonly average: number | null;
  readonly firstTry: number;
  readonly streak: number;
  readonly bestStreak: number;
  /** wins per number of guesses, index 0 = one guess; the last bucket holds the rest. */
  readonly histogram: readonly number[];
}

const HIST_BUCKETS = 8;

/** The longest run of consecutive days in a sorted list, and the run ending today or yesterday. */
function runs(dates: readonly string[], today: string): { current: number; best: number } {
  const sorted = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }
  const current = prev !== null && (prev === today || addDays(prev, 1) === today) ? run : 0;
  return { current, best };
}

export function gameStats(history: LocalHistory, game: string, today: string): GameStats {
  const days = history[game] ?? {};
  const plays = Object.values(days);
  const wins = plays.filter((p) => p.won);
  const histogram = Array.from({ length: HIST_BUCKETS }, () => 0);
  for (const w of wins) histogram[Math.min(w.guesses, HIST_BUCKETS) - 1]! += 1;
  const { current, best } = runs(Object.keys(days), today);
  return {
    plays: plays.length,
    wins: wins.length,
    average: wins.length ? wins.reduce((n, w) => n + w.guesses, 0) / wins.length : null,
    firstTry: wins.filter((w) => w.guesses === 1).length,
    streak: current,
    bestStreak: best,
    histogram,
  };
}

/** One streak per universe (v2 section 0): any finished game of the universe keeps it, a give-up too (board: "ta série tient quand même"). */
export function universeStreak(history: LocalHistory, games: readonly DleGameId[], today: string): number {
  const dates = games.flatMap((g) => Object.keys(history[g] ?? {}));
  return runs(dates, today).current;
}

/** The built games still to finish today, for the badge of the Burrow tab. */
export function gamesLeftToday(history: LocalHistory, today: string): number {
  return builtGames().filter((g) => !history[g.id]?.[today]).length;
}

// ---- the settings ---------------------------------------------------------------------------------------------------------------

export type LangChoice = 'auto' | DleLocale;
export interface DleSettings { readonly lang: LangChoice; readonly colorblind: boolean; readonly reducedMotion: boolean }
export const DEFAULT_SETTINGS: DleSettings = { lang: 'auto', colorblind: false, reducedMotion: false };

export function readSettings(store: KeyStore): DleSettings {
  const r = readJson(store, K_SETTINGS) as Partial<DleSettings> | null;
  if (!r || typeof r !== 'object') return DEFAULT_SETTINGS;
  return {
    lang: r.lang === 'fr' || r.lang === 'en' ? r.lang : 'auto',
    colorblind: r.colorblind === true,
    reducedMotion: r.reducedMotion === true,
  };
}
export function writeSettings(store: KeyStore, s: DleSettings): void {
  write(store, K_SETTINGS, JSON.stringify(s));
}

/**
 * The language rule (v2 section 4): a choice is kept; with none, a browser in French reads French, any other language reads English. It runs in
 * the browser only, never from the IP address, and a crawler always gets the page it asked for. Returns the locale to go to, or null to stay.
 */
export function languageTarget(choice: LangChoice, browserLanguage: string | undefined, current: DleLocale): DleLocale | null {
  const wanted: DleLocale = choice !== 'auto' ? choice : /^fr\b/i.test(browserLanguage ?? '') ? 'fr' : 'en';
  return wanted === current ? null : wanted;
}

// ---- transfer and erase ---------------------------------------------------------------------------------------------------------

/** The stats of this device as text, to paste on another device (board: "Transférer mes données"). */
export function exportData(store: KeyStore): string {
  return JSON.stringify({ v: 1, history: readHistory(store), settings: readSettings(store) });
}

/** Adds pasted stats to this device's; returns false for text that is not an export. A day this device already has stays. */
export function importData(store: KeyStore, text: string): boolean {
  let raw: { v?: unknown; history?: unknown; settings?: unknown };
  try { raw = JSON.parse(text) as typeof raw; } catch { return false; }
  if (!raw || raw.v !== 1) return false;
  const incoming = cleanHistory(raw.history);
  const mine = readHistory(store);
  const merged: Record<string, Record<string, LocalPlay>> = {};
  for (const g of new Set([...Object.keys(incoming), ...Object.keys(mine)])) merged[g] = { ...(incoming[g] ?? {}), ...(mine[g] ?? {}) };
  write(store, K_HISTORY, JSON.stringify(merged));
  return true;
}

export function eraseData(store: KeyStore): void {
  for (const k of [K_HISTORY, K_SETTINGS, K_TOKEN, K_RETIRED_PROGRESS]) {
    try { store.removeItem(k); } catch { /* nothing to erase */ }
  }
}
