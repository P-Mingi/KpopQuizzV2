import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getAllGroups } from '@/lib/db/queries/groups';
import { AddSongClient } from './add-song-client';

export default async function AddSongPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const groups = await getAllGroups();
  const groupOptions = groups.map(g => ({ id: g.id, name: g.name }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-xl font-medium mb-6">Add new song</h1>
      <AddSongClient groups={groupOptions} />
    </div>
  );
}
