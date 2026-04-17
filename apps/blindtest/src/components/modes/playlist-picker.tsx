'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { TipBanner } from '@/components/shared/tip-banner';

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
  const [search, setSearch] = useState('');

  const filtered = filterGroups(groups, filter);

  // Apply search filter
  const searched = search.trim()
    ? filtered.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : filtered;

  const allPlaylist = { id: 'all', name: 'All K-pop', count: totalSongs, gender: null };
  const playlists = search.trim() ? searched : [allPlaylist, ...searched];

  function startGame() {
    router.push(`/play?playlist=${selected}&mode=${mode}`);
  }

  return (
    <div className="px-3.5 md:px-0 py-4 md:py-6 max-w-[800px] mx-auto">
      {/* Back button + title */}
      <div className="flex items-center gap-2.5 mb-1 px-3.5 md:px-0">
        <button
          onClick={() => router.push('/modes')}
          className="w-[30px] h-[30px] rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-primary"
          >
            <path d="M8 1.5L3 6l5 4.5" />
          </svg>
        </button>
        <h1 className="text-base md:text-lg font-medium text-primary">Choose playlist</h1>
      </div>
      <p className="text-[11px] text-secondary mb-3 ml-[42px] capitalize px-3.5 md:px-0">
        {mode} mode / 10 rounds / 15s per round
      </p>

      {/* Filter pills */}
      <div className="flex gap-[5px] overflow-x-auto mt-3 mb-3 px-3.5 md:px-0" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 md:px-3.5 py-[6px] rounded-lg text-[10px] md:text-[11px] font-semibold whitespace-nowrap flex-shrink-0 border-[1.5px] transition-all ${
              filter === f
                ? 'bg-[#D4537E] text-white border-[#D4537E]'
                : 'bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.1)] text-[#993556] dark:text-[#ED93B1] border-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative mb-3 px-3.5 md:px-0">
        <svg
          className="absolute left-[22px] md:left-[10px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#B4B2A9] dark:text-white/25"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search artist or group..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.08)] bg-white dark:bg-[rgba(255,255,255,0.04)] text-sm text-primary placeholder:text-[#D3D1C7] dark:placeholder:text-white/20 focus:outline-none focus:border-[#D4537E] transition-colors"
        />
      </div>

      {/* Playlist cards */}
      <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto px-3.5 md:px-0" style={{ scrollbarWidth: 'thin' }}>
        {playlists.map((pl) => (
          <button
            key={pl.id}
            onClick={() => setSelected(pl.id)}
            className={`w-full flex items-center gap-2.5 px-2.5 md:px-3 py-2.5 md:py-3 rounded-[10px] md:rounded-xl border-[1.5px] bg-white dark:bg-[rgba(255,255,255,0.04)] text-left transition-all ${
              selected === pl.id
                ? 'border-[#D4537E] bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.1)]'
                : 'border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] hover:border-[#D4537E]'
            }`}
          >
            <div
              className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-white"
              style={{ background: '#D4537E' }}
            >
              {pl.name.slice(0, 3).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-primary">{pl.name}</p>
              <p className="text-[10px] text-secondary">{pl.count.toLocaleString()} songs</p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${
                selected === pl.id
                  ? 'bg-[#D4537E] border-[#D4537E]'
                  : 'border-[#E8E6E0] dark:border-[rgba(255,255,255,0.15)]'
              }`}
            >
              {selected === pl.id && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M2 5.5L4.2 7.5L8 3" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Start button */}
      <div className="px-3.5 md:px-0">
        <button
          onClick={startGame}
          className="w-full py-3 md:py-3.5 rounded-[10px] md:rounded-xl bg-[#D4537E] text-white text-sm font-semibold transition-all active:scale-[0.97] hover:bg-[#C44A72] mt-4"
        >
          Start game
        </button>
      </div>

      {/* Tip banner */}
      <TipBanner
        tips={[
          'Level up playlists to unlock more songs',
          'All K-pop includes every artist',
          'Filter by generation or style',
        ]}
      />
    </div>
  );
}
