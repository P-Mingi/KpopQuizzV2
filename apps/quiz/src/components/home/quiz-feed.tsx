'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';

import { QuizListCard } from '@/components/quiz/quiz-list-card';
import { CreateCTA } from '@/components/home/create-cta';
import {
  GroupFilterPills,
  TypeFilterPills,
  SortTabs,
  type SortKey,
  type GroupOption,
} from '@/components/quiz/quiz-filters';
import { Spinner } from '@/components/ui/spinner';
import { mapDbTypeToKey, type QuizTypeKey } from '@/components/ui/quiz-type-badge';

import type { QuizCardData } from '@/lib/db/types';

interface Props {
  initialQuizzes: QuizCardData[];
  groups: GroupOption[];
  /** Hide the "Browse all quizzes" footer link (already on /quizzes). */
  hideBrowseAllLink?: boolean;
  /** Show inline search bar at the top of the feed. */
  showSearch?: boolean;
}

const PAGE_SIZE = 48;

/**
 * Maps our sort-tab keys to the existing /api/quizzes `tab` values.
 * Top rated is computed client-side by sorting the trending feed by avg %.
 */
function sortKeyToApiTab(key: SortKey): string {
  switch (key) {
    case 'all':
      return 'all';
    case 'newest':
      return 'new';
    case 'most_played':
      return 'most_liked';
    case 'top_rated':
      return 'trending';
    case 'trending':
    default:
      return 'trending';
  }
}

function computeAvgPct(quiz: QuizCardData): number {
  if (quiz.total_completions > 0 && quiz.question_count > 0) {
    return (quiz.total_score_sum / quiz.total_completions / quiz.question_count) * 100;
  }
  return 0;
}

/**
 * Home-page quiz feed. Owns the group filter / type filter / sort tab state,
 * fetches the sort tab's full set from the API, and filters group + type
 * client-side.
 */
