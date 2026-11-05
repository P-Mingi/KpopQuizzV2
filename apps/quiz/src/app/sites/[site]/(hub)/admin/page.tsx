// ADMIN-2: the overview of the one admin. Without ?site= the three sections side by side; with one, the numbers of that section. Real counts only
// (lib/admin/site-stats.ts); a count that cannot be read shows a dash.
import Link from 'next/link';

import { AdminShell } from '@/components/admin/hub/admin-shell';
import { requireAdminDoor } from '@/lib/admin/door-guard';
import { requireAdmin } from '@/lib/admin/guard';
import { siteOfPage } from '@/lib/admin/hub-page';
import { SECTION_ORDER, adminHref, sectionLabel } from '@/lib/admin/menu';
import { readSiteCounts } from '@/lib/admin/site-stats';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { HubSearch } from '@/lib/admin/hub-page';
import type { SiteCounts } from '@/lib/admin/site-stats';

interface OverviewProps { searchParams?: Promise<HubSearch> }

const dash = (n: number | null): string => (n === null ? '-' : n.toLocaleString('en-US'));

function Counts({ counts, quiz }: { counts: SiteCounts; quiz: boolean }): React.ReactElement {
  const rows: Array<[string, number | null]> = [['Members', counts.members]];
  if (quiz) rows.push(['Published quizzes', counts.published], ['Removed quizzes', counts.removed], ['Pending reports', counts.pendingReports], ['Groups to review', counts.groupsToReview]);
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
      {rows.map(([label, n]) => (
        <div key={label} className="contents">
          <dt className="text-secondary">{label}</dt>
          <dd className="text-primary tabular-nums text-right">{dash(n)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function HubAdminOverviewPage({ searchParams }: OverviewProps): Promise<React.ReactElement> {
  const { prefix } = await requireAdminDoor();
  await requireAdmin();
  const site = siteOfPage(await searchParams);
  const db = createServiceRoleClient();

  if (site !== null) {
    const counts = await readSiteCounts(db, site);
    return (
      <AdminShell prefix={prefix} site={site} tool="overview" title={`${sectionLabel(site)} overview`}>
        <div className="max-w-sm"><Counts counts={counts} quiz={site !== 'hub'} /></div>
      </AdminShell>
    );
  }

  const all = await Promise.all(SECTION_ORDER.map(async (s) => [s, await readSiteCounts(db, s)] as const));
  return (
    <AdminShell prefix={prefix} site={null} tool="overview" title="Admin">
      <p className="text-sm text-secondary mb-4">Pick a site. Every tool acts on the site you pick, never on the one you are visiting.</p>
      <div className="grid gap-4 sm:grid-cols-3">
        {all.map(([s, counts]) => (
          <div key={s} className="rounded-lg border border-default p-4">
            <h2 className="text-base font-medium text-primary mb-2">
              <Link href={adminHref(prefix, '', s)} className="hover:text-accent-hover">{sectionLabel(s)}</Link>
            </h2>
            <Counts counts={counts} quiz={s !== 'hub'} />
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
