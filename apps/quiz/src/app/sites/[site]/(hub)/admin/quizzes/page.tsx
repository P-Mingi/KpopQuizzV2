// ADMIN-2: the quizzes of ONE site (?site=kpop or ?site=anime), newest first, with the two moderation buttons. The list is read for that
// site only; the buttons call the shared /api/admin/quiz routes with the same site.
import { AdminShell } from '@/components/admin/hub/admin-shell';
import { QuizActions } from '@/components/admin/hub/row-actions';
import { requireAdminDoor } from '@/lib/admin/door-guard';
import { requireAdmin } from '@/lib/admin/guard';
import { first, siteOfPage } from '@/lib/admin/hub-page';
import { sectionLabel } from '@/lib/admin/menu';
import { siteScope } from '@/lib/admin/site-scope';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { REGISTRY } from '@/lib/site/registry';

import type { HubSearch } from '@/lib/admin/hub-page';

interface QuizzesProps { searchParams?: Promise<HubSearch> }

const STATUSES = ['all', 'published', 'removed', 'flagged'] as const;

interface QuizRow { id: string; title: string; slug: string; status: string; play_count: number | null; report_count: number | null; created_at: string }

export default async function HubAdminQuizzesPage({ searchParams }: QuizzesProps): Promise<React.ReactElement> {
  const { prefix } = await requireAdminDoor();
  await requireAdmin();
  const params = await searchParams;
  const site = siteOfPage(params);
  if (site === null || site === 'hub') {
    return (
      <AdminShell prefix={prefix} site={site} tool="quizzes" title="Quizzes">
        <p className="text-sm text-secondary">Pick KpopQuiz or OtakuQuiz in the menu: the quizzes of one site at a time.</p>
      </AdminShell>
    );
  }
  const wanted = first(params?.status);
  const status = (STATUSES as readonly string[]).includes(wanted ?? '') ? (wanted as (typeof STATUSES)[number]) : 'all';
  const query = (first(params?.q) ?? '').trim().slice(0, 80);

  const { forSite } = siteScope(site);
  let q = forSite(createServiceRoleClient().from('quizzes').select('id, title, slug, status, play_count, report_count, created_at'));
  if (status !== 'all') q = q.eq('status', status);
  if (query.length >= 2) q = q.ilike('title', `%${query.replace(/[%_,()]/g, ' ')}%`);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(50);
  const rows = (error ? [] : (data ?? [])) as QuizRow[];
  const base = REGISTRY[site].url;

  return (
    <AdminShell prefix={prefix} site={site} tool="quizzes" title={`${sectionLabel(site)} quizzes`}>
      <form method="get" className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        <input type="hidden" name="site" value={site} />
        <label className="sr-only" htmlFor="quiz-q">Title</label>
        <input id="quiz-q" name="q" defaultValue={query} placeholder="Search a title" className="min-h-[36px] rounded-md border border-default bg-transparent px-3" />
        <label className="sr-only" htmlFor="quiz-status">Status</label>
        <select id="quiz-status" name="status" defaultValue={status} className="min-h-[36px] rounded-md border border-default bg-transparent px-2">
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" className="min-h-[36px] rounded-md border border-default px-3 text-secondary hover:text-primary">Search</button>
      </form>
      {error && <p role="alert" className="text-sm mb-3">The list could not be read. Try again.</p>}
      {!error && rows.length === 0 && <p className="text-sm text-secondary">No quiz matches.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm border-t border-default">
            <div className="min-w-0">
              <a href={`${base}/q/${encodeURIComponent(r.slug)}`} className="text-primary hover:text-accent-hover break-words" rel="noopener noreferrer">{r.title}</a>
              <p className="text-xs text-secondary">{r.status} · {(r.play_count ?? 0).toLocaleString('en-US')} plays · {r.report_count ?? 0} reports</p>
            </div>
            <QuizActions id={r.id} status={r.status} site={site} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-secondary mt-3">The 50 newest that match.</p>
    </AdminShell>
  );
}
