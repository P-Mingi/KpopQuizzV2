import { redirect } from 'next/navigation';

import { isAdmin } from '@/lib/admin';
import { isIndexNowDryRun } from '@/lib/indexnow';
import { getIndexNowStore } from '@/lib/seo/indexnow-outbox';
import { coverage } from '@/lib/seo/indexnow-plan';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { Metadata } from 'next';

// /admin/seo/indexnow (SEO Mission 3, part A point 9): what IndexNow was told over the last 7
// days (submitted, failed, pending), the alerts, the last run of each job, and the sitemap
// coverage (share of sitemap URLs IndexNow accepted at least once; target 100%).
// Gates: not an admin = redirect to / (as every /admin page). Never indexed. Read only.
// Before docs/pending-migrations/seo-indexnow.sql is applied it says so and shows nothing else.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IndexNow | Admin | KpopQuiz',
  robots: { index: false, follow: false },
};

interface OutboxView { url: string; reason: string; enqueued_at: string; submitted_at: string | null; status_code: number | null; attempts: number; outcome: string | null }
interface EventView { kind: string; created_at: string; status_code: number | null; detail: Record<string, unknown> | null }

const DAY = 86400000;
const fmt = (iso: string | null | undefined): string => (iso ? new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'never');
const short = (url: string): string => url.replace(/^https:\/\/kpopquiz\.org/, '') || '/';

function summary(e: EventView | undefined): string {
  if (!e) return 'never run';
  const d = e.detail ?? {};
  if (e.kind === 'flush') {
    if (d.dryRun) return `dry run: would send ${String(d.wouldSend ?? 0)}`;
    return `sent ${String(d.sent ?? 0)}, covered ${String(d.covered ?? 0)}, deferred ${String(d.deferred ?? 0)}${d.ok === false ? `, stopped on ${String(e.status_code ?? '')}` : ''}`;
  }
  if (e.kind === 'reconcile' || e.kind === 'deploy_diff') {
    const enq = (d.enqueued ?? {}) as Record<string, number>;
    return `checked ${String(d.checked ?? 0)} of ${String(d.sitemapUrls ?? 0)}; new ${enq.new ?? 0}, changed ${enq.changed ?? 0}, removed ${enq.removed ?? 0}${Number(d.carriedOver ?? 0) > 0 ? `; ${String(d.carriedOver)} left for next run` : ''}`;
  }
  if (e.kind === 'keycheck') return 'key file OK';
  return JSON.stringify(d).slice(0, 160);
}

