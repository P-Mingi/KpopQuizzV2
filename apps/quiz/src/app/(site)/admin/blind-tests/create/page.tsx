import { requireAdmin } from '@/lib/admin/guard';
import { getAllGroups } from '@/lib/db/queries/groups';
import { BlindTestCreator } from './blind-test-creator';

export default async function CreateBlindTestPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const groups = await getAllGroups();
  const groupOptions = groups.map(g => ({ id: g.id, name: g.name, slug: g.slug }));

  return (
    <div className="py-6">
      <BlindTestCreator groups={groupOptions} />
    </div>
  );
}
