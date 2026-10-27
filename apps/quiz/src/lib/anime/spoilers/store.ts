// Run O1, lot (b), lane LB (A5): the guest store of the spoiler progress. cookies.md 7: localStorage key
// `anime.spoiler.v1` = {[seriesSlug]: {arc, scope}}. No cookie. Every access sits in a try/catch (private windows,
// blocked storage, a full quota), and a bad value reads as "no stored value" (the spoiler-free view).

import { ANIME_SPOILER_STORE_KEY, SPOILER_SHOW_ALL } from '../types';

import type { AnimeSpoilerStore, SpoilerMedium, SpoilerProgress } from '../types';

/** The part of the Storage interface the store uses (so a test passes a plain object). */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** A progress value, or null for anything that is not one (arc a whole number 0..SPOILER_SHOW_ALL, medium anime or manga). */
export function parseProgress(value: unknown): SpoilerProgress | null {
  if (typeof value !== 'object' || value === null) return null;
  const { arc, scope } = value as { arc?: unknown; scope?: unknown };
  if (typeof arc !== 'number' || !Number.isInteger(arc) || arc < 0 || arc > SPOILER_SHOW_ALL) return null;
  if (scope !== 'anime' && scope !== 'manga') return null;
  return { arc, scope: scope as SpoilerMedium };
}

/** The whole store from its raw string: only the well-formed entries, {} for anything else. */
export function parseStore(raw: string | null): AnimeSpoilerStore {
  if (!raw) return {};
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
    const out: Record<string, SpoilerProgress> = {};
    for (const [slug, v] of Object.entries(data)) {
      const p = parseProgress(v);
      if (p) out[slug] = p;
    }
    return out;
  } catch {
    return {};
  }
}

/** The stored progress of one series, or null when there is none (then the reader sees the spoiler-free view). */
export function readGuestProgress(seriesSlug: string, storage: KeyValueStorage | null = browserStorage()): SpoilerProgress | null {
  if (!storage) return null;
  try {
    return parseStore(storage.getItem(ANIME_SPOILER_STORE_KEY))[seriesSlug] ?? null;
  } catch {
    return null;
  }
}

/** Store one series' progress; true when it was written. Other series' entries are kept. */
export function writeGuestProgress(seriesSlug: string, progress: SpoilerProgress, storage: KeyValueStorage | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    const next = { ...parseStore(storage.getItem(ANIME_SPOILER_STORE_KEY)), [seriesSlug]: { arc: progress.arc, scope: progress.scope } };
    storage.setItem(ANIME_SPOILER_STORE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
