import { requireAdmin } from '@/lib/admin/guard';
import { getAllGroups } from '@/lib/db/queries/groups';
import { AddSongClient } from './add-song-client';

export default async function AddSongPage(): Promise<React.ReactElement> {
  await requireAdmin();

  const groups = await getAllGroups();
  const groupOptions = groups.map(g => ({ id: g.id, name: g.name }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-medium mb-6">Add new song</h1>
      <AddSongClient groups={groupOptions} />
    </div>
  );
}