export default async function IndexNowAdminPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const dryRun = isIndexNowDryRun();
  const store = getIndexNowStore();
  let live = false;
  let failed = false;
  try {
    live = store ? await store.live() : false;
  } catch {
    failed = true;
  }

  const header = (
    <>
      <h1 className="text-xl font-semibold text-primary mb-1">IndexNow</h1>
      <p className="text-sm text-secondary mb-4">
        Every page change is written to an outbox and sent to IndexNow (Bing, Yandex, Seznam) once an hour. Sending is {dryRun ? <b>off: dry run (INDEXNOW_DRY_RUN is set), nothing leaves the server</b> : <b>on</b>}.
      </p>
    </>
  );

  if (failed) return <div className="py-4">{header}<p className="text-sm text-secondary">The IndexNow tables could not be read. Try again in a minute.</p></div>;
  if (!live) {
    return (
      <div className="py-4">
        {header}
        <p className="text-sm text-secondary">The IndexNow tables are not applied yet (docs/pending-migrations/seo-indexnow.sql). Until then, publishing a quiz pings IndexNow directly, as before.</p>
      </div>
    );
  }

  const svc = createServiceRoleClient() as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const since = new Date(Date.now() - 7 * DAY).toISOString();
  const count = async (q: (b: any) => any): Promise<number> => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { count: n, error } = await q(svc.from('seo_indexnow_outbox').select('id', { count: 'exact' })).limit(1);
    if (error) throw new Error(error.message);
    return n ?? 0;
  };

  let data: {
    submitted: number; failedNow: number; gaveUp: number; pending: number; covered: number;
    cov: ReturnType<typeof coverage>; events: EventView[]; queue: OutboxView[]; recent: OutboxView[];
  } | null = null;
  try {
    const [submitted, failedNow, gaveUp, pending, covered, states, ev, queue, recent] = await Promise.all([
      count((b) => b.eq('outcome', 'submitted').gte('submitted_at', since)),
      count((b) => b.is('outcome', null).gt('attempts', 0)),
      count((b) => b.eq('outcome', 'gave_up').gte('enqueued_at', since)),
      count((b) => b.is('outcome', null).eq('attempts', 0)),
      count((b) => b.eq('outcome', 'covered').gte('enqueued_at', since)),
      store!.states(),
      svc.from('seo_indexnow_events').select('kind, created_at, status_code, detail').gte('created_at', since).order('created_at', { ascending: false }).limit(300),
      svc.from('seo_indexnow_outbox').select('url, reason, enqueued_at, submitted_at, status_code, attempts, outcome').is('outcome', null).order('enqueued_at', { ascending: true }).limit(50),
      svc.from('seo_indexnow_outbox').select('url, reason, enqueued_at, submitted_at, status_code, attempts, outcome').not('outcome', 'is', null).order('enqueued_at', { ascending: false }).limit(30),
    ]);
    data = {
      submitted, failedNow, gaveUp, pending, covered, cov: coverage(states),
      events: (ev.data ?? []) as EventView[], queue: (queue.data ?? []) as OutboxView[], recent: (recent.data ?? []) as OutboxView[],
    };
  } catch {
    data = null;
  }
  if (!data) return <div className="py-4">{header}<p className="text-sm text-secondary">The IndexNow tables could not be read. Try again in a minute.</p></div>;

  const last = (kind: string): EventView | undefined => data!.events.find((e) => e.kind === kind);
  const alerts = data.events.filter((e) => e.kind === 'alert' || e.kind === 'backoff');
  const cell = 'py-1 pr-3 align-top';

  return (
    <div className="py-4">
      {header}

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">Last 7 days</h2>
      <table className="text-sm mb-4">
        <tbody>
          <tr><td className={cell}>Submitted (IndexNow answered 200 or 202)</td><td className={cell}><b>{data.submitted}</b></td></tr>
          <tr><td className={cell}>Failing now (will retry next hour)</td><td className={cell}><b>{data.failedNow}</b></td></tr>
          <tr><td className={cell}>Given up after 24 tries</td><td className={cell}><b>{data.gaveUp}</b></td></tr>
          <tr><td className={cell}>Pending (never tried yet)</td><td className={cell}><b>{data.pending}</b></td></tr>
          <tr><td className={cell}>Already told by a later submission</td><td className={cell}>{data.covered}</td></tr>
        </tbody>
      </table>

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">Sitemap coverage</h2>
      <p className="text-sm text-secondary mb-4">
        <b>{data.cov.pct}%</b> of the {data.cov.inSitemap} URLs seen in the sitemap have been accepted by IndexNow at least once ({data.cov.submitted}). Target: 100%.
      </p>

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">Last runs</h2>
      <table className="text-sm mb-4">
        <tbody>
          {([['flush', 'Hourly flush'], ['reconcile', 'Nightly reconciliation'], ['deploy_diff', 'Post-deploy diff'], ['keycheck', 'Key file check']] as const).map(([k, label]) => (
            <tr key={k}><td className={cell}>{label}</td><td className={cell}>{fmt(last(k)?.created_at)}</td><td className={cell}>{summary(last(k))}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">Alerts ({alerts.length})</h2>
      {alerts.length === 0 ? <p className="text-sm text-secondary mb-4">No alert in the last 7 days.</p> : (
        <table className="text-sm mb-4">
          <tbody>
            {alerts.slice(0, 30).map((e, i) => (
              <tr key={i}><td className={cell}>{fmt(e.created_at)}</td><td className={cell}>{e.kind === 'backoff' ? '429, waiting' : String(e.detail?.reason ?? 'alert')}</td><td className={cell}>{e.status_code ?? ''}</td><td className={cell}>{JSON.stringify(e.detail ?? {}).slice(0, 200)}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">Waiting to be sent (oldest 50)</h2>
      {data.queue.length === 0 ? <p className="text-sm text-secondary mb-4">The outbox is empty.</p> : (
        <table className="text-sm mb-4">
          <tbody>
            {data.queue.map((r) => (
              <tr key={r.url}><td className={cell}>{short(r.url)}</td><td className={cell}>{r.reason}</td><td className={cell}>{fmt(r.enqueued_at)}</td><td className={cell}>{r.attempts > 0 ? `${r.attempts} tries, last ${r.status_code ?? ''}` : ''}</td></tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">Recently settled (30)</h2>
      <table className="text-sm mb-4">
        <tbody>
          {data.recent.map((r, i) => (
            <tr key={i}><td className={cell}>{short(r.url)}</td><td className={cell}>{r.reason}</td><td className={cell}>{r.outcome}</td><td className={cell}>{fmt(r.submitted_at ?? r.enqueued_at)}</td><td className={cell}>{r.status_code ?? ''}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
