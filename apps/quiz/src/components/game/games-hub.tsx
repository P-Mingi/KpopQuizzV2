'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { formatCount } from '@/lib/utils';

import type { GameCardData, NameAllMembersContent, NameAllMember } from '@/lib/db/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GamesHubProps {
  nameAllGames: GameCardData[];
  totCategories: any[]; // categories with nested tot_items
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROUP_PILLS = [
  { label: 'BTS', slug: 'bts' },
  { label: 'BLACKPINK', slug: 'blackpink' },
  { label: 'SEVENTEEN', slug: 'seventeen' },
  { label: 'Stray Kids', slug: 'stray-kids' },
  { label: 'aespa', slug: 'aespa' },
  { label: 'TWICE', slug: 'twice' },
  { label: 'NewJeans', slug: 'newjeans' },
  { label: 'IVE', slug: 'ive' },
  { label: 'EXO', slug: 'exo' },
  { label: 'ENHYPEN', slug: 'enhypen' },
  { label: 'TXT', slug: 'txt' },
];

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  easy: { bg: '#EAF3DE', text: '#27500A' },
  medium: { bg: '#FAEEDA', text: '#633806' },
  hard: { bg: '#FCEBEB', text: '#791F1F' },
};

const TOT_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  idol: { bg: 'rgba(212,83,126,0.25)', text: '#ED93B1' },
  group: { bg: 'rgba(99,168,237,0.25)', text: '#7CBCF5' },
  song: { bg: 'rgba(168,212,83,0.25)', text: '#B5D96B' },
};

