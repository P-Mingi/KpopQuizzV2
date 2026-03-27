import { redirect } from 'next/navigation';
import Link from 'next/link';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { SongTable } from './song-table';

export default async function AdminSongsPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const { data: songs } = await supabase
    .from('blind_test_songs')
    .select('*, groups(name, slug)')
    .order('artist', { ascending: true })
    .order('title', { ascending: true });

  const allSongs = songs ?? [];
  const introCount = allSongs.filter(s => s.clip_intro !== null).length;
  const chorusCount = allSongs.filter(s => s.clip_chorus !== null).length;
  const verseCount = allSongs.filter(s => s.clip_verse !== null).length;
  const bridgeCount = allSongs.filter(s => s.clip_bridge !== null).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/admin" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              Admin
            </Link>
            <span className="text-xs text-[var(--text-tertiary)]">/</span>
            <h1 className="text-xl font-medium">Blind test songs</h1>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            {allSongs.length} songs · I: {introCount} · C: {chorusCount} · V: {verseCount} · B: {bridgeCount}
          </p>
        </div>
        <Link
          href="/admin/songs/add"
          className="px-4 py-2 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium"
        >
          + Add song
        </Link>
      </div>

      <SongTable songs={allSongs} />
    </div>
  );
}
