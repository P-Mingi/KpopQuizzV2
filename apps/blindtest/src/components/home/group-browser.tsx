'use client';

import { useEffect, useMemo, useState } from 'react';

export interface BrowserGroup {
  id: string;
  name: string;
  count: number;
  gender?: string | null;
  generation?: string | null;
}

interface Props {
  groups: BrowserGroup[];
  selectedPlaylist: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}

interface Section {
  letter: string;
  items: BrowserGroup[];
}

const FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'gg', label: 'Girl groups' },
  { id: 'bg', label: 'Boy groups' },
  { id: 'solo', label: 'Solo' },
  { id: '4th', label: '4th gen' },
  { id: '3rd', label: '3rd gen' },
  { id: '2nd', label: '2nd gen' },
];

const INITIAL_OVERRIDES: Record<string, string> = {
  BLACKPINK: 'BP',
  'Stray Kids': 'SKZ',
  NewJeans: 'NJ',
  '(G)I-DLE': 'GI',
  'TOMORROW X TOGETHER': 'TXT',
  'LE SSERAFIM': 'LS',
  'Red Velvet': 'RV',
  SEVENTEEN: 'SVT',
  'NCT 127': 'NCT',
  'NCT DREAM': 'ND',
  'MONSTA X': 'MX',
  BIGBANG: 'BB',
  'KISS OF LIFE': 'KOL',
  'YOUNG POSSE': 'YP',
};

function getInitials(name: string): string {
  const override = INITIAL_OVERRIDES[name];
  if (override) return override;
  const clean = name.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = words[0]?.charAt(0) ?? '';
    const second = words[1]?.charAt(0) ?? '';
    return (first + second).toUpperCase();
  }
  return (clean.slice(0, 2) || name.slice(0, 2)).toUpperCase();
}

function genderLabel(gender: string | null | undefined): string {
  switch (gender) {
    case 'gg': return 'Girl group';
    case 'bg': return 'Boy group';
    case 'solo_female': return 'Solo';
    case 'solo_male': return 'Solo';
    case 'coed': return 'Co-ed';
    default: return '';
  }
}

function genBadgeClass(gen: string | null | undefined): string {
  switch (gen) {
    case '5th':
    case '4th':
      return 'bg-accent-bg text-accent';
    case '3rd':
      return 'bg-correct-bg text-correct';
    case '2nd':
      return 'bg-streak-bg text-streak';
    case '1st':
      return 'bg-elevated text-secondary';
    default:
      return 'bg-elevated text-ghost';
  }
}

