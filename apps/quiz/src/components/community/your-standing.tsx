'use client';

import { useEffect, useState } from 'react';

import { getTitleForLevel } from '@/lib/level-titles';
import { streakState } from '@/lib/streak';

// "Your standing" (Workstream M, M1.21). Personal, per-viewer CLIENT island so the
// hub stays static/ISR. Honest framing only: your Fan Level + progress + streak,
// NO percentile / rank / comparison. Renders nothing when signed out.
interface Me {
  level: number;
  progress: number;
  xp: number;
  daily_streak?: number;
  last_daily_date?: string | null;
}

export function YourStanding(): React.ReactElement | null {
  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then((d: { profile: Me | null }) => { if (!cancelled) { setMe(d.profile); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  if (!loaded || !me) return null;

  const title = getTitleForLevel(me.level);
  const streak = me.daily_streak ?? 0;
  const live = streakState(streak, me.last_daily_date ?? null) !== 'none';

  return (
    <div style={{ background: 'var(--brand-light)', border: '1px solid var(--brand)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--brand)', margin: '0 0 10px' }}>Your standing</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--brand)', lineHeight: 1, letterSpacing: '-0.03em', flexShrink: 0 }}>Lv {me.level}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--txt1)' }}>
            {title.en}<span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt3)', marginLeft: 6 }}>{title.kr}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 2 }}>
            You are climbing. {me.progress}% to Level {me.level + 1}{live && streak > 0 ? ` · ${streak}-day streak` : ''}.
          </div>
        </div>
      </div>
      <div style={{ height: 6, background: 'var(--surface)', borderRadius: 9999, overflow: 'hidden', marginTop: 12 }}>
        <div style={{ height: '100%', width: `${Math.max(2, me.progress)}%`, background: 'var(--brand)', borderRadius: 9999 }} />
      </div>
    </div>
  );
}
