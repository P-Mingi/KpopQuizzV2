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
      aria-label="Edit profile and settings"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        padding: '7px 13px', borderRadius: 999, whiteSpace: 'nowrap',
        background: 'var(--brand-light)', color: 'var(--brand-dark)',
        border: '1px solid color-mix(in srgb, var(--brand) 28%, var(--border))',
        fontSize: 13, fontWeight: 700, textDecoration: 'none',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      Edit profile
    </Link>
  );
}
