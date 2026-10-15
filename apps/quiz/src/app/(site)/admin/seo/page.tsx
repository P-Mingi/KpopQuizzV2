import { redirect } from 'next/navigation';

import { isAdmin } from '@/lib/admin';
import {
  CHECKLIST_LEAD_DAYS,
  PREP_CHECKLISTS,
  checklistOpensOn,
  dayMs,
  isChecklistOpen,
  lastDay,
  loadCalendar,
  utcDay,
  type SeoEvent,
} from '@/lib/seo/calendar';
import { REFRESH, monthOf } from '@/lib/seo/refresh-queue';
import { computeRefreshQueue, getRefreshStore, type RefreshApproval, type RefreshQueueResult } from '@/lib/seo/refresh-queue-server';
import { createServerClient } from '@/lib/supabase/server';

import { ApproveForm } from './approve-form';

import type { Metadata } from 'next';

// /admin/seo (SEO Mission 3, part E): the SEO refresh queue of the week, the monthly
// approval of its top 5, the preparation checklists open now, and the events calendar.
// Gates: not an admin = redirect to / (as every /admin page). Never indexed.
// The queue is computed on the fly from real rows (hub dates) and docs/seo/CALENDAR.md.
// Approvals need docs/pending-migrations/seo-refresh-queue.sql; until it is applied the page
// says so and offers no button.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'SEO refresh queue | Admin | KpopQuiz',
  robots: { index: false, follow: false },
};