export function QuizFeed({ initialQuizzes, groups, hideBrowseAllLink = false, showSearch = false }: Props): React.ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<QuizTypeKey | null>(null);
  const [quizzesBySort, setQuizzesBySort] = useState<Record<string, QuizCardData[]>>({
    all: initialQuizzes,
  });
  const [hasMoreBySort, setHasMoreBySort] = useState<Record<string, boolean>>({
    all: initialQuizzes.length >= PAGE_SIZE,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<QuizCardData[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/quizzes/search?q=${encodeURIComponent(value.trim())}`);
        if (!res.ok) throw new Error('Search failed');
        const data: { quizzes: QuizCardData[] } = await res.json();
        setSearchResults(data.quizzes);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);
  }, []);

  const fetchSortTab = useCallback(async (key: SortKey) => {
    // top_rated reuses the trending dataset (sorted client-side later).
    const apiTab = sortKeyToApiTab(key);
    if (quizzesBySort[apiTab]) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quizzes?tab=${apiTab}&offset=0&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to load quizzes');
      const data: { quizzes: QuizCardData[] } = await res.json();
      setQuizzesBySort((prev) => ({ ...prev, [apiTab]: data.quizzes }));
      setHasMoreBySort((prev) => ({ ...prev, [apiTab]: data.quizzes.length >= PAGE_SIZE }));
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  }, [quizzesBySort]);

  const loadMore = useCallback(async () => {
    const apiTab = sortKeyToApiTab(sortKey);
    const current = quizzesBySort[apiTab] ?? [];
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/quizzes?tab=${apiTab}&offset=${current.length}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to load more');
      const data: { quizzes: QuizCardData[] } = await res.json();
      // Deduplicate by id
      const existingIds = new Set(current.map((q) => q.id));
      const newQuizzes = data.quizzes.filter((q) => !existingIds.has(q.id));
      setQuizzesBySort((prev) => ({ ...prev, [apiTab]: [...current, ...newQuizzes] }));
      setHasMoreBySort((prev) => ({ ...prev, [apiTab]: data.quizzes.length >= PAGE_SIZE }));
    } catch (err) {
      console.error('Failed to load more quizzes:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [sortKey, quizzesBySort]);

  useEffect(() => {
    void fetchSortTab(sortKey);
  }, [sortKey, fetchSortTab]);

  const isSearchActive = showSearch && searchQuery.trim().length >= 2;
  const apiTab = sortKeyToApiTab(sortKey);
  const hasMore = !isSearchActive && (hasMoreBySort[apiTab] ?? false);
  const baseQuizzes = isSearchActive ? (searchResults ?? []) : (quizzesBySort[apiTab] ?? []);

  // Apply client-side filters + top-rated reorder.
  const visibleQuizzes = useMemo(() => {
    let list = [...baseQuizzes];
    if (!isSearchActive) {
      if (selectedGroupId !== null) {
        list = list.filter((q) => {
          const match = groups.find((g) => g.id === selectedGroupId);
          return match ? q.group_slug === match.slug : true;
        });
      }
      if (selectedType !== null) {
        list = list.filter((q) => mapDbTypeToKey(q.quiz_type) === selectedType);
      }
      if (sortKey === 'top_rated') {
        list.sort((a, b) => computeAvgPct(b) - computeAvgPct(a));
      }
    }
    return list;
  }, [baseQuizzes, selectedGroupId, selectedType, groups, sortKey, isSearchActive]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      {showSearch && (
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
          >
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by quiz title, group, or keyword..."
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-default bg-primary text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchResults(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
          {searchLoading && (
            <div className="absolute right-10 top-1/2 -translate-y-1/2">
              <Spinner />
            </div>
          )}
        </div>
      )}

      {/* Filters - hidden when search is active */}
      {!isSearchActive && (
        <>
          {/* Group filter */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ghost mb-2">
              Pick your bias group
            </p>
            <GroupFilterPills
              groups={groups}
              selectedId={selectedGroupId}
              onChange={setSelectedGroupId}
            />
          </div>

          {/* Type filter */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ghost mb-2">
              Quiz type
            </p>
            <TypeFilterPills selected={selectedType} onChange={setSelectedType} />
          </div>

          {/* Sort tabs */}
          <div className="flex items-center justify-between">
            <SortTabs selected={sortKey} onChange={setSortKey} />
            {(selectedGroupId !== null || selectedType !== null) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupId(null);
                  setSelectedType(null);
                }}
                className="text-[10px] font-medium text-tertiary hover:text-accent transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </>
      )}

      {/* Search result count */}
      {isSearchActive && !searchLoading && searchResults !== null && (
        <p className="text-xs text-tertiary">
          {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for &quot;{searchQuery.trim()}&quot;
        </p>
      )}

      {/* Quiz list */}
      {(loading || searchLoading) && baseQuizzes.length === 0 ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : visibleQuizzes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-tertiary">
            {isSearchActive ? `No quizzes found for "${searchQuery.trim()}"` : 'No quizzes match these filters.'}
          </p>
          {!isSearchActive && (selectedGroupId !== null || selectedType !== null) && (
            <button
              type="button"
              onClick={() => {
                setSelectedGroupId(null);
                setSelectedType(null);
              }}
              className="text-xs text-accent mt-2 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {visibleQuizzes.slice(0, 8).map((quiz) => (
              <QuizListCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
          {visibleQuizzes.length > 8 && (
            <>
              {!isSearchActive && <CreateCTA />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {visibleQuizzes.slice(8).map((quiz) => (
                  <QuizListCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Load more button */}
      {hasMore && !isSearchActive && visibleQuizzes.length > 0 && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-default text-sm font-medium text-secondary hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <Spinner />
                Loading...
              </>
            ) : (
              'Load more quizzes'
            )}
          </button>
        </div>
      )}

      {visibleQuizzes.length > 0 && !hideBrowseAllLink && (
        <div className="text-center pt-2">
          <Link
            href="/quizzes"
            className="inline-block px-5 py-2 rounded-[10px] border border-default text-xs font-medium text-secondary hover:border-accent hover:text-accent transition-colors"
          >
            Browse all quizzes
          </Link>
        </div>
      )}
    </div>
  );
}
