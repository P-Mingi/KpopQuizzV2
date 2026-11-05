// ADMIN-2 (PLAN-ADMIN-2 section 4): the journal of the admin's actions, read only: the last 200 lines, newest first, of one site (?site=) or of all.
// The table is closed to every browser role; the page reads it with the service-role client after its guards. If the table is not there
// yet (the migration not applied), the page says so instead of showing an empty list that looks like "nothing happened".
import { AdminShell } from '@/components/admin/hub/admin-shell';
import { requireAdminDoor } from '@/lib/admin/door-guard';
import { requireAdmin } from '@/lib/admin/guard';
import { siteOfPage } from '@/lib/admin/hub-page';
import { readJournal } from '@/lib/admin/journal';
import { sectionLabel } from '@/lib/admin/menu';

import type { HubSearch } from '@/lib/admin/hub-page';

interface JournalProps { searchParams?: Promise<HubSearch> }

/** The detail as short `key=value` words; ids and counts only (the journal holds nothing else). */
function words(detail: Record<string, unknown>): string {
  return Object.entries(detail)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? `${v.length} items` : String(v)}`)
    .join(' ');
}

export default async function HubAdminJournalPage({ searchParams }: JournalProps): Promise<React.ReactElement> {
  const { prefix } = await requireAdminDoor();
  await requireAdmin();
  const site = siteOfPage(await searchParams);
  const { rows, available } = await readJournal(site, 200);
  return (
    <AdminShell prefix={prefix} site={site} tool="journal" title={site ? `${sectionLabel(site)} journal` : 'Journal, all sites'}>
      {!available && <p role="status" className="text-sm text-secondary">The journal is not available yet: its table has not been created.</p>}
      {available && rows.length === 0 && <p className="text-sm text-secondary">Nothing recorded yet.</p>}
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-secondary">
                <th className="py-1 pr-3 font-medium">When (UTC)</th>
                <th className="py-1 pr-3 font-medium">Site</th>
                <th className="py-1 pr-3 font-medium">Action</th>
                <th className="py-1 pr-3 font-medium">Target</th>
                <th className="py-1 pr-3 font-medium">Admin</th>
                <th className="py-1 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-default" style={{ verticalAlign: 'top' }}>
                  <td className="py-1 pr-3 whitespace-nowrap tabular-nums">{new Date(r.at).toISOString().replace('T', ' ').slice(0, 19)}</td>
                  <td className="py-1 pr-3">{r.site_id}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{r.action}</td>
                  <td className="py-1 pr-3" style={{ overflowWrap: 'anywhere' }}>{r.target_type ? `${r.target_type} ${r.target_id ?? ''}` : '-'}</td>
                  <td className="py-1 pr-3 tabular-nums">{r.admin_id.slice(0, 8)}</td>
                  <td className="py-1 break-words">{words(r.detail ?? {})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-secondary mt-3">The last 200 lines. Read only.</p>
    </AdminShell>
  );
}
