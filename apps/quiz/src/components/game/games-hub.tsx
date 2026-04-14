'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { GroupFilterPills } from '@/components/quiz/quiz-filters';
import { formatCount } from '@/lib/utils';

import type { GroupOption } from '@/components/quiz/quiz-filters';
import type { GameCardData, NameAllMembersContent, NameAllMember } from '@/lib/db/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GamesHubProps {
  initialGames: GameCardData[];
  groups: GroupOption[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatTimer = (s: number) =>
  s >= 60
    ? `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
    : `${s}s`;

function getBannerBg(game: GameCardData): string {
  if (game.display_color) {
    const hex = game.display_color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.10)`;
  }
  return '#F0EDE8';
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: '#EAF3DE', text: '#27500A' },
  medium: { bg: '#FAEEDA', text: '#633806' },
  hard: { bg: '#FCEBEB', text: '#791F1F' },
};

const COMING_SOON_GAMES = [
  { title: 'Guess the idol', description: 'Identify idols from photos, silhouettes and hints' },
  { title: 'Blind test', description: 'Listen to K-pop clips and guess the song' },
  { title: 'Timeline race', description: 'Put K-pop events in the right order' },
  { title: 'K-pop bingo', description: 'Fill your bingo board with K-pop trivia' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search games..."
        className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
    </div>
  );
}

function MemberAvatarStack({ members }: { members: NameAllMember[] }) {
  return (
    <div className="flex items-center justify-center">
      {members.slice(0, 3).map((m, i) => (
        <div
          key={i}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-semibold text-white border-2 border-white"
          style={{ background: m.color || '#B0ADA5', marginLeft: i > 0 ? '-8px' : '0' }}
        >
          {m.name.slice(0, 2).toUpperCase()}
        </div>
      ))}
      {members.length > 3 && (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-semibold text-[#888780] bg-[#F0EDE8] border-2 border-white"
          style={{ marginLeft: '-8px' }}
        >
          +{members.length - 3}
        </div>
      )}
    </div>
  );
}

function GameCard({ game }: { game: GameCardData }) {
  const content = game.content as NameAllMembersContent;
  const members = content?.members ?? [];
  const difficulty = content?.difficulty ?? null;
  const timer = content?.timer_seconds ?? null;
  const diffColors = difficulty ? DIFFICULTY_COLORS[difficulty] : null;

  return (
    <Link href={`/games/name-all/${game.slug}`}>
      <div className="rounded-[14px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden hover:border-[var(--accent)] hover:-translate-y-[2px] transition-all">
        {/* Banner */}
        <div
          className="h-[90px] relative flex items-center justify-center"
          style={{ background: getBannerBg(game) }}
        >
          {members.length > 0 && <MemberAvatarStack members={members} />}

          {difficulty && diffColors && (
            <span
              className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
              style={{ backgroundColor: diffColors.bg, color: diffColors.text }}
            >
              {difficulty}
            </span>
          )}

          {timer != null && (
            <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/80 text-[var(--text-secondary)]">
              {formatTimer(timer)}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-2.5 pb-3">
          <p className="text-xs font-medium text-[var(--text-primary)] leading-tight mb-1 line-clamp-2">
            {game.title}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)]">
            {members.length > 0 && (
              <>
                <span>{members.length} members</span>
                <span className="w-[3px] h-[3px] rounded-full bg-[#D3D1C7]" />
              </>
            )}
            <span>{formatCount(game.play_count)} plays</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GamesHub({ initialGames, groups }: GamesHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const filteredGames = useMemo(() => {
    let list = [...initialGames];

    // Filter by group
    if (selectedGroupId !== null) {
      const match = groups.find((g) => g.id === selectedGroupId);
      if (match) {
        list = list.filter((g) => g.group_slug === match.slug);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.group_name?.toLowerCase().includes(q) ?? false),
      );
    }

    return list;
  }, [initialGames, selectedGroupId, searchQuery, groups]);

  function clearAllFilters() {
    setSearchQuery('');
    setSelectedGroupId(null);
  }

  return (
    <div>
      {/* Title */}
      <h1 className="text-xl font-medium text-primary">K-pop games</h1>
      <p className="text-xs text-tertiary mt-1">
        Name all members of your favorite K-pop groups before time runs out
      </p>

      {/* Search */}
      <div className="mt-4">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Group filter pills */}
      <div className="mt-3">
        <GroupFilterPills
          groups={groups}
          selectedId={selectedGroupId}
          onChange={setSelectedGroupId}
        />
      </div>

      {/* Game grid */}
      {filteredGames.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-tertiary)] mb-2">
            No games match these filters.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-medium text-[var(--accent)] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Coming soon section */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-ghost)] mb-3">
          Coming soon
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 opacity-60 pointer-events-none">
          {COMING_SOON_GAMES.map((card) => (
            <div key={card.title} className="rounded-[14px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] p-3">
              <p className="text-xs font-medium text-[var(--text-primary)] mb-1">{card.title}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] leading-snug">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
