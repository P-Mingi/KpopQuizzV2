'use client';

import { useSyncExternalStore } from 'react';

// O1 item 5: a tiny shared unread-count store so the bell and the center agree
// and "mark all read" updates the bell instantly. Realtime is not enabled
// anywhere in the app, so this is the lighter shared-store + refetch-on-focus
// approach (NANO-safety over a greenfield realtime channel).

let unread = 0;
const listeners = new Set<() => void>();
function emit(): void { for (const l of listeners) l(); }

export function setUnread(n: number): void {
  const next = Math.max(0, n);
  if (next !== unread) { unread = next; emit(); }
}
export function decrementUnread(by = 1): void { setUnread(unread - by); }

/** Refetch the authoritative unread count from the API into the store. */
export async function refetchUnread(): Promise<void> {
  try {
    const r = await fetch('/api/notifications?limit=1', { credentials: 'include' });
    if (!r.ok) return;
    const d = (await r.json()) as { unreadCount?: number };
    setUnread(d.unreadCount ?? 0);
  } catch { /* non-critical */ }
}

function subscribe(cb: () => void): () => void { listeners.add(cb); return () => { listeners.delete(cb); }; }
function getSnapshot(): number { return unread; }

export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
