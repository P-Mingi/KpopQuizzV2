'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { NameAllGrid } from '@/components/games/name-all-grid';
import { toNameAllGame } from '@/components/games/adapters';

import type { GameCardData, NameAllMembersContent } from '@/lib/db/types';

const GROUPS = ['BTS', 'BLACKPINK', 'SEVENTEEN', 'Stray Kids', 'aespa', 'TWICE', 'NewJeans', 'IVE', 'EXO', 'ENHYPEN', 'TXT', 'ATEEZ'];

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NameAllLandingProps {
  games: GameCardData[];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function NameAllLanding({ games }: NameAllLandingProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');

  const filtered = useMemo(() => {
    let list = [...games];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(g => g.title.toLowerCase().includes(q) || (g.group_name?.toLowerCase().includes(q) ?? false));
    }
    if (selectedGroup) {
      list = list.filter(g => g.group_slug === selectedGroup);
    }
    if (difficulty !== 'all') {
      list = list.filter(g => {
        const content = g.content as NameAllMembersContent;
        return content?.difficulty === difficulty;
      });
    }
    return list;
  }, [games, search, selectedGroup, difficulty]);

  return (
    <div>
      {/* Header */}
      <h1 className="text-xl font-medium text-primary">Name all members</h1>
      <p className="text-xs text-tertiary mt-1">
        Type every member's name before the timer runs out. {games.length} groups. Two modes.
      </p>

      {/* Search */}
      <div className="relative mt-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        />
      </div>

      {/* Group pills */}
      <div className="flex gap-[5px] mt-3 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setSelectedGroup(null)}
          className={`flex-shrink-0 px-3.5 py-[6px] rounded-[10px] text-[11px] font-medium border-[1.5px] transition-all ${
            selectedGroup === null ? 'bg-accent text-white border-accent' : 'bg-accent-bg text-[#993556] border-transparent'
          }`}
        >
          All
        </button>
        {GROUPS.map(group => {
          const slug = group.toLowerCase().replace(/[^a-z0-9]/g, '-');
          return (
            <button
              key={group}
              onClick={() => setSelectedGroup(selectedGroup === slug ? null : slug)}
              className={`flex-shrink-0 px-3.5 py-[6px] rounded-[10px] text-[11px] font-medium border-[1.5px] transition-all whitespace-nowrap ${
                selectedGroup === slug ? 'bg-accent text-white border-accent' : 'bg-accent-bg text-[#993556] border-transparent hover:border-accent'
              }`}
            >
              {group}
            </button>
          );
        })}
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-1.5 mt-3">
        {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-3 py-[5px] rounded-md text-[10px] font-medium transition-colors capitalize ${
              difficulty === d ? 'text-accent bg-accent-bg' : 'text-tertiary bg-elevated hover:text-secondary'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Game grid */}
      {filtered.length > 0 ? (
        <div className="mt-4">
          <NameAllGrid games={filtered.map(toNameAllGame)} />
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-tertiary)] mb-2">No games match these filters.</p>
          <button onClick={() => { setSearch(''); setSelectedGroup(null); setDifficulty('all'); }} className="text-xs font-medium text-[var(--accent)] hover:underline">
            Clear all filters
          </button>
        </div>
      )}

      {/* Back link */}
      <div className="text-center mt-6">
        <Link href="/games" className="text-xs font-medium text-tertiary hover:text-accent transition-colors">
          Back to all games
        </Link>
      </div>
    </div>
  );
}
