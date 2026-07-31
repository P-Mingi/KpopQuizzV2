'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface NavProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
}

// Client island - replaces the old async server fetch in <TopNav>. By moving
// the cookie-reading Supabase call out of the SSR tree, the layout shell (and
// therefore every page that uses it) stays static/ISR-cacheable. Initial
// render is a sized placeholder so there's no layout shift on hydration.
export function TopNavProfile(): React.ReactElement {
  const [state, setState] = useState<{ profile: NavProfile | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d) => { if (!cancelled) setState(d); })
      .catch(() => { if (!cancelled) setState({ profile: null }); });
    return () => { cancelled = true; };
  }, []);

  // Pre-hydration / loading: render a fixed-size placeholder so the layout
  // doesn't jump when auth state arrives. Width matches the signed-in chip
  // roughly so logged-in users see no shift; for anonymous users we render
  // exactly the Sign-in button at the same width so likewise no shift.
  if (state === null) {
    return (
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 96, height: 36, borderRadius: 9999,
          background: 'var(--surface-alt)',
          border: '1px solid var(--border)',
          flexShrink: 0,
        }}
      />
    );
  }

  const profile = state.profile;
  if (!profile) {
    return (
      <Link href="/login" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 18px', borderRadius: 10,
        background: 'transparent', border: '1px solid var(--border)',
        color: 'var(--text-primary)', textDecoration: 'none',
        fontSize: 13, fontWeight: 600,
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>Sign in</Link>
    );
  }

  const initial = (profile.display_name || profile.username || 'K').charAt(0).toUpperCase();
  return (
    <Link href="/profile" style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '4px 12px 4px 4px', borderRadius: 9999,
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      textDecoration: 'none',
    }}>
      {profile.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt=""
          width={28}
          height={28}
          referrerPolicy="no-referrer"
          style={{
            width: 28, height: 28, borderRadius: '50%',
            objectFit: 'cover', flexShrink: 0, display: 'block',
            background: profile.avatar_bg,
          }}
        />
      ) : (
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          background: profile.avatar_bg, color: profile.avatar_text,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 12, flexShrink: 0,
        }}>{initial}</span>
      )}
      <span style={{
        fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
      }} className="top-nav-profile-name">
        {profile.display_name || profile.username}
      </span>
    </Link>
  );
}
