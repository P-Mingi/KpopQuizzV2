'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Unread notification badge (Workstream M, M1.10). CLIENT island (reuses the
// TopNavProfile pattern) so the layout shell stays static/ISR. Renders nothing
// until it confirms the viewer is signed in; then polls the unread count on a
// sane interval. Links to the /notifications center.
const POLL_MS = 60_000;

export function NotificationBell(): React.ReactElement | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d: { profile: unknown }) => { if (!cancelled) setSignedIn(!!d.profile); })
      .catch(() => { if (!cancelled) setSignedIn(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    const load = (): void => {
      fetch('/api/notifications?limit=1', { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { unreadCount?: number } | null) => { if (!cancelled && d) setUnread(d.unreadCount ?? 0); })
        .catch(() => {});
    };
    load();
    const t = window.setInterval(load, POLL_MS);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [signedIn]);

  if (!signedIn) return null;

  return (
    <Link href="/notifications" aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'} style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none',
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      {unread > 0 && (
        <span style={{
          position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px',
          borderRadius: 9999, background: 'var(--brand-btn)', color: '#fff',
          fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}>{unread > 99 ? '99+' : unread}</span>
      )}
    </Link>
  );
}