const COMING_SOON_GAMES = [
  { title: 'Guess the idol', icon: '\uD83D\uDD0D', color: '#FBEAF0' },
  { title: 'Song roulette', icon: '\uD83C\uDFB5', color: '#E6F1FB' },
  { title: 'Timeline race', icon: '\u23F1', color: '#FAEEDA' },
  { title: 'K-pop bingo', icon: '\uD83C\uDFB0', color: '#EAF3DE' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function formatTimer(s: number): string {
  if (s >= 60) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  }
  return `${s}s`;
}

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

function GroupPills({
  selected,
  onChange,
}: {
  selected: string | null;
  onChange: (slug: string | null) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      <button
        type="button"
        onClick={() => onChange(null)}
        className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
        style={{
          background: selected === null ? 'var(--accent)' : 'var(--bg-surface)',
          color: selected === null ? '#fff' : 'var(--text-secondary)',
          border: selected === null ? 'none' : '1.5px solid var(--border)',
        }}
      >
        All
      </button>
      {GROUP_PILLS.map((g) => (
        <button
          key={g.slug}
          type="button"
          onClick={() => onChange(selected === g.slug ? null : g.slug)}
          className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors"
          style={{
            background: selected === g.slug ? 'var(--accent)' : 'var(--bg-surface)',
            color: selected === g.slug ? '#fff' : 'var(--text-secondary)',
            border: selected === g.slug ? 'none' : '1.5px solid var(--border)',
          }}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

function HeroCards() {
  return (
    <div className="flex gap-2 pt-3.5">
      {/* This or That hero */}
      <Link
        href="/games/this-or-that"
        className="flex-1 rounded-2xl overflow-hidden relative min-h-[160px] flex flex-col justify-end p-3.5 border-[1.5px] hover:-translate-y-[2px] transition-transform"
        style={{ background: '#0C0C0E', borderColor: '#2a2a2a' }}
      >
        <span
          className="inline-flex self-start px-2 py-[3px] rounded-md text-[9px] font-medium mb-2"
          style={{ background: 'rgba(212,83,126,0.25)', color: '#ED93B1' }}
        >
          Tournament
        </span>
        <p className="text-base font-medium mb-[3px] leading-tight" style={{ color: '#fff' }}>
          This or that
        </p>
        <p className="text-[11px] leading-snug mb-2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Pick your bias in head-to-head idol matchups
        </p>
        <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Multiple categories available
        </p>
        <span
          className="inline-flex items-center gap-1 self-start px-3.5 py-[7px] rounded-lg text-[11px] font-medium text-white"
          style={{ background: '#D4537E' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff"><path d="M2 1l7 4-7 4z" /></svg>
          Play
        </span>
      </Link>

      {/* Name All Members hero */}
      <Link
        href="/games/name-all"
        className="flex-1 rounded-2xl overflow-hidden relative min-h-[160px] flex flex-col justify-end p-3.5 border-[1.5px] hover:-translate-y-[2px] transition-transform"
        style={{ background: '#EEEDFE', borderColor: '#CECBF6' }}
      >
        <span
          className="inline-flex self-start px-2 py-[3px] rounded-md text-[9px] font-medium mb-2"
          style={{ background: 'rgba(127,119,221,0.2)', color: '#534AB7' }}
        >
          Memory
        </span>
        <p className="text-base font-medium mb-[3px] leading-tight" style={{ color: '#26215C' }}>
          Name all members
        </p>
        <p className="text-[11px] leading-snug mb-2.5" style={{ color: '#7F77DD' }}>
          Name every member before the timer runs out
        </p>
        <p className="text-[10px] mb-2" style={{ color: '#AFA9EC' }}>
          20+ groups to challenge
        </p>
        <span
          className="inline-flex items-center gap-1 self-start px-3.5 py-[7px] rounded-lg text-[11px] font-medium text-white"
          style={{ background: '#7F77DD' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="#fff"><path d="M2 1l7 4-7 4z" /></svg>
          Play
        </span>
      </Link>
    </div>
  );
}

function TotCategoryCard({ cat }: { cat: any }) {
  const items = cat.tot_items ?? [];
  const left = items[0];
  const right = items[1] ?? items[Math.min(1, items.length - 1)];
  const typeInfo = TOT_TYPE_COLORS[cat.type] ?? TOT_TYPE_COLORS.idol;
  const typeLabel = cat.type === 'idol' ? 'Idols' : cat.type === 'group' ? 'Groups' : 'Songs';

  return (
    <Link href={`/games/this-or-that/${cat.slug}`} className="shrink-0" style={{ width: 170 }}>
      <div className="rounded-[14px] border-[1.5px] border-[#2a2a2a] bg-[#0C0C0E] overflow-hidden hover:border-[#D4537E] hover:-translate-y-[2px] transition-all">
        {/* VS Banner - two halves */}
        <div className="h-[88px] relative flex overflow-hidden">
          {/* Left side */}
          <div className="flex-1 flex items-center justify-center" style={{ background: left?.color || '#1a3f7a' }}>
            <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[10px] font-medium text-white border-2 border-white/20"
              style={{ background: left?.color ? `${left.color}cc` : '#3d2e7a' }}>
              {left?.image_url ? (
                <img src={left.image_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(left?.name || '??')
              )}
            </div>
          </div>

          {/* Diagonal slash */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/[0.08]"
            style={{ transform: 'rotate(12deg)', transformOrigin: 'top center' }} />

          {/* VS badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] w-6 h-6 rounded-full bg-[#0C0C0E] border-[1.5px] border-white/[0.15] flex items-center justify-center">
            <span className="text-[8px] font-bold text-white/50 tracking-wider">VS</span>
          </div>

          {/* Right side */}
          <div className="flex-1 flex items-center justify-center" style={{ background: right?.color || '#0a4a36' }}>
            <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[10px] font-medium text-white border-2 border-white/20"
              style={{ background: right?.color ? `${right.color}cc` : '#0d5a42' }}>
              {right?.image_url ? (
                <img src={right.image_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(right?.name || '??')
              )}
            </div>
          </div>

          {/* Type badge */}
          <span className="absolute top-[5px] right-[5px] px-1.5 py-[2px] rounded text-[8px] font-medium z-[6]"
            style={{ background: typeInfo?.bg ?? 'rgba(212,83,126,0.25)', color: typeInfo?.text ?? '#ED93B1' }}>
            {typeLabel}
          </span>
        </div>

        {/* Body */}
        <div className="px-2.5 py-2 pb-2.5">
          <p className="text-[11px] font-medium text-white leading-tight mb-[3px]">
            {cat.title}
          </p>
          <div className="flex items-center gap-1.5 text-[9px] text-white/[0.35]">
            <span>{items.length} in pool</span>
            <span className="w-[3px] h-[3px] rounded-full bg-white/20" />
            <span>{formatCount(cat.play_count)} plays</span>
          </div>
        </div>
      </div>
    </Link>
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
          {getInitials(m.name)}
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

function NameAllCard({ game }: { game: GameCardData }) {
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

function ComingSoonCard({ title, icon, color }: { title: string; icon: string; color: string }) {
  return (
    <div className="shrink-0 opacity-55" style={{ width: 130 }}>
      <div className="rounded-[14px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="p-3 flex flex-col items-start gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
            style={{ background: color }}
          >
            {icon}
          </div>
          <p className="text-[11px] font-medium text-[var(--text-primary)] leading-tight">
            {title}
          </p>
          <span className="text-[9px] font-medium text-[var(--text-ghost)] uppercase tracking-wider">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  count,
  href,
}: {
  title: string;
  count: number;
  href: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <Link
        href={href}
        className="text-[11px] font-medium text-[var(--accent)] hover:underline"
      >
        See all {count}+
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function GamesHub({ nameAllGames, totCategories }: GamesHubProps) {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Filter ToT categories by search
  const filteredTot = useMemo(() => {
    if (!search.trim()) return totCategories;
    const q = search.toLowerCase().trim();
    return totCategories.filter((cat) => cat.title.toLowerCase().includes(q));
  }, [totCategories, search]);

  // Filter Name All games by search + group
  const filteredNameAll = useMemo(() => {
    let list = [...nameAllGames];

    if (selectedGroup) {
      list = list.filter((g) => g.group_slug === selectedGroup);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.group_name?.toLowerCase().includes(q) ?? false),
      );
    }

    return list;
  }, [nameAllGames, selectedGroup, search]);

  return (
    <div>
      {/* 1. Hero cards */}
      <HeroCards />

      {/* 2. Search bar */}
      <div className="pt-3.5">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* 3. Group pills */}
      <div className="pt-4">
        <GroupPills selected={selectedGroup} onChange={setSelectedGroup} />
      </div>

      {/* 4. This or That section */}
      {filteredTot.length > 0 && (
        <div className="pt-4">
          <SectionHeader
            title="This or that"
            count={totCategories.length}
            href="/games/this-or-that"
          />
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {filteredTot.map((cat) => (
              <TotCategoryCard key={cat.id} cat={cat} />
            ))}
          </div>
        </div>
      )}

      {/* 5. Name All Members section */}
      <div className="pt-4">
        <SectionHeader
          title="Name all members"
          count={nameAllGames.length}
          href="/games/name-all"
        />
        {filteredNameAll.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredNameAll.map((game) => (
              <NameAllCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-tertiary)]">
              No games match your filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedGroup(null);
              }}
              className="text-xs font-medium text-[var(--accent)] hover:underline mt-2"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* 6. Coming soon section */}
      <div className="pt-4">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Coming soon</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {COMING_SOON_GAMES.map((card) => (
            <ComingSoonCard key={card.title} title={card.title} icon={card.icon} color={card.color} />
          ))}
        </div>
      </div>
    </div>
  );
}
