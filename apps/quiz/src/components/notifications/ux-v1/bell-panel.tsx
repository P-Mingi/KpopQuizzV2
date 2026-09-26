'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { setUnread } from '@/lib/notifications-store';
import { applyRead, applyRemove, fetchNotifications, markOneRead, onNotificationEvents } from '@/lib/ux-v1/p11/actions';
import { bellAgo, spokenAgo, targetOf } from '@/lib/ux-v1/p11/notifications';

import type { P11Notification } from '@/lib/ux-v1/p11/notifications';

// P11 bell panel (DESIGN-SPEC 16.5 "bell (panel with the latest 6, Mark all read,
// See all)", prototype #bellpop, state `bell`). Rendered by A0's bell popover
// (components/layout/ux-v1/ux-nav-actions.tsx) through the BellPanel slot with
// exactly the slot props; A0 keeps the trigger, the frame, the header and the
// "See all notifications" link. Rows: the viewer's latest 6 notifications from the
// live GET /api/notifications (limit 6), unread = pink dot + bold title, "2h ago";
// opening a row marks it read through the live mark-read call and goes to its
// target (the notifications page when it has none).

export interface BellPanelProps {
  unread: number;
  onClose: () => void;
}

export const BELL_LIMIT = 6;

// Last answer of this session: reopening the panel shows it at once, then refreshes.
let cache: P11Notification[] | null = null;

function plainClick(e: React.MouseEvent): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function BellPanel({ unread, onClose }: BellPanelProps): React.ReactElement {
  const [items, setItems] = useState<P11Notification[] | null>(cache);
  const [failed, setFailed] = useState(false);
  // The unread count the list was last read for.
  const readFor = useRef<number | null>(null);

  // Read on open, and again when the unread count grows while the panel is open
  // (the nav polls it every 90 s): a new notification then shows up in the list.
  useEffect(() => {
    if (readFor.current !== null && unread <= readFor.current) { readFor.current = unread; return; }
    let live = true;
    void fetchNotifications(BELL_LIMIT).then((p) => {
      if (!live) return;
      if (!p) { setFailed(true); return; }
      readFor.current = p.unreadCount;
      cache = p.notifications;
      setItems(p.notifications);
      setFailed(false);
      setUnread(p.unreadCount);
    });
    return () => { live = false; };
  }, [unread]);

  // Follow reads and removals made anywhere (Mark all read, the page).
  useEffect(() => onNotificationEvents(
    (d) => setItems((prev) => { const next = prev ? applyRead(prev, d) : prev; cache = next; return next; }),
    (d) => setItems((prev) => { const next = prev ? applyRemove(prev, d) : prev; cache = next; return next; }),
  ), []);

  if (!items) {
    if (failed) return <p className="ux-bellpop-empty p11-bempty" data-p11="bell">Could not load your notifications. <Link href="/notifications" className="ux-lnk" onClick={onClose}>Open the page</Link></p>;
    return <div className="p11-bell is-loading" aria-busy="true" data-p11="bell"><span className="ux-sr">Loading notifications</span></div>;
  }
  if (items.length === 0) {
    return <p className="ux-bellpop-empty p11-bempty" data-p11="bell">Nothing here yet. New activity shows up here.</p>;
  }

  return (
    <ul className="p11-bell" aria-label="Latest notifications" data-p11="bell">
      {items.slice(0, BELL_LIMIT).map((n) => {
        const t = targetOf(n);
        const open = (e: React.MouseEvent): void => {
          markOneRead(n);
          if (plainClick(e)) onClose();
        };
        const inner = (
          <>
            <span className={`p11-bu${n.is_read ? ' is-read' : ''}`} aria-hidden="true" />
            <span className="p11-bb">
              <span className="p11-bt">{n.is_read ? null : <span className="ux-sr">Unread: </span>}{n.is_read ? n.title : <b>{n.title}</b>}</span>
              <span className="p11-btm"><span aria-hidden="true">{bellAgo(n.created_at)}</span><span className="ux-sr">, {spokenAgo(n.created_at)}</span></span>
            </span>
          </>
        );
        return (
          <li key={n.id}>
            {t?.external
              ? <a className="p11-brow" href={t.href} target="_blank" rel="noopener noreferrer" onClick={open}>{inner}</a>
              : <Link className="p11-brow" href={t?.href ?? '/notifications'} onClick={open}>{inner}</Link>}
          </li>
        );
      })}
    </ul>
  );
}
