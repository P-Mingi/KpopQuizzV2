'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { formatRelativeDate } from '@/lib/utils';

import type { NotificationRow } from '@/app/api/notifications/route';

/**
 * Notification strip shown at the top of the owner's profile page. Fetches
 * their notifications on mount, renders the top 5, and exposes a "Mark all
 * read" action. Hides itself entirely when there's nothing to show.
 */
export function NotificationsStrip(): React.ReactElement | null {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/notifications?limit=10');
        if (!res.ok) return;
        const data: { notifications: NotificationRow[]; unreadCount: number } = await res.json();
        if (cancelled) return;
        setItems(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      } catch {
        // Non-critical; hide strip on failure
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleMarkAllRead(): Promise<void> {
    if (marking || unread === 0) return;
    setMarking(true);
    // Optimistic update
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
    } catch {
      // Ignore - UI already updated
    } finally {
      setMarking(false);
    }
  }

  if (!loaded || items.length === 0) return null;

  const visible = items.slice(0, 5);

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider text-ghost">
          Notifications{' '}
          {unread > 0 && (
            <span className="ml-1 inline-block px-1.5 py-px rounded-full bg-accent text-white text-[9px] font-bold">
              {unread}
            </span>
          )}
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={marking}
            className="text-[10px] font-medium text-accent hover:text-accent-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {visible.map((n) => (
          <li key={n.id}>
            <NotificationCard notification={n} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function NotificationCard({ notification }: { notification: NotificationRow }): React.ReactElement {
  const icon = iconFor(notification.type);

  const inner = (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors ${
        notification.is_read
          ? 'bg-surface border-default'
          : 'bg-accent-bg border-accent hover:border-accent-hover'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          notification.is_read ? 'bg-elevated text-tertiary' : 'bg-accent text-white'
        }`}
      >
        <span className="text-[12px] font-bold">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[11px] font-semibold truncate ${
            notification.is_read ? 'text-secondary' : 'text-accent-hover'
          }`}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-[10px] text-ghost truncate">{notification.body}</p>
        )}
      </div>
      <span className="text-[9px] text-ghost flex-shrink-0">
        {formatRelativeDate(notification.created_at)}
      </span>
    </div>
  );

  // Link to the quiz if the notification is attached to one.
  if (notification.quiz_slug) {
    return (
      <Link href={`/q/${notification.quiz_slug}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function iconFor(type: NotificationRow['type']): string {
  switch (type) {
    case 'milestone':
      return '!';
    case 'rating':
      return '*';
    case 'comment':
      return 'c';
    case 'trending':
      return '^';
    default:
      return '.';
  }
}
