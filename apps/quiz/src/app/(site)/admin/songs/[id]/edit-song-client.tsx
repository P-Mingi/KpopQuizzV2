'use client';

import { useRouter } from 'next/navigation';
import { SongEditForm } from '../song-edit-form';

interface Song {
  id: string;
  title: string;
  artist: string;
  group_id: number | null;
  youtube_id: string;
  year: number;
  is_title_track: boolean;
  gender: string;
  generation: string | null;
  status: string;
  clip_intro: number | null;
  clip_chorus: number | null;
  clip_verse: number | null;
  clip_bridge: number | null;
  wrong_answers: string[];
}

interface GroupOption { id: number; name: string }

export function EditSongClient({ song, groups }: { song: Song; groups: GroupOption[] }): React.ReactElement {
  const router = useRouter();

  const initial = {
    title: song.title,
    artist: song.artist,
    group_id: song.group_id,
    youtube_id: song.youtube_id,
    year: song.year,
    is_title_track: song.is_title_track,
    gender: song.gender,
    generation: song.generation || '',
    status: song.status,
    clip_intro: song.clip_intro !== null ? String(song.clip_intro) : '',
    clip_chorus: song.clip_chorus !== null ? String(song.clip_chorus) : '',
    clip_verse: song.clip_verse !== null ? String(song.clip_verse) : '',
    clip_bridge: song.clip_bridge !== null ? String(song.clip_bridge) : '',
    wrong_1: song.wrong_answers[0] || '',
    wrong_2: song.wrong_answers[1] || '',
    wrong_3: song.wrong_answers[2] || '',
  };

  async function handleSave(data: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/admin/songs/${song.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  }

  async function handleDelete() {
    if (!confirm('Delete this song?')) return;
    const res = await fetch(`/api/admin/songs/${song.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/admin/songs');
  }

  return (
    <>
      <h1 className="text-xl font-medium mb-6">Edit: {song.title} - {song.artist}</h1>
      <SongEditForm initial={initial} groups={groups} onSave={handleSave} onDelete={handleDelete} />
    </>
  );
}
