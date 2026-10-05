import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { isAdmin } from '@/lib/admin';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { BT_TRACKING } from '@/lib/tracking/bt-shared';
import { isNotLiveError } from '@/lib/tracking/bt-server';

import type { Metadata } from 'next';

// /admin/blind-tests/runs - what the blindtest tracking recorded (SYSTEM.md 1).
//
// Follows NEXT_PUBLIC_BT_TRACKING alone (off = 404). Admin only, like the other
// admin pages. Every number comes from ONE call, bt_runs_admin_stats
// (docs/pending-migrations/v12-g1-bt-runs.sql): aggregated in SQL, test runs
// (is_test) and bots excluded, no personal data (counts only, a "player" is a
// distinct account or browser id and is never shown). A number that does not
// exist is not shown: before the SQL file is applied the page says so.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blindtest runs | Admin | KpopQuiz',
  robots: { index: false, follow: false },
};

interface Totals { runs: number; finished: number; completed: number; signed_in_runs: number; guest_runs: number; players: number; today: number }
interface DayRow { day: string; runs: number; completed: number; players: number }
interface SourceRow { source: string; runs: number; completed: number }
interface PlaylistRow { playlist: string; runs: number; completed: number }
interface ModeRow { mode: string; runs: number; completed: number }
interface PerPlayer { players: number; one: number; two_to_four: number; five_to_nine: number; ten_plus: number; max: number }
interface SongRow { title: string; artist: string | null; plays: number; correct_rate: number; median_ms: number | null }
interface Stats {
  days: number;
  generated_at: string;
  totals: Totals;
  by_day: DayRow[];
  by_source: SourceRow[];
  by_playlist: PlaylistRow[];
  by_mode: ModeRow[];
  runs_per_player: PerPlayer;
  top_songs: SongRow[];
  hardest_songs: SongRow[];
}

const WINDOWS = [7, 30, 90] as const;

const n = (v: number): string => v.toLocaleString('en-US');
/** "62%" or null when there is nothing to divide by (a rate of nothing is not shown). */
const rate = (part: number, whole: number): string | null => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : null);
const secs = (ms: number | null): string => (ms === null ? '-' : `${(ms / 1000).toFixed(1)}s`);

function Th({ children, right }: { children: React.ReactNode; right?: boolean }): React.ReactElement {
  return <th className={`py-2 px-3 text-xs font-medium text-[var(--text-tertiary)] ${right ? 'text-right' : 'text-left'}`}>{children}</th>;
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }): React.ReactElement {
  return <td className={`py-2 px-3 text-sm ${right ? 'text-right tabular-nums' : ''}`}>{children}</td>;
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="mb-8">
      <h2 className="text-sm font-medium mb-1">{title}</h2>
      {note ? <p className="text-xs text-[var(--text-tertiary)] mb-2">{note}</p> : null}
      <div className="border border-[var(--border)] rounded-lg overflow-x-auto">{children}</div>
    </section>
  );
}

function Empty(): React.ReactElement {
  return <p className="text-sm text-[var(--text-tertiary)] px-3 py-4">No run recorded in this window.</p>;
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="border border-[var(--border)] rounded-lg px-4 py-3">
      <p className="text-xl font-medium tabular-nums">{value}</p>
      <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
    </div>
  );
}

