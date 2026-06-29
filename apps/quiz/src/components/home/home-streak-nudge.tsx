'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { streakState, type StreakState } from '@/lib/streak';

// Home streak surface (Workstream M, M1.3). Client island: the per-user streak
// is fetched from /api/auth/me (same payload the TopNav chip already uses, no
// extra request), so the home page stays static/ISR. Renders NOTHING for the
// 'none' state (logged out / no streak / stale) - no empty or zero state. The
// nudge links to /daily (today's daily ritual). Real Mascot only.
export function HomeStreakNudge(): React.ReactElement | null {
  const [view, setView] = useState<{ state: StreakState; days: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d: { profile: { daily_streak?: number; last_daily_date?: string | null } | null }) => {
        if (cancelled) return;
        const p = d.profile;
        if (!p) { setView({ state: 'none', days: 0 }); return; }
        const days = p.daily_streak ?? 0;
        setView({ state: streakState(days, p.last_daily_date ?? null), days });
      })
      .catch(() => { if (!cancelled) setView({ state: 'none', days: 0 }); });
    return () => { cancelled = true; };
  }, []);

  if (!view || view.state === 'none') return null;

  const atRisk = view.state === 'at_risk';

  const base: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 14, margin: '4px 0 12px',
    border: '1px solid var(--border)',
    background: atRisk ? 'var(--brand-light)' : 'var(--surface)',
    textDecoration: 'none',
  };

  const inner = (
    <>
      <Mascot variant={atRisk ? 'default' : 'celebrate'} size={40} animate={atRisk ? 'bob' : 'none'} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt1)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
          Day {view.days} {atRisk ? '' : 'streak'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>
          {atRisk ? 'Play today to keep it alive' : 'See you tomorrow'}
        </div>
      </div>
      {atRisk && (
        <span aria-hidden="true" style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand)', flexShrink: 0 }}>{'→'}</span>
      )}
    </>
  );

  // At risk: actionable link to the daily ritual. Played today: quiet, static.
  return atRisk
    ? <Link href="/daily" style={base} aria-label={`Day ${view.days} streak. Play today to keep it alive.`}>{inner}</Link>
    : <div style={base}>{inner}</div>;
}
