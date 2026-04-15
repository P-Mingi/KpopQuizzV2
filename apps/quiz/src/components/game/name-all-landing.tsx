'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { formatCount } from '@/lib/utils';

import type { GameCardData, NameAllMembersContent, NameAllMember } from '@/lib/db/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function formatTimer(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `0:${sec.toString().padStart(2, '0')}`;
}

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: '#EAF3DE', text: '#27500A' },
  medium: { bg: '#FAEEDA', text: '#633806' },
  hard: { bg: '#FCEBEB', text: '#791F1F' },
};

const GROUP_BG: Record<string, string> = {
  BTS: '#E6F1FB', BLACKPINK: '#FAF2F5', SEVENTEEN: '#EEEDFE',
  'Stray Kids': '#E1F5EE', aespa: '#FBEAF0', TWICE: '#FBEAF0',
  NewJeans: '#EEEDFE', IVE: '#EEEDFE', EXO: '#FCEBEB',
  ENHYPEN: '#FAEEDA', TXT: '#FAEEDA', ATEEZ: '#FCEBEB',
};

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
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
          {filtered.map(game => {
            const raw = game.content as unknown as Record<string, unknown>;
            const members: NameAllMember[] = (raw.members as NameAllMember[]) ??
              ((raw.items as Array<{ name: string; color?: string }>)?.map((it, i) => ({
                name: it.name, aliases: [], photo_url: null, position: '',
                color: it.color ?? ['#D4537E', '#7F77DD', '#0F6E56', '#BA7517', '#378ADD'][i % 5],
              }))) ?? [];
            const diff = (raw.difficulty as string) ?? 'medium';
            const timer = (raw.timer_seconds as number) ?? 60;
            const diffColors = DIFF_COLORS[diff];
            const bannerBg = GROUP_BG[game.group_name ?? ''] ?? '#F0EDE8';
            const isSong = game.game_type === 'name_all_songs' || game.game_type === 'name_top_songs';
            const itemLabel = isSong ? 'songs' : game.game_type === 'name_all_groups' ? 'groups' : game.game_type === 'name_all_idols' ? 'idols' : 'members';

            return (
              <Link key={game.id} href={`/games/name-all/${game.slug}`}>
                <div className="rounded-[14px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden hover:border-[var(--accent)] hover:-translate-y-[2px] transition-all">
                  <div className="h-[70px] flex items-center justify-center relative" style={{ background: bannerBg }}>
                    {isSong ? (
                      <div className="flex gap-1">
                        {[0, 1].map(si => (
                          <div key={si} className="w-7 h-7 rounded-md flex items-center justify-center border-2 border-white"
                            style={{ background: members[si]?.color || '#3a2a4a' }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round">
                              <path d="M3 9h2l2-3 2 5 1.5-3H12" />
                            </svg>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex">
                        {members.slice(0, 3).map((m: NameAllMember, i: number) => (
                          <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-medium text-white border-2 border-white"
                            style={{ background: m.color || '#888780', marginLeft: i > 0 ? '-6px' : '0' }}>
                            {getInitials(m.name)}
                          </div>
                        ))}
                        {members.length > 3 && (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[8px] font-medium text-[#888780] bg-[#E8E6E0] border-2 border-white" style={{ marginLeft: '-6px' }}>
                            +{members.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    {diffColors && (
                      <span className="absolute top-[5px] left-[5px] px-[6px] py-[2px] rounded text-[9px] font-medium capitalize"
                        style={{ backgroundColor: diffColors.bg, color: diffColors.text }}>
                        {diff}
                      </span>
                    )}
                    <span className="absolute top-[5px] right-[5px] px-[6px] py-[2px] rounded text-[9px] font-medium bg-white/90 text-[#888780]">
                      {formatTimer(timer)}
                    </span>
                  </div>
                  <div className="px-2.5 py-2 pb-2.5">
                    <p className="text-[11px] font-medium text-[var(--text-primary)] leading-tight mb-[2px] line-clamp-2">{game.title}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{members.length} {itemLabel} / {formatCount(game.play_count)} plays</p>
                  </div>
                </div>
              </Link>
            );
          })}
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
