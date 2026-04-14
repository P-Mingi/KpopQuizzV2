'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { GroupFilterPills } from '@/components/quiz/quiz-filters';
import { formatCount } from '@/lib/utils';

import type { GroupOption } from '@/components/quiz/quiz-filters';
import type {
  GameCardData,
  NameAllMembersContent,
  NameAllMember,
  BlindTestContent,
} from '@/lib/db/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GameTypeFilter = 'blind_test' | 'name_all_members' | null;

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
    // Convert hex to rgb for opacity
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

// ---------------------------------------------------------------------------
// Game type pill options
// ---------------------------------------------------------------------------

interface GameTypePill {
  key: GameTypeFilter;
  label: string;
  disabled?: boolean;
}

const GAME_TYPE_PILLS: GameTypePill[] = [
  { key: null, label: 'All' },
  { key: 'name_all_members', label: 'Name all members' },
  { key: 'blind_test', label: 'Blind test' },
];

const COMING_SOON_PILLS = [
  { label: 'Guess idol' },
  { label: 'Timeline' },
];

// ---------------------------------------------------------------------------
// Coming soon concept cards
// ---------------------------------------------------------------------------

const COMING_SOON_GAMES = [
  { title: 'Guess the idol', description: 'Identify idols from photos, silhouettes and hints' },
  { title: 'Song roulette', description: 'Random songs, rapid-fire guessing' },
  { title: 'Timeline race', description: 'Put K-pop events in the right order' },
  { title: 'K-pop bingo', description: 'Fill your bingo board with K-pop trivia' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-ghost)]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
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

function GameTypePills({
  selected,
  onChange,
}: {
  selected: GameTypeFilter;
  onChange: (key: GameTypeFilter) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5">
      {GAME_TYPE_PILLS.map((pill) => {
        const active = selected === pill.key;
        return (
          <button
            key={pill.label}
            type="button"
            onClick={() => onChange(pill.key)}
            className={`flex-shrink-0 px-3.5 py-[7px] rounded-[10px] text-[11px] font-medium border-[1.5px] transition-colors active:scale-[0.97] ${
              active
                ? 'bg-accent text-white border-accent'
                : 'bg-accent-bg text-accent-hover border-transparent hover:border-accent'
            }`}
          >
            {pill.label}
          </button>
        );
      })}
      {COMING_SOON_PILLS.map((pill) => (
        <button
          key={pill.label}
          type="button"
          disabled
          className="flex-shrink-0 px-3.5 py-[7px] rounded-[10px] text-[11px] font-medium border-[1.5px] border-transparent bg-[var(--bg-elevated)] text-[var(--text-ghost)] cursor-not-allowed opacity-50"
        >
          {pill.label}
          <span className="ml-1 text-[9px] uppercase tracking-wide">soon</span>
        </button>
      ))}
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
          style={{
            background: m.color || '#B0ADA5',
            marginLeft: i > 0 ? '-8px' : '0',
          }}
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

function MusicNoteIcon() {
  return (
    <svg
      className="w-8 h-8 text-[var(--text-ghost)]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  );
}

function GameCard({ game }: { game: GameCardData }) {
  const isNameAll = game.game_type === 'name_all_members';
  const isBlindTest = game.game_type === 'blind_test';

  const nameAllContent = isNameAll
    ? (game.content as NameAllMembersContent)
    : null;
  const blindTestContent = isBlindTest
    ? (game.content as BlindTestContent)
    : null;

  const members = nameAllContent?.members ?? [];
  const difficulty =
    nameAllContent?.difficulty ?? blindTestContent?.settings?.difficulty ?? null;
  const timer = nameAllContent?.timer_seconds ?? null;
  const diffColors = difficulty ? DIFFICULTY_COLORS[difficulty] : null;

  const memberCount = members.length;
  const songCount = blindTestContent?.songs?.length ?? 0;

  const href = isNameAll
    ? `/games/name-all/${game.slug}`
    : `/g/${game.slug}`;

  return (
    <Link href={href}>
      <div className="rounded-[14px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden hover:border-[var(--accent)] hover:-translate-y-[2px] transition-all">
        {/* Banner */}
        <div
          className="h-[90px] relative flex items-center justify-center"
          style={{ background: getBannerBg(game) }}
        >
          {isNameAll && members.length > 0 && (
            <MemberAvatarStack members={members} />
          )}
          {isBlindTest && <MusicNoteIcon />}

          {/* Difficulty badge top-left */}
          {difficulty && diffColors && (
            <span
              className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize"
              style={{ backgroundColor: diffColors.bg, color: diffColors.text }}
            >
              {difficulty}
            </span>
          )}

          {/* Timer badge top-right (name_all only) */}
          {isNameAll && timer != null && (
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
            {isNameAll && memberCount > 0 && (
              <>
                <span>{memberCount} members</span>
                <span className="w-[3px] h-[3px] rounded-full bg-[#D3D1C7]" />
              </>
            )}
            {isBlindTest && songCount > 0 && (
              <>
                <span>{songCount} songs</span>
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

function ComingSoonSection() {
  return (
    <div className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-ghost)] mb-3">
        Coming soon
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 opacity-60 pointer-events-none">
        {COMING_SOON_GAMES.map((card) => (
          <div
            key={card.title}
            className="rounded-[14px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] p-3"
          >
            <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
              {card.title}
            </p>
            <p className="text-[10px] text-[var(--text-tertiary)] leading-snug">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-[var(--text-tertiary)] mb-2">
        No games match these filters.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-medium text-[var(--accent)] hover:underline"
      >
        Clear all filters
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GamesHub({ initialGames, groups }: GamesHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGameType, setSelectedGameType] =
    useState<GameTypeFilter>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const filteredGames = useMemo(() => {
    let list = [...initialGames];

    // Filter by game type
    if (selectedGameType) {
      list = list.filter((g) => g.game_type === selectedGameType);
    }

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
  }, [initialGames, selectedGameType, selectedGroupId, searchQuery, groups]);

  function clearAllFilters() {
    setSearchQuery('');
    setSelectedGameType(null);
    setSelectedGroupId(null);
  }

  return (
    <div>
      {/* Title */}
      <h1 className="text-xl font-medium text-primary">K-pop games</h1>
      <p className="text-xs text-tertiary mt-1">
        Challenge your K-pop knowledge with different game modes
      </p>

      {/* Search */}
      <div className="mt-4">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Game type pills */}
      <div className="mt-3">
        <GameTypePills
          selected={selectedGameType}
          onChange={setSelectedGameType}
        />
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
        <EmptyState onClear={clearAllFilters} />
      )}

      {/* Coming soon section */}
      <ComingSoonSection />
    </div>
  );
}
