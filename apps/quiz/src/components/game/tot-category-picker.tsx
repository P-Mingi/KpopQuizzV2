'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { formatCount } from '@/lib/utils';

import type { TotCategoryType } from '@/lib/db/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TotCategoryItem {
  id: string;
  name: string;
  color: string;
  image_url: string | null;
}

interface TotCategoryWithItems {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  type: TotCategoryType;
  pool_size: number;
  play_count: number;
  is_published: boolean;
  created_at: string;
  tot_items: TotCategoryItem[];
}

interface TotCategoryPickerProps {
  categories: TotCategoryWithItems[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_FILTERS: { key: TotCategoryType | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'idol', label: 'Idols' },
  { key: 'group', label: 'Groups' },
  { key: 'song', label: 'Songs' },
];

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  idol: { bg: 'rgba(212,83,126,0.25)', text: '#ED93B1' },
  group: { bg: 'rgba(99,168,237,0.25)', text: '#7CBCF5' },
  song: { bg: 'rgba(168,212,83,0.25)', text: '#B5D96B' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
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
        placeholder="Search categories..."
        className="w-full pl-9 pr-3 py-2.5 rounded-xl border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-ghost)] focus:outline-none focus:border-[var(--accent)] transition-colors"
      />
    </div>
  );
}

function TypeFilterPills({
  selected,
  onChange,
}: {
  selected: TotCategoryType | null;
  onChange: (type: TotCategoryType | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TYPE_FILTERS.map((t) => {
        const active = selected === t.key;
        return (
          <button
            key={t.label}
            type="button"
            onClick={() => onChange(t.key)}
            className={`px-3.5 py-[7px] rounded-[10px] text-[11px] font-medium border-[1.5px] transition-colors active:scale-[0.97] ${
              active
                ? 'bg-accent text-white border-accent'
                : 'bg-accent-bg text-accent-hover border-transparent hover:border-accent'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function CategoryCard({ category }: { category: TotCategoryWithItems }) {
  const items = category.tot_items ?? [];
  const left = items[0];
  const right = items[1] ?? items[Math.min(1, items.length - 1)];
  const typeInfo = (TYPE_COLORS[category.type] ?? TYPE_COLORS.idol)!;
  const typeLabel = category.type === 'idol' ? 'Idols' : category.type === 'group' ? 'Groups' : 'Songs';

  return (
    <Link href={`/games/this-or-that/${category.slug}`}>
      <div className="rounded-[14px] border-[1.5px] border-[#2a2a2a] bg-[#0C0C0E] overflow-hidden hover:border-[#D4537E] hover:-translate-y-[2px] transition-all">
        {/* VS Banner */}
        <div className="h-[88px] relative flex overflow-hidden">
          {/* Left side */}
          <div className="flex-1 flex items-center justify-center" style={{ background: left?.color || '#1a3f7a' }}>
            <div
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[10px] font-medium text-white border-2 border-white/20 overflow-hidden"
              style={{ background: left?.color ? `${left.color}cc` : '#3d2e7a' }}
            >
              {left?.image_url ? (
                <img src={left.image_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(left?.name || '??')
              )}
            </div>
          </div>

          {/* Diagonal slash */}
          <div
            className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-white/[0.08]"
            style={{ transform: 'rotate(12deg)', transformOrigin: 'top center' }}
          />

          {/* VS badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] w-6 h-6 rounded-full bg-[#0C0C0E] border-[1.5px] border-white/[0.15] flex items-center justify-center">
            <span className="text-[8px] font-bold text-white/50 tracking-wider">VS</span>
          </div>

          {/* Right side */}
          <div className="flex-1 flex items-center justify-center" style={{ background: right?.color || '#0a4a36' }}>
            <div
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[10px] font-medium text-white border-2 border-white/20 overflow-hidden"
              style={{ background: right?.color ? `${right.color}cc` : '#0d5a42' }}
            >
              {right?.image_url ? (
                <img src={right.image_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(right?.name || '??')
              )}
            </div>
          </div>

          {/* Type badge */}
          <span
            className="absolute top-[5px] right-[5px] px-1.5 py-[2px] rounded text-[8px] font-medium z-[6]"
            style={{ background: typeInfo.bg, color: typeInfo.text }}
          >
            {typeLabel}
          </span>
        </div>

        {/* Body */}
        <div className="px-2.5 py-2 pb-2.5">
          <p className="text-[11px] font-medium text-white leading-tight mb-[3px]">
            {category.title}
          </p>
          <div className="flex items-center gap-1.5 text-[9px] text-white/[0.35]">
            <span>{items.length} in pool</span>
            <span className="w-[3px] h-[3px] rounded-full bg-white/20" />
            <span>{formatCount(category.play_count)} plays</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TotCategoryPicker({ categories }: TotCategoryPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<TotCategoryType | null>(null);

  const filteredCategories = useMemo(() => {
    let list = [...categories];

    if (selectedType !== null) {
      list = list.filter((c) => c.type === selectedType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.subtitle?.toLowerCase().includes(q) ?? false),
      );
    }

    return list;
  }, [categories, selectedType, searchQuery]);

  function clearAllFilters() {
    setSearchQuery('');
    setSelectedType(null);
  }

  return (
    <div>
      {/* Title */}
      <h1 className="text-xl font-medium text-primary">This or that</h1>
      <p className="text-xs text-tertiary mt-1">Pick a category and crown your #1</p>

      {/* Search */}
      <div className="mt-4">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Type filter pills */}
      <div className="mt-3">
        <TypeFilterPills selected={selectedType} onChange={setSelectedType} />
      </div>

      {/* Category grid */}
      {filteredCategories.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          {filteredCategories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-tertiary)] mb-2">
            No categories match these filters.
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

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link
          href="/games"
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          Back to all games
        </Link>
      </div>
    </div>
  );
}