function RunsTable<T extends { runs: number; completed: number }>({ rows, head, label }: { rows: T[]; head: string; label: (r: T) => string }): React.ReactElement {
  if (rows.length === 0) return <Empty />;
  return (
    <table className="w-full">
      <thead><tr className="border-b border-[var(--border)]"><Th>{head}</Th><Th right>Runs</Th><Th right>Completed</Th><Th right>Completion</Th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={label(r)} className="border-b border-[var(--border)] last:border-b-0">
            <Td>{label(r)}</Td><Td right>{n(r.runs)}</Td><Td right>{n(r.completed)}</Td><Td right>{rate(r.completed, r.runs) ?? '-'}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SongsTable({ rows }: { rows: SongRow[] }): React.ReactElement {
  if (rows.length === 0) return <p className="text-sm text-[var(--text-tertiary)] px-3 py-4">Not enough plays yet.</p>;
  return (
    <table className="w-full">
      <thead><tr className="border-b border-[var(--border)]"><Th>Song</Th><Th right>Plays</Th><Th right>Right</Th><Th right>Median answer</Th></tr></thead>
      <tbody>
        {rows.map((s, i) => (
          <tr key={`${s.title}-${s.artist ?? ''}-${i}`} className="border-b border-[var(--border)] last:border-b-0">
            <Td>{s.title}{s.artist ? <span className="text-[var(--text-tertiary)]"> · {s.artist}</span> : null}</Td>
            <Td right>{n(s.plays)}</Td><Td right>{`${Math.round(s.correct_rate * 100)}%`}</Td><Td right>{secs(s.median_ms)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AdminBlindtestRunsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }): Promise<React.ReactElement> {
  if (!BT_TRACKING) notFound();

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const asked = Number((await searchParams).days);
  const days = (WINDOWS as readonly number[]).includes(asked) ? asked : 30;

  const { data, error } = await createServiceRoleClient().rpc('bt_runs_admin_stats', { p_days: days });
  const notLive = isNotLiveError(error);
  if (error && !notLive) console.error('bt_runs_admin_stats failed:', error.code ?? '', error.message ?? '');
  const stats = !error && data && typeof data === 'object' ? (data as Stats) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-1">
        <Link href="/admin" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">Admin</Link>
        <span className="text-xs text-[var(--text-tertiary)]">/</span>
        <h1 className="text-xl font-medium">Blindtest runs</h1>
      </div>
      <p className="text-xs text-[var(--text-tertiary)] mb-4">
        Real runs only: test runs (localhost, previews) and bots are excluded. Counts only, no personal data.
      </p>

      <nav className="flex gap-2 mb-6" aria-label="Window">
        {WINDOWS.map((w) => (
          <Link
            key={w}
            href={`/admin/blind-tests/runs?days=${w}`}
            aria-current={w === days ? 'page' : undefined}
            className={`px-3 py-1 rounded-full text-xs border ${w === days ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
          >
            Last {w} days
          </Link>
        ))}
        <Link href="/admin/blind-tests/create" className="ml-auto text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] self-center">Create a blind test</Link>
      </nav>

      {notLive ? (
        <p className="text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-4 py-3">
          Tracking is not live yet: docs/pending-migrations/v12-g1-bt-runs.sql has not been applied. Nothing is recorded until it is.
        </p>
      ) : null}
      {error && !notLive ? (
        <p className="text-sm bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-4 py-3">Could not load the numbers. Try again.</p>
      ) : null}

      {stats ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <Stat label="Runs today (UTC)" value={n(stats.totals.today)} />
            <Stat label={`Runs, last ${stats.days} days`} value={n(stats.totals.runs)} />
            {rate(stats.totals.completed, stats.totals.runs) ? <Stat label="Completion rate" value={rate(stats.totals.completed, stats.totals.runs)!} /> : null}
            <Stat label="Players" value={n(stats.totals.players)} />
            <Stat label="Completed runs" value={n(stats.totals.completed)} />
            <Stat label="Abandoned runs" value={n(stats.totals.runs - stats.totals.completed)} />
            <Stat label="Signed-in runs" value={n(stats.totals.signed_in_runs)} />
            <Stat label="Guest runs" value={n(stats.totals.guest_runs)} />
          </div>

          <Section title="Runs per day" note="Days in UTC. A player is one account or one browser.">
            {stats.by_day.length === 0 ? <Empty /> : (
              <table className="w-full">
                <thead><tr className="border-b border-[var(--border)]"><Th>Day</Th><Th right>Runs</Th><Th right>Completed</Th><Th right>Completion</Th><Th right>Players</Th></tr></thead>
                <tbody>
                  {stats.by_day.map((d) => (
                    <tr key={d.day} className="border-b border-[var(--border)] last:border-b-0">
                      <Td>{d.day}</Td><Td right>{n(d.runs)}</Td><Td right>{n(d.completed)}</Td><Td right>{rate(d.completed, d.runs) ?? '-'}</Td><Td right>{n(d.players)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Runs per source"><RunsTable rows={stats.by_source} head="Source" label={(r) => r.source} /></Section>
          <Section title="Runs per playlist" note="The 50 most played."><RunsTable rows={stats.by_playlist} head="Playlist" label={(r) => r.playlist} /></Section>
          <Section title="Runs per mode"><RunsTable rows={stats.by_mode} head="Mode" label={(r) => r.mode} /></Section>

          <Section title="Runs per player" note="How many players made how many runs in the window.">
            {stats.runs_per_player.players === 0 ? <Empty /> : (
              <table className="w-full">
                <thead><tr className="border-b border-[var(--border)]"><Th>Runs</Th><Th right>Players</Th><Th right>Share</Th></tr></thead>
                <tbody>
                  {([
                    ['1 run', stats.runs_per_player.one],
                    ['2 to 4 runs', stats.runs_per_player.two_to_four],
                    ['5 to 9 runs', stats.runs_per_player.five_to_nine],
                    ['10 runs or more', stats.runs_per_player.ten_plus],
                  ] as const).map(([label, count]) => (
                    <tr key={label} className="border-b border-[var(--border)] last:border-b-0">
                      <Td>{label}</Td><Td right>{n(count)}</Td><Td right>{rate(count, stats.runs_per_player.players) ?? '-'}</Td>
                    </tr>
                  ))}
                  <tr><Td>Most runs by one player</Td><Td right>{n(stats.runs_per_player.max)}</Td><Td right>{''}</Td></tr>
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Top songs" note="Most played, over every real run."><SongsTable rows={stats.top_songs} /></Section>
          <Section title="Hardest songs" note="Lowest share of right answers, 10 plays or more, over every real run."><SongsTable rows={stats.hardest_songs} /></Section>
        </>
      ) : null}
    </div>
  );
}
