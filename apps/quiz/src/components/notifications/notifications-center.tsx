'use client';

import { useEffect, useState } from 'react';

import { Mascot } from '@/components/ui/mascot';
import { NotificationCard } from '@/components/profile/notifications-strip';

import type { NotificationRow } from '@/app/api/notifications/route';

// Notification center (Workstream M, M1.10). Full list, newest first, mark-read.
// Reuses /api/notifications + /api/notifications/mark-read + the shared
// NotificationCard rendering. No parallel system.
export function NotificationsCenter(): React.ReactElement {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/notifications?limit=50', { credentials: 'include' });
        if (!res.ok) return;
        const data: { notifications: NotificationRow[]; unreadCount: number } = await res.json();
        if (cancelled) return;
        setItems(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
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
    setUnread(0);
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({}),
      });
    } catch {
      // UI already updated
    } finally {
      setMarking(false);
    }
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
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <li key={n.id}><NotificationCard notification={n} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
