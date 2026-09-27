// P11 (UX v11.2): the calls of the notifications page and the bell panel. Client
// only. These are the live notifications center's calls, unchanged (same
// endpoints, same methods, same bodies; components/notifications/notifications-center.tsx):
//   read       GET  /api/notifications?limit=N[&offset=M]
//   mark read  POST /api/notifications/mark-read  {}  (all)  or  { ids: [id] }
//   dismiss    DELETE /api/notifications          { id }
//   mute quiz  POST /api/notifications/prefs      { muteQuiz: quizId }
// and the same shared unread store (lib/notifications-store.ts) the nav bell reads,
// so the dot, the page and the panel agree. Nothing here writes anything else.

import { decrementUnread, setUnread } from '@/lib/notifications-store';

import type { P11Notification } from './notifications';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export interface P11Page {
  notifications: P11Notification[];
  unreadCount: number;
  hasMore: boolean;
}

/** One page of the viewer's notifications (newest first), or null when the read failed. */
export async function fetchNotifications(limit: number, offset = 0): Promise<P11Page | null> {
  try {
    const q = offset > 0 ? `limit=${limit}&offset=${offset}` : `limit=${limit}`;
    const res = await fetch(`/api/notifications?${q}`, { credentials: 'include' });
    if (!res.ok) return null;
    const d = (await res.json()) as { notifications?: P11Notification[]; unreadCount?: number; hasMore?: boolean };
    return { notifications: d.notifications ?? [], unreadCount: d.unreadCount ?? 0, hasMore: d.hasMore ?? false };
  } catch {
    return null;
  }
}

// Page <-> bell sync: both views keep their own list and follow these events, so a
// row read in the bell is read on the page (and the other way round) at once.
export const P11_READ_EVENT = 'p11:notifications-read';
export const P11_REMOVE_EVENT = 'p11:notifications-removed';
export type P11ReadDetail = { ids: string[] } | { all: true };
export interface P11RemoveDetail { ids: string[] }

function emit<T>(name: string, detail: T): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<T>(name, { detail }));
}

/** Mark every notification read (the live center's "Mark all read"). */
export function markAllRead(): void {
  setUnread(0);
  emit<P11ReadDetail>(P11_READ_EVENT, { all: true });
  void fetch('/api/notifications/mark-read', { method: 'POST', headers: JSON_HEADERS, credentials: 'include', body: JSON.stringify({}), keepalive: true }).catch(() => {});
}

/** Mark one unread notification read (opening it, or "Mark as read"). */
export function markOneRead(n: Pick<P11Notification, 'id' | 'is_read'>): void {
  if (n.is_read) return;
  decrementUnread(1);
  emit<P11ReadDetail>(P11_READ_EVENT, { ids: [n.id] });
  void fetch('/api/notifications/mark-read', { method: 'POST', headers: JSON_HEADERS, credentials: 'include', body: JSON.stringify({ ids: [n.id] }), keepalive: true }).catch(() => {});
}

/** Dismiss (delete) one of the viewer's notifications. */
export function dismissNotification(n: Pick<P11Notification, 'id' | 'is_read'>): void {
  if (!n.is_read) decrementUnread(1);
  emit<P11RemoveDetail>(P11_REMOVE_EVENT, { ids: [n.id] });
  void fetch('/api/notifications', { method: 'DELETE', headers: JSON_HEADERS, credentials: 'include', body: JSON.stringify({ id: n.id }) }).catch(() => {});
}

/** Mute a quiz: its notifications leave the list (the live center's rule) and
 *  the mig-122 gate stops new ones. `removed` = the loaded rows of that quiz. */
export function muteQuiz(quizId: string, removed: Pick<P11Notification, 'id' | 'is_read'>[]): void {
  const unread = removed.filter((r) => !r.is_read).length;
  if (unread > 0) decrementUnread(unread);
  emit<P11RemoveDetail>(P11_REMOVE_EVENT, { ids: removed.map((r) => r.id) });
  void fetch('/api/notifications/prefs', { method: 'POST', headers: JSON_HEADERS, credentials: 'include', body: JSON.stringify({ muteQuiz: quizId }) }).catch(() => {});
}

/** Apply a read event to a list (returns the same array when nothing changed). */
export function applyRead<T extends Pick<P11Notification, 'id' | 'is_read'>>(items: T[], d: P11ReadDetail): T[] {
  if ('all' in d) return items.some((n) => !n.is_read) ? items.map((n) => (n.is_read ? n : { ...n, is_read: true })) : items;
  const ids = new Set(d.ids);
  return items.some((n) => ids.has(n.id) && !n.is_read) ? items.map((n) => (ids.has(n.id) && !n.is_read ? { ...n, is_read: true } : n)) : items;
}

export function applyRemove<T extends Pick<P11Notification, 'id'>>(items: T[], d: P11RemoveDetail): T[] {
  const ids = new Set(d.ids);
  return items.some((n) => ids.has(n.id)) ? items.filter((n) => !ids.has(n.id)) : items;
}

/** Subscribe to the page <-> bell events; returns the unsubscribe. */
export function onNotificationEvents(onRead: (d: P11ReadDetail) => void, onRemove: (d: P11RemoveDetail) => void): () => void {
  const r = (e: Event): void => onRead((e as CustomEvent<P11ReadDetail>).detail);
  const x = (e: Event): void => onRemove((e as CustomEvent<P11RemoveDetail>).detail);
  window.addEventListener(P11_READ_EVENT, r);
  window.addEventListener(P11_REMOVE_EVENT, x);
  return () => { window.removeEventListener(P11_READ_EVENT, r); window.removeEventListener(P11_REMOVE_EVENT, x); };
}
