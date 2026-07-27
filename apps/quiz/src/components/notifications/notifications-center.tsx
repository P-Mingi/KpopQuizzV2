'use client';

import { useEffect, useState } from 'react';

import { Mascot } from '@/components/ui/mascot';
import { NotificationCard } from '@/components/profile/notifications-strip';
import { useUnreadCount, setUnread as setStoreUnread, decrementUnread } from '@/lib/notifications-store';

import type { NotificationRow } from '@/app/api/notifications/route';

// Notification center (Workstream M / O1). Full list, newest first, per-item
// mark-read + dismiss + mute, all synced to the shared unread store so the bell
// updates instantly. Reuses /api/notifications + mark-read + the shared card.
const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export function NotificationsCenter(): React.ReactElement {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [marking, setMarking] = useState(false);
  const unread = useUnreadCount();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/notifications?limit=50', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as { notifications: NotificationRow[]; unreadCount: number };
        if (cancelled) return;
        setItems(data.notifications ?? []);
        setStoreUnread(data.unreadCount ?? 0);
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function markAllRead(): Promise<void> {
    if (marking || unread === 0) return;
    setMarking(true);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setStoreUnread(0);
    try {
      await fetch('/api/notifications/mark-read', { method: 'POST', headers: JSON_HEADERS, credentials: 'include', body: JSON.stringify({}) });
    } catch { /* UI already updated */ } finally { setMarking(false); }
  }

  // O1 item 6: mark one read when its content is opened.
  function markOneRead(id: string): void {
    const item = items.find((n) => n.id === id);
    if (!item || item.is_read) return;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    decrementUnread(1);
    void fetch('/api/notifications/mark-read', { method: 'POST', headers: JSON_HEADERS, credentials: 'include', body: JSON.stringify({ ids: [id] }) }).catch(() => {});
  }

  // O1 item 6: dismiss (delete).
  async function dismiss(id: string): Promise<void> {
    const item = items.find((n) => n.id === id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    if (item && !item.is_read) decrementUnread(1);
    try {
      await fetch('/api/notifications', { method: 'DELETE', headers: JSON_HEADERS, credentials: 'include', body: JSON.stringify({ id }) });
    } catch { /* UI already updated */ }
  }

  async function muteQuiz(quizId: string): Promise<void> {
    const removedUnread = items.filter((n) => n.quiz_id === quizId && !n.is_read).length;
    setItems((prev) => prev.filter((n) => n.quiz_id !== quizId));
    if (removedUnread > 0) decrementUnread(removedUnread);
    try {
      await fetch('/api/notifications/prefs', { method: 'POST', headers: JSON_HEADERS, credentials: 'include', body: JSON.stringify({ muteQuiz: quizId }) });
    } catch { /* UI already updated */ }
  }

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-primary">
          Notifications{unread > 0 && <span className="ml-2 inline-block px-2 py-0.5 rounded-full bg-btn text-white text-xs font-bold align-middle">{unread}</span>}
        </h1>
        {unread > 0 && (
          <button type="button" onClick={() => void markAllRead()} disabled={marking}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors disabled:opacity-50 cursor-pointer">
            Mark all read
          </button>
        )}
      </div>

      {loaded && items.length === 0 ? (
        <div className="flex flex-col items-center text-center py-12">
          <Mascot variant="sleep" size={88} />
          <p className="text-sm text-secondary mt-3">No notifications yet. Play, create, and follow fans to fill this up.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" role="list" aria-label="Notifications">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationCard
                notification={n}
                onMute={(q) => void muteQuiz(q)}
                onDismiss={(id) => void dismiss(id)}
                onOpen={() => markOneRead(n.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
