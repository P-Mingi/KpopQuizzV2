'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SongRow {
  id: string;
  title: string;
  artist: string;
  year: number;
  generation: string | null;
  gender: string;
  clip_intro: number | null;
  clip_chorus: number | null;
  clip_verse: number | null;
  clip_bridge: number | null;
  groups: { name: string; slug: string } | null;
}

export function SongTable({ songs }: { songs: SongRow[] }): React.ReactElement {
  const [search, setSearch] = useState('');
  const [genFilter, setGenFilter] = useState('all');

  const filtered = songs.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.title.toLowerCase().includes(q) && !s.artist.toLowerCase().includes(q)) return false;
    }
    if (genFilter !== 'all' && s.generation !== genFilter) return false;
    return true;
  });

  return (
    <>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search songs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--border)]"
        />
        <select
          value={genFilter}
          onChange={e => setGenFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-white"
        >
          <option value="all">All gens</option>
          <option value="2nd">2nd gen</option>
          <option value="3rd">3rd gen</option>
          <option value="4th">4th gen</option>
        </select>
      </div>

      <div className="border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2fr_1.2fr_0.8fr_0.5fr_0.4fr_36px_36px_36px_36px] gap-0 px-4 py-2 bg-[var(--bg-surface)] text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
          <span>Song</span>
          <span>Artist</span>
          <span>Group</span>
          <span>Year</span>
          <span>Gen</span>
          <span className="text-center">I</span>
          <span className="text-center">C</span>
          <span className="text-center">V</span>
          <span className="text-center">B</span>
        </div>

        {filtered.map(song => (
          <Link
            key={song.id}
            href={`/admin/songs/${song.id}`}
            className="grid grid-cols-[2fr_1.2fr_0.8fr_0.5fr_0.4fr_36px_36px_36px_36px] gap-0 px-4 py-2.5 border-t border-[var(--border)] hover:bg-[var(--bg-surface)] transition-colors text-sm"
          >
            <span className="font-medium truncate">{song.title}</span>
            <span className="text-[var(--text-secondary)] truncate">{song.artist}</span>
            <span className="text-[var(--text-secondary)] truncate">{song.groups?.name || '-'}</span>
            <span className="text-[var(--text-tertiary)]">{song.year}</span>
            <span className="text-[var(--text-tertiary)]">{song.generation || '-'}</span>
            <Clip set={song.clip_intro !== null} />
            <Clip set={song.clip_chorus !== null} />
            <Clip set={song.clip_verse !== null} />
            <Clip set={song.clip_bridge !== null} />
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">No songs match.</p>
        )}
      </div>

      <p className="text-xs text-[var(--text-tertiary)] mt-2">
        Showing {filtered.length} of {songs.length}
      </p>
    </>
  );
}

function Clip({ set }: { set: boolean }): React.ReactElement {
  return (
    <span className="text-center">
      {set ? (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="inline text-[#27500A]">
          <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <span className="text-[var(--text-tertiary)]">-</span>
      )}
    </span>
  );
}
