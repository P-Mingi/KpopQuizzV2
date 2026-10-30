import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';

import { EntityAdmin } from './entity-admin';

export const dynamic = 'force-dynamic';

export default async function VerseEntitiesAdminPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const svc = createServiceRoleClient();
  const { data } = await svc.from('groups').select('id, name').order('name');
  const groups = (data ?? []) as Array<{ id: number; name: string }>;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Verse entities</h1>
      <p className="mb-4 text-sm text-secondary">Author tours, shows, OST and awards. Rows start as drafts; publishing needs a title and a source, which is what makes the page public.</p>
      <EntityAdmin groups={groups} />
    </div>
  );
}
