// ADMIN-2 (R31): the pending reports of ONE site (?site=kpop or ?site=anime). Read for that site only; the Dismiss button calls the shared
// /api/admin/report route with the same site, which filters its update by it.
import { AdminShell } from '@/components/admin/hub/admin-shell';
import { ReportActions } from '@/components/admin/hub/row-actions';
import { requireAdminDoor } from '@/lib/admin/door-guard';
import { requireAdmin } from '@/lib/admin/guard';
import { siteOfPage } from '@/lib/admin/hub-page';
import { sectionLabel } from '@/lib/admin/menu';
import { siteScope } from '@/lib/admin/site-scope';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { HubSearch } from '@/lib/admin/hub-page';

interface ReportsProps { searchParams?: Promise<HubSearch> }

interface ReportRow { id: string; reason: string; created_at: string; quizzes: { title: string; slug: string } | Array<{ title: string; slug: string }> | null }

export default async function HubAdminReportsPage({ searchParams }: ReportsProps): Promise<React.ReactElement> {
  const { prefix } = await requireAdminDoor();
  await requireAdmin();
  const site = siteOfPage(await searchParams);
  if (site === null || site === 'hub') {
    return (
      <AdminShell prefix={prefix} site={site} tool="reports" title="Reports">
        <p className="text-sm text-secondary">Pick KpopQuiz or OtakuQuiz in the menu: the reports of one site at a time.</p>
      </AdminShell>
    );
  }
  const { forSite } = siteScope(site);
  const { data, error } = await forSite(createServiceRoleClient().from('reports').select('id, reason, created_at, quizzes(title, slug)'))
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);
  const rows = (error ? [] : (data ?? [])) as unknown as ReportRow[];

  return (
    <AdminShell prefix={prefix} site={site} tool="reports" title={`${sectionLabel(site)} reports`}>
      {error && <p role="alert" className="text-sm mb-3">The reports could not be read. Try again.</p>}
      {!error && rows.length === 0 && <p className="text-sm text-secondary">No pending report.</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {rows.map((r) => {
          const quiz = Array.isArray(r.quizzes) ? r.quizzes[0] : r.quizzes;
          return (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm border-t border-default">
              <div className="min-w-0">
                <p className="text-primary break-words">{quiz?.title ?? 'A quiz that is gone'}</p>
                <p className="text-xs text-secondary break-words">{r.reason} · {new Date(r.created_at).toISOString().slice(0, 10)}</p>
              </div>
              <ReportActions id={r.id} site={site} />
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-secondary mt-3">The 50 newest pending.</p>
    </AdminShell>
  );
}