export function GroupBrowser({ groups, selectedPlaylist, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filteredGroups = useMemo(() => {
    let result = groups;

    if (activeFilter === 'gg') {
      result = result.filter((g) => g.gender === 'gg');
    } else if (activeFilter === 'bg') {
      result = result.filter((g) => g.gender === 'bg');
    } else if (activeFilter === 'solo') {
      result = result.filter((g) => g.gender === 'solo_female' || g.gender === 'solo_male');
    } else if (activeFilter === '4th') {
      result = result.filter((g) => g.generation === '4th' || g.generation === '5th');
    } else if (activeFilter === '3rd') {
      result = result.filter((g) => g.generation === '3rd');
    } else if (activeFilter === '2nd') {
      result = result.filter((g) => g.generation === '2nd' || g.generation === '1st');
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }

    return result;
  }, [groups, activeFilter, search]);

  const sections: Section[] = useMemo(() => {
    if (search.trim()) {
      // Flat search results.
      return [{ letter: 'Search results', items: filteredGroups }];
    }

    // When filtered by generation, sub-group by gender.
    if (activeFilter === '4th' || activeFilter === '3rd' || activeFilter === '2nd') {
      const allSorted = [...filteredGroups].sort((a, b) => b.count - a.count);
      const ggs = allSorted.filter((g) => g.gender === 'gg');
      const bgs = allSorted.filter((g) => g.gender === 'bg');
      const solos = allSorted.filter((g) => g.gender === 'solo_female' || g.gender === 'solo_male');
      const result: Section[] = [];
      const genLabel = activeFilter === '4th' ? '4th gen' : activeFilter === '3rd' ? '3rd gen' : '2nd gen';
      if (ggs.length > 0) result.push({ letter: `${genLabel} - Girl groups`, items: ggs });
      if (bgs.length > 0) result.push({ letter: `${genLabel} - Boy groups`, items: bgs });
      if (solos.length > 0) result.push({ letter: `${genLabel} - Solo`, items: solos });
      return result;
    }

    // Default: Popular section (top 8 by count) first, then alphabetical for the rest.
    const sortedByCount = [...filteredGroups].sort((a, b) => b.count - a.count);
    const popular = sortedByCount.slice(0, 8);
    const popularIds = new Set(popular.map((g) => g.id));
    const rest = filteredGroups
      .filter((g) => !popularIds.has(g.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const result: Section[] = [];
    if (popular.length > 0 && activeFilter === 'all') {
      result.push({ letter: 'Popular', items: popular });
    } else if (activeFilter !== 'all') {
      // For gg/bg/solo filters, just show sorted-by-count (no popular split, no alphabetical).
      return [{ letter: FILTERS.find((f) => f.id === activeFilter)?.label ?? 'Results', items: sortedByCount }];
    }

    // Alphabetical bucketing for the remainder.
    let currentLetter = '';
    let currentItems: BrowserGroup[] = [];
    for (const g of rest) {
      const firstChar = (g.name[0] ?? '#').toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (letter !== currentLetter) {
        if (currentItems.length > 0) {
          result.push({ letter: currentLetter, items: currentItems });
        }
        currentLetter = letter;
        currentItems = [g];
      } else {
        currentItems.push(g);
      }
    }
    if (currentItems.length > 0) {
      result.push({ letter: currentLetter, items: currentItems });
    }

    return result;
  }, [filteredGroups, search, activeFilter]);

  function handleSelect(group: BrowserGroup) {
    onSelect(group.name);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center">
      {/* Backdrop (desktop only) */}
      <div
        className="hidden md:block absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Container: full-screen on mobile, modal on desktop */}
      <div
        className="h-full md:h-auto md:max-h-[80vh] w-full md:max-w-[480px] md:rounded-2xl md:border md:border-default bg-primary flex flex-col relative shadow-card"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a group"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-subtle">
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-medium text-accent hover:underline"
          >
            Back
          </button>
          <span className="text-base font-semibold text-primary flex-1">
            Choose a group
          </span>
          <span className="text-[11px] text-ghost tabular-nums">
            {filteredGroups.length}
          </span>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search artists..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full py-2.5 pl-10 pr-4 rounded-[10px] bg-surface border border-default text-[13px] text-primary placeholder:text-ghost outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => {
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap flex-shrink-0 border transition-colors ${
                  active
                    ? 'bg-accent text-primary border-accent'
                    : 'bg-surface text-ghost border-default hover:border-accent'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Artist list */}
        <div className="flex-1 overflow-y-auto px-5 scrollbar-hide">
          {sections.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-ghost">No artists found</p>
            </div>
          )}

          {sections.map((section, si) => (
            <div key={si}>
              <div className="text-[10px] font-semibold text-ghost uppercase tracking-wider py-2.5 border-b border-subtle mb-1">
                {section.letter}
              </div>

              {section.items.map((group) => {
                const isSelected = selectedPlaylist === group.name;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleSelect(group)}
                    className={`w-full flex items-center gap-3 py-2.5 border-b border-subtle last:border-0 text-left transition-colors ${
                      isSelected ? 'bg-accent-bg -mx-3 px-3 rounded-[10px] border-transparent' : ''
                    }`}
                  >
                    {/* Initials avatar */}
                    <div
                      className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-accent border border-accent' : 'bg-elevated'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-semibold ${
                          isSelected ? 'text-primary' : 'text-tertiary'
                        }`}
                      >
                        {getInitials(group.name)}
                      </span>
                    </div>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] font-medium truncate ${
                          isSelected ? 'text-accent' : 'text-primary'
                        }`}
                      >
                        {group.name}
                      </p>
                      <p className="text-[10px] text-ghost flex items-center gap-1.5 mt-0.5">
                        {group.gender && <span>{genderLabel(group.gender)}</span>}
                        {group.generation && (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${genBadgeClass(group.generation)}`}
                          >
                            {group.generation}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Song count */}
                    <span
                      className={`text-[11px] tabular-nums flex-shrink-0 ${
                        isSelected ? 'text-accent' : 'text-ghost'
                      }`}
                    >
                      {group.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}

          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}
