import Link from 'next/link';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

// Standalone Blindtest of the Day leaderboard: today's board visible without
// playing, plus a date switcher to browse past days. Public + cookie-free reads
// (get_daily_bt_leaderboard is SECURITY DEFINER). Dynamic because it reads the
// ?date query param.

interface LbRow {
  rank: number;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  time_ms: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(s: string | undefined): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function prettyDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function formatSecs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function rowName(r: LbRow): string {
  return r.display_name || r.username || 'Anonymous';
}

export const metadata: Metadata = {
  title: 'Blindtest of the Day Leaderboard',
  description: 'See who topped the K-pop Blindtest of the Day. Daily ranking by score, fastest time breaks ties.',
  alternates: { canonical: '/blindtest/leaderboard' },
  robots: { index: false, follow: true },
};

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function BlindtestLeaderboardPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  const { date: dateParam } = await searchParams;
  const today = todayUtc();
  // Clamp to a real date, never the future.
  let date = isValidDate(dateParam) ? dateParam : today;
  if (date > today) date = today;

  const db = createServiceRoleClient();

  const [lbRes, earliestRes] = await Promise.all([
    safeFetch(
      Promise.resolve(db.rpc('get_daily_bt_leaderboard', { p_date: date })),
      { data: [] } as { data: unknown },
      '[blindtest-lb] get_daily_bt_leaderboard',
    ),
    safeFetch(
      Promise.resolve(db.from('daily_blindtests').select('date').order('date', { ascending: true }).limit(1)),
      { data: [] } as { data: unknown },
      '[blindtest-lb] earliest date',
    ),
  ]);

  const rows = ((lbRes.data ?? []) as Array<Record<string, unknown>>).map((r): LbRow => ({
    rank: Number(r.rank),
    user_id: String(r.user_id),
    username: (r.username as string | null) ?? null,
    display_name: (r.display_name as string | null) ?? null,
    avatar_url: (r.avatar_url as string | null) ?? null,
    score: Number(r.score),
    time_ms: Number(r.time_ms),
  }));

  const earliest = ((earliestRes.data ?? []) as Array<{ date: string }>)[0]?.date ?? today;
  const prevDate = shiftDate(date, -1);
  const nextDate = shiftDate(date, 1);
  const canPrev = prevDate >= earliest;
  const canNext = date < today;
  const isToday = date === today;

  const medal = ['#E8B64C', '#B9BFC9', '#C88A54'];

  return (
    <div style={{ paddingTop: 16, paddingBottom: 40, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Blindtest', href: '/blindtest' },
          { label: 'Leaderboard' },
        ]}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 4 }}>
        <span style={{ display: 'inline-flex', color: 'var(--blind)' }} aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </span>
        <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: 'var(--txt1)' }}>
          Blindtest of the Day
        </h1>
      </div>
      <p style={{ fontSize: 13, color: 'var(--txt2)', marginBottom: 16 }}>
        Same 10 songs for everyone. Ranked by score; fastest total time breaks ties.
      </p>

      {/* Date switcher */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 4px', marginBottom: 12, borderBottom: '1px solid var(--border)' }}>
        {canPrev ? (
          <Link href={`/blindtest/leaderboard?date=${prevDate}`} className="btn-outline" style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none' }} aria-label="Previous day">
            {'←'} Prev
          </Link>
        ) : <span style={{ width: 72 }} aria-hidden="true" />}

        <div style={{ textAlign: 'center', minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--txt1)' }}>{isToday ? 'Today' : prettyDate(date)}</div>
          {isToday && <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{prettyDate(date)}</div>}
        </div>

        {canNext ? (
          <Link href={`/blindtest/leaderboard?date=${nextDate}`} className="btn-outline" style={{ padding: '6px 12px', fontSize: 13, textDecoration: 'none' }} aria-label="Next day">
            Next {'→'}
          </Link>
        ) : <span style={{ width: 72 }} aria-hidden="true" />}
      </div>

      {/* Board */}
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--txt3)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt2)' }}>No scores {isToday ? 'yet today' : 'on this day'}.</p>
          {isToday && (
            <Link href="/blindtest?daily=true" className="btn-primary" style={{ display: 'inline-block', marginTop: 14, textDecoration: 'none' }}>
              Be the first to play
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map((r) => {
            const top = r.rank <= 3 ? medal[r.rank - 1]! : null;
            return (
              <div
                key={r.user_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                }}
              >
                <span style={{ width: 26, textAlign: 'center', fontSize: 14, fontWeight: 800, color: top ?? 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>
                  {r.rank}
                </span>
                {r.username ? (
                  <Link href={`/u/${r.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                    {r.avatar_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={r.avatar_url} alt="" width={32} height={32} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-alt)', flexShrink: 0 }} aria-hidden="true" />}
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rowName(r)}</span>
                  </Link>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-alt)', flexShrink: 0 }} aria-hidden="true" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt1)' }}>{rowName(r)}</span>
                  </div>
                )}
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--txt1)', fontVariantNumeric: 'tabular-nums' }}>{r.score}/10</span>
                <span style={{ width: 52, textAlign: 'right', fontSize: 12, color: 'var(--txt3)', fontVariantNumeric: 'tabular-nums' }}>{formatSecs(r.time_ms)}</span>
              </div>
            );
          })}
        </div>
      )}

      {isToday && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link href="/blindtest?daily=true" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Play today&apos;s blindtest
          </Link>
        </div>
      )}
    </div>
  );
}
