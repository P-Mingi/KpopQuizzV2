'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Sidebar footer user row (DESIGN-SPEC 3): avatar, name, streak. Client island
// (keeps the shell layout static). Reads the same endpoints the rest of the app
// uses - GET /api/auth/me for the profile, GET /api/daily/streak for the streak -
// so no new writer and no invented identity. Guests get a "Sign in" row.
interface MeProfile {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  avatar_bg?: string | null;
  avatar_text?: string | null;
}

export function UxSidebarUser(): React.ReactElement {
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) { setProfile(d?.profile ?? d ?? null); setLoaded(true); } })
      .catch(() => { if (alive) setLoaded(true); });
    fetch('/api/daily/streak')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && typeof d.streak === 'number') setStreak(d.streak); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (loaded && !profile?.username && !profile?.display_name) {
    return (
      <Link href="/login" className="uxv1-user uxv1-user-guest">
        <span className="uxv1-user-avatar uxv1-user-avatar-guest" aria-hidden="true">K</span>
        <span className="uxv1-user-name">Sign in</span>
      </Link>
    );
  }

  const name = profile?.display_name || profile?.username || '';
  const initial = (name || 'K').charAt(0).toUpperCase();

  return (
    <Link href="/profile" className="uxv1-user" aria-label="Your passport">
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="uxv1-user-avatar" src={profile.avatar_url} alt="" width={30} height={30} />
      ) : (
        <span
          className="uxv1-user-avatar"
          style={{ background: profile?.avatar_bg ?? 'var(--uxv1-tint2)', color: profile?.avatar_text ?? 'var(--uxv1-ink)' }}
          aria-hidden="true"
        >{initial}</span>
      )}
      <span className="uxv1-user-meta">
        <span className="uxv1-user-name">{name || 'You'}</span>
        {streak && streak >= 1 ? <span className="uxv1-user-streak">{streak} day streak</span> : null}
      </span>
    </Link>
  );
}
