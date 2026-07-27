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
            <span className="ml-1 inline-block px-1.5 py-px rounded-full bg-btn text-white text-[9px] font-bold">
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

const MUTE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M13.73 21a2 2 0 0 1-3.46 0" /><path d="M18.63 13A17.9 17.9 0 0 1 18 8" /><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" /><path d="M18 8a6 6 0 0 0-9.33-5" /><line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const X_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export function NotificationCard({ notification, onMute, onDismiss, onOpen }: {
  notification: NotificationRow;
  onMute?: (quizId: string) => void;
  onDismiss?: (id: string) => void;
  onOpen?: () => void;
}): React.ReactElement {
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
          notification.is_read ? 'bg-elevated text-tertiary' : 'bg-btn text-white'
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

  // The content routes to the click-through URL (admin DM, follower profile),
  // else the linked quiz. External URLs open in a new tab.
  const href = notification.link_url ?? (notification.quiz_slug ? `/q/${notification.quiz_slug}` : null);
  const external = href ? /^https?:\/\//.test(href) : false;
  const openProps = onOpen ? { onClick: onOpen } : {};
  const linked = href
    ? external
      ? <a href={href} target="_blank" rel="noopener noreferrer" {...openProps} className="block flex-1 min-w-0">{inner}</a>
      : <Link href={href} {...openProps} className="block flex-1 min-w-0">{inner}</Link>
    : <div className="flex-1 min-w-0">{inner}</div>;

  const showMute = onMute && notification.quiz_id;
  const showDismiss = !!onDismiss;
  if (!showMute && !showDismiss) return linked;

  // Actions ride alongside the content so the card stays one click target while
  // mute/dismiss are separate buttons (they do not trigger the link).
  return (
    <div className="flex items-stretch gap-1">
      {linked}
      <div className="flex flex-col items-center justify-center gap-1 shrink-0">
        {showMute && (
          <button
            type="button"
            aria-label="Mute notifications for this quiz"
            title="Mute this quiz"
            onClick={() => onMute?.(notification.quiz_id as string)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-tertiary hover:text-accent hover:bg-elevated transition-colors cursor-pointer"
          >
            {MUTE_ICON}
          </button>
        )}
        {showDismiss && (
          <button
            type="button"
            aria-label="Dismiss notification"
            title="Dismiss"
            onClick={() => onDismiss?.(notification.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-tertiary hover:text-primary hover:bg-elevated transition-colors cursor-pointer"
          >
            {X_ICON}
          </button>
        )}
      </div>
    </div>
  );
}

function iconFor(type: NotificationRow['type']): string {
  switch (type) {
    case 'milestone':
      return '!';
    case 'rating':
      return '*';
    case 'comment':
      return 'c';
    case 'admin_dm':
      return '@';
    case 'new_follower':
      return '+';
    case 'streak_milestone':
      return 'S';
    case 'group_mastered':
      return 'M';
    case 'followed_new_quiz':
      return 'Q';
    case 'badge_earned':
      return 'B';
    case 'cheer':
      return '!';
    default:
      return '.';
  }
}
