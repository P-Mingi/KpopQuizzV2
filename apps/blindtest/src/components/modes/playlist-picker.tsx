'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface PlaylistGroup {
  id: string;
  name: string;
  count: number;
  gender: string | null;
}

const FILTERS = ['All', 'Boy groups', 'Girl groups', 'Solo artists'] as const;

function filterGroups(groups: PlaylistGroup[], filter: string): PlaylistGroup[] {
  if (filter === 'All') return groups;
  if (filter === 'Boy groups') return groups.filter((g) => g.gender === 'bg');
  if (filter === 'Girl groups') return groups.filter((g) => g.gender === 'gg');
  if (filter === 'Solo artists') return groups.filter((g) => g.gender === 'solo_female' || g.gender === 'solo_male');
  return groups;
}

export function PlaylistPicker({
  groups,
  totalSongs,
}: {
  groups: PlaylistGroup[];
  totalSongs: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'solo';
  const [selected, setSelected] = useState('all');
  const [filter, setFilter] = useState<string>('All');

  const filtered = filterGroups(groups, filter);

  const allPlaylist = { id: 'all', name: 'All K-pop', count: totalSongs, gender: null };
  const playlists = [allPlaylist, ...filtered];

  function startGame() {
    router.push(`/play?playlist=${selected}&mode=${mode}`);
  }

  return (
    <div className="px-1 md:px-0 py-4">
      <div className="flex items-center gap-2.5 mb-1">
        <button
          onClick={() => router.push('/modes')}
          className="w-[30px] h-[30px] rounded-full bg-elevated flex items-center justify-center flex-shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary">
            <path d="M8 1.5L3 6l5 4.5" />
          </svg>
        </button>
        <h1 className="text-base font-medium text-primary">Choose playlist</h1>
      </div>
      <p className="text-[11px] text-ghost mb-3 ml-[42px] capitalize">{mode} mode / 10 rounds / 15s per round</p>

      {/* Filter pills */}
      <div className="flex gap-[5px] mb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap flex-shrink-0 border-[1.5px] transition-all ${
              filter === f
                ? 'bg-accent text-white border-accent'
                : 'bg-accent-bg text-accent border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Playlist cards */}
      <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => setSelected(pl.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-[1.5px] bg-primary transition-all text-left ${
              selected === pl.id
                ? 'border-accent bg-accent-bg'
                : 'border-subtle hover:border-accent/50'
            }`}
          >
            <div className="w-10 h-10 rounded-[10px] bg-accent/10 flex items-center justify-center flex-shrink-0 text-[11px] font-medium text-accent">
              {pl.name.slice(0, 3).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-primary">{pl.name}</p>
              <p className="text-[10px] text-ghost">{pl.count} songs</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${
                selected === pl.id ? 'bg-accent border-accent' : 'border-subtle'
              }`}
            >
              {selected === pl.id && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 5.5L4.2 7.5L8 3" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={startGame}
        className="w-full py-3.5 rounded-xl bg-accent text-white text-sm font-medium mt-3 transition-all active:scale-[0.97] hover:brightness-110"
      >
        Start game
      </button>
    </div>
  );
}
