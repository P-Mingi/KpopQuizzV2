'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

import { TotCategoryCard } from '@/components/games/tot-category-card';

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
        <div className="mt-4 flex flex-wrap gap-2.5 justify-center sm:justify-start">
          {filteredCategories.map((category) => (
            <TotCategoryCard key={category.id} category={category} />
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
