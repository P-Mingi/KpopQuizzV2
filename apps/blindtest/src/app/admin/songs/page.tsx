import { redirect } from 'next/navigation';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { isAdmin } from '@/lib/admin';
import { SongManager } from './song-manager';

export const metadata = { title: 'Song Manager | Admin' };

export default async function AdminSongsPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    redirect('/');
  }

  const adminDb = createServiceRoleClient();

  const [songsResult, statsResult, groupsResult] = await Promise.all([
    adminDb
      .from('songs')
      .select('*', { count: 'exact' })
      .order('artist_name')
      .order('title')
      .range(0, 49),
    adminDb.from('songs').select('status, gender, generation', { count: 'exact' }),
    adminDb.from('groups').select('id, name, slug').order('name'),
  ]);

  const allSongs = statsResult.data ?? [];
  const stats = {
    total: allSongs.length,
    active: allSongs.filter((s) => s.status === 'active').length,
    inactive: allSongs.filter((s) => s.status === 'inactive').length,
    gg: allSongs.filter((s) => s.gender === 'gg').length,
    bg: allSongs.filter((s) => s.gender === 'bg').length,
  };

  return (
    <SongManager
      initialSongs={songsResult.data ?? []}
      initialTotal={songsResult.count ?? 0}
      stats={stats}
      groups={(groupsResult.data ?? []) as Array<{ id: string; name: string; slug: string }>}
    />
  );
}
