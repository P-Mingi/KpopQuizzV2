'use client';

import type { QuizTypeKey } from '@/components/ui/quiz-type-badge';
import { QuizTypeIcon } from '@/components/quiz/quiz-type-icon';

// ============================================
// Group filter pills (pink-tinted)
// ============================================

export interface GroupOption {
  id: number;
  name: string;
  slug: string;
  quiz_count: number;
}

interface GroupFilterPillsProps {
  groups: GroupOption[];
  /** `null` means "All" is selected. */
  selectedId: number | null;
  onChange: (id: number | null) => void;
  /** Max number of pills before the "+N more" folds the rest. Default 12. */
  visibleLimit?: number;
}

export function GroupFilterPills({
  groups,
  selectedId,
  onChange,
  visibleLimit = 12,
}: GroupFilterPillsProps) {
  const visible = groups.slice(0, visibleLimit);

  return (
    <div className="flex flex-wrap gap-1.5">
      <GroupPillButton
        label="All"
        active={selectedId === null}
        onClick={() => onChange(null)}
        neutral={false}
      />
      {visible.map((g) => (
        <GroupPillButton
          key={g.id}
          label={g.name}
          active={selectedId === g.id}
          onClick={() => onChange(g.id)}
        />
      ))}
    </div>
  );
}

function GroupPillButton({
  label,
  active,
  onClick,
  neutral = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  neutral?: boolean;
}) {
  const className = active
    ? 'bg-accent text-white border-accent'
    : neutral
    ? 'bg-surface text-secondary border-default hover:border-accent'
    : 'bg-accent-bg text-accent-hover border-transparent hover:border-accent';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-[7px] rounded-[10px] text-[11px] font-medium border-[1.5px] transition-colors active:scale-[0.97] ${className}`}
    >
      {label}
    </button>
  );
}

// ============================================
// Type filter pills (colored dot + label)
// ============================================

export interface TypeOption {
  key: QuizTypeKey;
  label: string;
}

const DEFAULT_TYPES: TypeOption[] = [
  { key: 'classic', label: 'Classic' },
  { key: 'image', label: 'Image' },
  { key: 'intruder', label: 'Intruder' },
  { key: 'tf', label: 'True / False' },
  { key: 'clue', label: 'Clues' },
];

interface TypeFilterPillsProps {
  /** `null` means "all types". */
  selected: QuizTypeKey | null;
  onChange: (type: QuizTypeKey | null) => void;
  types?: TypeOption[];
}

export function TypeFilterPills({
  selected,
  onChange,
  types = DEFAULT_TYPES,
}: TypeFilterPillsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`px-3 py-[7px] rounded-[10px] text-[11px] font-medium border-[1.5px] transition-colors ${
          selected === null
            ? 'bg-primary border-accent text-accent'
            : 'bg-surface border-default text-secondary hover:border-secondary'
        }`}
      >
        All types
      </button>
      {types.map((t) => {
        const active = selected === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(active ? null : t.key)}
            className={`inline-flex items-center gap-[5px] px-3 py-[7px] rounded-[10px] text-[11px] font-medium border-[1.5px] transition-colors ${
              active
                ? 'bg-primary border-accent text-accent'
                : 'bg-surface border-default text-secondary hover:border-secondary'
            }`}
          >
            <QuizTypeIcon type={t.key} size={12} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Sort tabs
// ============================================

export type SortKey = 'all' | 'trending' | 'newest' | 'most_played' | 'top_rated';

export interface SortOption {
  key: SortKey;
  label: string;
}

const DEFAULT_SORTS: SortOption[] = [
  { key: 'all', label: 'All' },
  { key: 'trending', label: 'Trending' },
  { key: 'newest', label: 'Newest' },
  { key: 'most_played', label: 'Most played' },
  { key: 'top_rated', label: 'Top rated' },
];

interface SortTabsProps {
  selected: SortKey;
  onChange: (key: SortKey) => void;
  tabs?: SortOption[];
}

export function SortTabs({ selected, onChange, tabs = DEFAULT_SORTS }: SortTabsProps) {
  return (
    <div className="flex gap-1" role="tablist">
      {tabs.map((t) => {
        const active = selected === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={`px-3 py-[5px] rounded-md text-[10px] font-medium transition-colors ${
              active
                ? 'text-accent bg-accent-bg'
                : 'text-tertiary bg-elevated hover:text-secondary'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
