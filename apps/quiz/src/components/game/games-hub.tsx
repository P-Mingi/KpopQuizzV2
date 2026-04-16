'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { TotCategoryCard } from '@/components/games/tot-category-card';
import { NameAllGrid } from '@/components/games/name-all-grid';
import { toNameAllGame } from '@/components/games/adapters';

import type { GameCardData } from '@/lib/db/types';

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

const COMING_SOON_GAMES = [
  { title: 'Guess the idol', icon: '\uD83D\uDD0D', color: '#FBEAF0' },
  { title: 'Song roulette', icon: '\uD83C\uDFB5', color: '#E6F1FB' },
  { title: 'Timeline race', icon: '\u23F1', color: '#FAEEDA' },
  { title: 'K-pop bingo', icon: '\uD83C\uDFB0', color: '#EAF3DE' },
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
              <TotCategoryCard key={cat.id} category={cat} />
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
          <NameAllGrid games={filteredNameAll.map(toNameAllGame)} />
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
