'use client';

import { useState } from 'react';
import { SongEditForm } from '../song-edit-form';

interface GroupOption { id: number; name: string }

const EMPTY = {
  title: '', artist: '', group_id: null as number | null, youtube_id: '',
  year: 2024, is_title_track: true, gender: 'gg', generation: '4th', status: 'active',
  clip_intro: '', clip_chorus: '', clip_verse: '', clip_bridge: '',
  wrong_1: '', wrong_2: '', wrong_3: '',
};

export function AddSongClient({ groups }: { groups: GroupOption[] }): React.ReactElement {
  const [key, setKey] = useState(0);

  async function handleSave(data: Record<string, unknown>): Promise<boolean> {
    const res = await fetch('/api/admin/songs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.ok;
  }

  function handleSaveAndAnother() {
    setKey(prev => prev + 1);
  }

  return (
    <div>
      <SongEditForm key={key} initial={EMPTY} groups={groups} onSave={handleSave} showYouTubeInput />
      <button
        onClick={handleSaveAndAnother}
        className="mt-3 px-4 py-2 rounded-full border border-[var(--border-light)] text-sm font-medium text-[var(--text-secondary)]"
      >
        Reset form (add another)
      </button>
    </div>
  );
}
