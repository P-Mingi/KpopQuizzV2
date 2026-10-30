import { notFound } from 'next/navigation';

import { requireAdmin } from '@/lib/admin/guard';
import { getAllGroups } from '@/lib/db/queries/groups';
import { EditSongClient } from './edit-song-client';

interface EditSongPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSongPage({ params }: EditSongPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data: song } = await supabase
    .from('blind_test_songs')
    .select('*')
    .eq('id', id)
    .single();

  if (!song) notFound();

  const groups = await getAllGroups();
  const groupOptions = groups.map(g => ({ id: g.id, name: g.name }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <EditSongClient song={song} groups={groupOptions} />
    </div>
  );
}