const fmtDay = (day: string): string =>
  new Date(dayMs(day)).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtMonth = (month: string): string =>
  new Date(dayMs(month)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const span = (e: SeoEvent): string => (e.endDate ? `${fmtDay(e.date)} to ${fmtDay(e.endDate)}` : fmtDay(e.date));

const cell = 'py-1.5 pr-3 align-top';

export default async function SeoAdminPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const now = new Date();
  const today = utcDay(now);
  const month = monthOf(today);
  const events = loadCalendar();

  let queue: RefreshQueueResult | null = null;
  try {
    queue = await computeRefreshQueue(now);
  } catch (err) {
    console.error('[admin/seo] queue failed:', err);
  }

  // Approval storage: 'off' before the migration, 'error' when it cannot be read.
  let approvals: RefreshApproval[] | 'off' | 'error' = 'off';
  const store = getRefreshStore();
  if (store) {
    try {
      approvals = (await store.live()) ? await store.approvals(month) : 'off';
    } catch {
      approvals = 'error';
    }
  }

  const top = queue ? queue.items.slice(0, REFRESH.monthlyApprovals) : [];
  const openChecklists = events.filter((e) => isChecklistOpen(e, today));
  const comingEvents = events.filter((e) => dayMs(lastDay(e)) >= dayMs(today));
  const pastEvents = events.filter((e) => dayMs(lastDay(e)) < dayMs(today));

  return (
    <div className="py-4">
      <h1 className="text-xl font-semibold text-primary mb-1">SEO refresh queue</h1>
      <p className="text-sm text-secondary mb-4">
        The pages to refresh first, computed each week (Monday) from real signals. Approve the top {REFRESH.monthlyApprovals} once a month.
        Dates come from <code>docs/seo/CALENDAR.md</code>.
      </p>

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">Approve the top {REFRESH.monthlyApprovals} for {fmtMonth(month)}</h2>
      {approvals === 'off' ? (
        <p className="text-sm text-secondary mb-6">
          Approvals cannot be saved yet: the table is not applied (docs/pending-migrations/seo-refresh-queue.sql). The queue below still works.
        </p>
      ) : approvals === 'error' ? (
        <p className="text-sm text-secondary mb-6">The approvals could not be read. Try again in a minute.</p>
      ) : approvals.length > 0 ? (
        <div className="mb-6">
          <p className="text-sm text-secondary mb-2">Approved for {fmtMonth(month)}:</p>
          <ol className="list-decimal pl-5 text-sm">
            {approvals.map((a) => (
              <li key={a.path} className="mb-1">
                <a href={a.path} className="underline">{a.path}</a>
                <span className="text-secondary"> (rank {a.rank}, score {a.score}, approved {new Date(a.approved_at).toISOString().slice(0, 10)})</span>
              </li>
            ))}
          </ol>
        </div>
      ) : top.length === 0 ? (
        <p className="text-sm text-secondary mb-6">Nothing to approve: no page has a signal this week.</p>
      ) : (
        <ApproveForm
          monthLabel={fmtMonth(month)}
          rows={top.map((it) => ({ path: it.path, label: it.label, score: it.score, reasons: it.reasons.map((r) => r.text) }))}
        />
      )}

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">
        Queue for the week of {queue ? fmtDay(queue.weekOf) : 'this Monday'}
      </h2>
      {!queue ? (
        <p className="text-sm text-secondary mb-4">The queue could not be computed (database read failed). Try again in a minute.</p>
      ) : (
        <>
          <p className="text-sm text-secondary mb-2">
            {queue.items.length} page{queue.items.length === 1 ? '' : 's'} with at least one signal.
            Search Console clicks: {queue.search.clicks ? 'on' : 'no data yet (part C), signal off'}.
            Bing AI citations: {queue.search.citations ? 'on' : 'no data yet (part C), signal off'}.
          </p>
          {queue.items.length === 0 ? null : (
            <div className="overflow-x-auto mb-4">
              <table className="text-sm">
                <thead>
                  <tr className="text-left text-secondary"><th className={cell}>#</th><th className={cell}>Page</th><th className={cell}>Score</th><th className={cell}>Why</th></tr>
                </thead>
                <tbody>
                  {queue.items.map((it) => (
                    <tr key={it.path} className="border-t border-default">
                      <td className={cell}>{it.rank}</td>
                      <td className={cell}><a href={it.path} className="underline">{it.label}</a><span className="block text-xs text-secondary">{it.path}</span></td>
                      <td className={cell}><b>{it.score}</b></td>
                      <td className={cell}>{it.reasons.map((r) => <span key={r.code} className="block">{r.text} <span className="text-secondary">(+{r.points})</span></span>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <details className="text-sm text-secondary mb-4">
            <summary className="cursor-pointer">How the score works</summary>
            <ul className="list-disc pl-5 mt-2">
              <li>Event of the group within {REFRESH.eventWindowDays} days, or on now: 60 points, plus 2 per day closer (up to 88).</li>
              <li>Search Console clicks down {Math.round(REFRESH.dropShare * 100)}% or more against the baseline (baseline at least {REFRESH.minBaselineClicks}): 40 plus 0.4 per point of fall.</li>
              <li>Bing AI citations down {Math.round(REFRESH.dropShare * 100)}% or more (baseline at least {REFRESH.minBaselineCitations}): 40 plus 0.4 per point of fall.</li>
              <li>Hub with no new published quiz for {REFRESH.staleDays} days or more: 30 points, plus 1 per 6 days past {REFRESH.staleDays} (up to 50). The hub date is its newest published quiz, as in the sitemap.</li>
              <li>Ties: the hub with more finished plays on its published quizzes first.</li>
            </ul>
          </details>
        </>
      )}

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">Preparation checklists open now</h2>
      <p className="text-sm text-secondary mb-2">A checklist opens {CHECKLIST_LEAD_DAYS} days before an event and closes after its last day.</p>
      {openChecklists.length === 0 ? (
        <p className="text-sm text-secondary mb-4">None open today.</p>
      ) : (
        openChecklists.map((e) => (
          <section key={e.id} className="border border-default rounded-lg p-3 mb-3 text-sm">
            <h3 className="font-medium text-primary">{e.title}</h3>
            <p className="text-xs text-secondary mb-2">{span(e)}{e.place ? `, ${e.place}` : ''}{e.status === 'unconfirmed' ? ' (date unconfirmed)' : ''}</p>
            <ul className="list-disc pl-5">
              {PREP_CHECKLISTS[e.type].map((t) => <li key={t}>{t}</li>)}
            </ul>
          </section>
        ))
      )}

      <h2 className="text-base font-semibold text-primary mt-4 mb-2">Events calendar</h2>
      <div className="overflow-x-auto mb-4">
        <table className="text-sm">
          <thead>
            <tr className="text-left text-secondary"><th className={cell}>When</th><th className={cell}>Event</th><th className={cell}>Status</th><th className={cell}>Checklist opens</th><th className={cell}>Sources</th></tr>
          </thead>
          <tbody>
            {comingEvents.map((e) => (
              <tr key={e.id} className="border-t border-default">
                <td className={cell}>{span(e)}</td>
                <td className={cell}>{e.title}<span className="block text-xs text-secondary">{e.type}{e.group ? `, /${e.group}-quiz` : ''}{e.place ? `, ${e.place}` : ''}</span>{e.note ? <span className="block text-xs text-secondary">{e.note}</span> : null}</td>
                <td className={cell}>{e.status}</td>
                <td className={cell}>{isChecklistOpen(e, today) ? 'open now' : fmtDay(checklistOpensOn(e))}</td>
                <td className={cell}>
                  {e.sources.map((s) => (
                    <a key={s.url} href={s.url} rel="noopener noreferrer" target="_blank" className="block underline">{s.label}</a>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pastEvents.length > 0 ? <p className="text-xs text-secondary">{pastEvents.length} past event{pastEvents.length === 1 ? '' : 's'} hidden.</p> : null}
    </div>
  );
}
