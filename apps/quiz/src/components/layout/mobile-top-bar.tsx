'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Mascot } from '@/components/ui/mascot';

interface NavProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
}

export function MobileTopBar(): React.ReactElement | null {
  const pathname = usePathname();
  const [state, setState] = useState<{ profile: NavProfile | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d) => { if (!cancelled) setState(d); })
      .catch(() => { if (!cancelled) setState({ profile: null }); });
    return () => { cancelled = true; };
  }, []);

  if (pathname.startsWith('/q/')) return null;
  if (pathname.match(/\/games\/this-or-that\/[^/]+$/)) return null;
  if (pathname.match(/\/games\/name-all\/[^/]+$/)) return null;

  const profile = state?.profile ?? null;
  const initial = profile
    ? (profile.display_name || profile.username || 'K').charAt(0).toUpperCase()
    : null;

  return (
    <header className="mobile-top-bar">
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
        <Mascot variant="default" size={22} />
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          KpopQuiz
        </span>
      </Link>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {/* Search - same footprint as the + button (desktop parity), outline style
          so it reads as secondary next to the pink Create. */}
      <Link
        href="/search"
        aria-label="Search"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 9999, flexShrink: 0,
          background: 'var(--bg-surface)', color: 'var(--text-secondary)',
          border: '1px solid var(--border)', textDecoration: 'none',
        }}
      >
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
        </svg>
      </Link>

      {/* Create moved here from the bottom bar (which now ends on Community), so
          it stays one tap away on every mobile screen. */}
      <Link
        href="/create"
        aria-label="Create a quiz"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 9999, flexShrink: 0,
          background: 'var(--brand-btn)', color: '#fff', textDecoration: 'none',
          boxShadow: '0 3px 10px rgba(232,69,122,0.3)',
        }}
      >
        <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>

      {state === null ? (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 72, height: 32, borderRadius: 10,
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
          }}
        />
      ) : profile ? (
        <Link href="/profile" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '3px 10px 3px 3px', borderRadius: 9999,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          textDecoration: 'none',
        }}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              width={24}
              height={24}
              referrerPolicy="no-referrer"
              style={{
                width: 24, height: 24, borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0, display: 'block',
                background: profile.avatar_bg,
              }}
            />
          ) : (
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: profile.avatar_bg, color: profile.avatar_text,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 10, flexShrink: 0,
            }}>{initial}</span>
          )}
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
            {profile.display_name || profile.username}
          </span>
        </Link>
      ) : (
        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '7px 14px', borderRadius: 10,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-primary)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600,
        }}>
          Sign in
        </Link>
      )}
      </div>
    </header>
  );
}
