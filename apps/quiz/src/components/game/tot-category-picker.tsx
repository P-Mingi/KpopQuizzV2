'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { formatCount } from '@/lib/utils';

import type { TotCategory, TotCategoryType } from '@/lib/db/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TotCategoryPickerProps {
  categories: TotCategory[];
}

// ---------------------------------------------------------------------------
// Type filter config
// ---------------------------------------------------------------------------

const TYPE_FILTERS: { key: TotCategoryType | null; label: string }[] = [
  { key: null, label: 'All' },
  { key: 'idol', label: 'Idols' },
  { key: 'group', label: 'Groups' },
  { key: 'song', label: 'Songs' },
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

function typeBadgeLabel(type: TotCategoryType): string {
  if (type === 'idol') return 'Idols';
  if (type === 'group') return 'Groups';
  return 'Songs';
}

function CategoryCard({ category }: { category: TotCategory }) {
  return (
    <Link href={`/games/this-or-that/${category.slug}`}>
      <div className="rounded-[14px] border-[1.5px] border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden hover:border-[var(--accent)] hover:-translate-y-[2px] transition-all">
        {/* Banner */}
        <div
          className="h-[90px] relative flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #F0EDE8 0%, #E8E5DF 100%)' }}
        >
          {/* VS icon centered */}
          <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
            <span className="text-xs font-bold text-[var(--accent)]">VS</span>
          </div>

          {/* Type badge top-right */}
          <span className="absolute top-2 right-2 px-2 py-[2px] rounded text-[9px] font-semibold bg-[var(--accent-bg)] text-[#993556]">
            {typeBadgeLabel(category.type)}
          </span>

          {/* Pool size bottom-left */}
          <span className="absolute bottom-2 left-2 text-[10px] font-medium text-[var(--text-tertiary)]">
            {category.pool_size} in pool
          </span>
        </div>

        {/* Body */}
        <div className="p-2.5 pb-3">
          <p className="text-xs font-medium text-[var(--text-primary)] leading-tight mb-1">
            {category.title}
          </p>
          <p className="text-[10px] text-[var(--text-tertiary)]">
            {formatCount(category.play_count)} plays
          </p>
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

    // Filter by type
    if (selectedType !== null) {
      list = list.filter((c) => c.type === selectedType);
    }

    // Filter by search query
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
