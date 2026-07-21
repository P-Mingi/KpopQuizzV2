'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getTitleForLevel } from '@/lib/level-titles';
import { streakState } from '@/lib/streak';

// "Your standing" v2 (F2a / F1.10). Personal, per-viewer CLIENT island so the
// hub stays static/ISR. Honest framing only: Fan Level + progress + streak, plus
// two real-data extras baked from the server:
//   - your fandom's war-map rank this week (matched via your ult groups)
//   - one "N more plays to pass @username" nudge, ONLY from the real weekly board
//     and only when it has >= MIN_BOARD entries. No padded/fake usernames ever.
// Signed out: one quiet line, no card chrome.
const MIN_BOARD = 4;

interface Me {
  username: string;
  level: number;
  progress: number;
  xp: number;
  daily_streak?: number;
  last_daily_date?: string | null;
  ult_groups?: string[];
}

export interface FandomRank {
  slug: string;
  name: string;
  rank: number;
  delta: number | null;
}

export interface WeeklyStanding {
  username: string;
  plays: number;
}

export function YourStanding({
  fandomRanks = [],
  weeklyBoard = [],
}: {
  fandomRanks?: FandomRank[];
  weeklyBoard?: WeeklyStanding[];
}): React.ReactElement | null {
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

  if (!loaded) return null;

  // Signed out: a single quiet line, no card.
  if (!me) {
    return (
      <p style={{ fontSize: 13, color: 'var(--txt2)', margin: '0 0 12px' }}>
        <Link href="/login" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link> to see your standing.
      </p>
    );
  }

  const title = getTitleForLevel(me.level);
  const streak = me.daily_streak ?? 0;
  const live = streakState(streak, me.last_daily_date ?? null) !== 'none';

  // Your fandom this week: the best-ranked of your ult groups that actually
  // charted in the war map. Real rank, real delta, or nothing.
  const myUlts = new Set((me.ult_groups ?? []).map((s) => s.toLowerCase()));
  const myFandom = fandomRanks
    .filter((f) => myUlts.has(f.slug.toLowerCase()))
    .sort((a, b) => a.rank - b.rank)[0] ?? null;

  // Pass nudge: only from the REAL weekly board (getTopCreatorsThisWeek is not
  // padded), only when it has >= MIN_BOARD real entries, and only when someone
  // is directly ahead of you. Never a fabricated rival.
  let nudge: { gap: number; username: string } | null = null;
  if (weeklyBoard.length >= MIN_BOARD) {
    const i = weeklyBoard.findIndex((r) => r.username === me.username);
    if (i > 0) {
      const above = weeklyBoard[i - 1]!;
      const gap = above.plays - weeklyBoard[i]!.plays;
      if (gap > 0) nudge = { gap, username: above.username };
    }
  }

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

      {(myFandom || nudge) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {myFandom && (
            <Link href="#fandom-war" style={chip}>
              <strong style={{ color: 'var(--brand)' }}>{myFandom.name}</strong>
              <span>is #{myFandom.rank} this week</span>
              <DeltaGlyph delta={myFandom.delta} />
            </Link>
          )}
          {nudge && (
            <span style={{ ...chip, cursor: 'default' }}>
              <strong style={{ color: 'var(--brand)' }}>{nudge.gap}</strong>
              <span>more {nudge.gap === 1 ? 'play' : 'plays'} to pass @{nudge.username}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function DeltaGlyph({ delta }: { delta: number | null }): React.ReactElement | null {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: up ? '#1a9d63' : '#c0392b', fontWeight: 700 }} aria-label={`${up ? 'up' : 'down'} ${Math.abs(delta)} percent`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {up ? <polyline points="6 15 12 9 18 15" /> : <polyline points="6 9 12 15 18 9" />}
      </svg>
      {Math.abs(delta)}%
    </span>
  );
}

const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none',
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999,
  padding: '5px 11px', fontSize: 11.5, color: 'var(--txt2)', fontWeight: 500,
};
