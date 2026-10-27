'use client';

// Run O1, lot (b), lane LB (A5): the reader's spoiler progress on one series, shared by every island of the page
// (the shield, the labels of the quiz cards, the characters row, the interstitial of a quiz).
//
// Where it lives: signed in, in `series_progress` (RLS: own rows); as a guest, in localStorage `anime.spoiler.v1`
// (cookies.md 7). No cookie. With no stored value the reader sees the spoiler-free view, which is also what the
// server renders (the page is cached and the same for everyone); the islands refine it after mount.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { SPOILER_FREE_VIEW, parseProgress, readGuestProgress, writeGuestProgress } from '@/lib/anime/spoilers';

import type { SpoilerProgress } from '@/lib/anime/types';

interface Snap {
  readonly progress: SpoilerProgress;
  /** A value was stored (guest store or account); false is the default spoiler-free view. */
  readonly stored: boolean;
}

const FREE: Snap = { progress: SPOILER_FREE_VIEW, stored: false };
const snaps = new Map<string, Snap>();
const loadedGuest = new Set<string>();
const loadedAccount = new Set<number>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => { listeners.delete(l); };
}
function put(slug: string, snap: Snap): void {
  const cur = snaps.get(slug);
  if (cur && cur.stored === snap.stored && cur.progress.arc === snap.progress.arc && cur.progress.scope === snap.progress.scope) return;
  snaps.set(slug, snap);
  emit();
}

/** Read the guest store once per series (a later change from another tab comes through the storage event). */
function loadGuest(slug: string): void {
  if (loadedGuest.has(slug)) return;
  loadedGuest.add(slug);
  const p = readGuestProgress(slug);
  if (p) put(slug, { progress: p, stored: true });
}

async function loadAccount(slug: string, groupId: number): Promise<void> {
  if (loadedAccount.has(groupId)) return;
  loadedAccount.add(groupId);
  try {
    const { createBrowserClient } = await import('@/lib/supabase/client');
    const { data, error } = await createBrowserClient().from('series_progress').select('medium, arc_ord').eq('group_id', groupId).maybeSingle();
    if (error || !data) return;
    const p = parseProgress({ arc: (data as { arc_ord: number }).arc_ord, scope: (data as { medium: string }).medium });
    if (p) put(slug, { progress: p, stored: true });
  } catch {
    loadedAccount.delete(groupId);
  }
}

async function saveAccount(groupId: number, progress: SpoilerProgress): Promise<boolean> {
  try {
    const { createBrowserClient } = await import('@/lib/supabase/client');
    const db = createBrowserClient();
    const { data: auth } = await db.auth.getUser();
    if (!auth.user) return false;
    const { error } = await db.from('series_progress').upsert(
      { user_id: auth.user.id, group_id: groupId, medium: progress.scope, arc_ord: progress.arc, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,group_id' },
    );
    return !error;
  } catch {
    return false;
  }
}

let storageBound = false;
function bindStorage(): void {
  if (storageBound || typeof window === 'undefined') return;
  storageBound = true;
  window.addEventListener('storage', () => {
    for (const slug of loadedGuest) {
      const p = readGuestProgress(slug);
      if (p) put(slug, { progress: p, stored: true });
    }
  });
}

export interface SpoilerProgressState {
  readonly progress: SpoilerProgress;
  readonly stored: boolean;
  /** False on the server and until the guest store was read: then `progress` is the spoiler-free view. */
  readonly ready: boolean;
  readonly signedIn: boolean;
  setProgress(next: SpoilerProgress): Promise<void>;
}

/**
 * The progress of the reader on one series, and a setter that writes it where it belongs. `signedInGiven` is for a
 * caller that already knows the session (the shield's `signedIn` prop); else it follows the shell's /api/auth/me.
 */
export function useSpoilerProgress(seriesSlug: string, groupId: number, signedInGiven?: boolean): SpoilerProgressState {
  const [ready, setReady] = useState(false);
  const me = useUxMe();
  const signedIn = signedInGiven ?? Boolean(me?.profile);
  const snap = useSyncExternalStore(subscribe, () => snaps.get(seriesSlug) ?? FREE, () => FREE);

  useEffect(() => {
    bindStorage();
    loadGuest(seriesSlug);
    setReady(true);
  }, [seriesSlug]);
  useEffect(() => {
    if (signedIn) void loadAccount(seriesSlug, groupId);
  }, [signedIn, seriesSlug, groupId]);

  const setProgress = useCallback(async (next: SpoilerProgress): Promise<void> => {
    put(seriesSlug, { progress: next, stored: true });
    if (signedIn && (await saveAccount(groupId, next))) return;
    writeGuestProgress(seriesSlug, next);
  }, [seriesSlug, groupId, signedIn]);

  return { progress: snap.progress, stored: snap.stored, ready, signedIn, setProgress };
}
