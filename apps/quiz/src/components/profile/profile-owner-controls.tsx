'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Owner-only controls (client island). Reuses the /api/auth/me pattern so the
// public /u/[username] page stays cookie-free / static. Renders nothing until it
// confirms the viewer owns this profile, then shows the settings entry.
export function ProfileOwnerControls({ profileUsername }: { profileUsername: string }): React.ReactElement | null {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d: { profile: { username: string } | null }) => {
        if (!cancelled) setIsOwner(d.profile?.username === profileUsername);
      })
      .catch(() => { if (!cancelled) setIsOwner(false); });
    return () => { cancelled = true; };
  }, [profileUsername]);

  if (!isOwner) return null;

  return (
    <Link
      href="/settings"
      aria-label="Settings"
      style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'transparent', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--txt1)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
    </Link>
  );
}
