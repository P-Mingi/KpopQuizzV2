'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';

import { QuizListCard } from '@/components/quiz/quiz-list-card';
import { CreateCTA } from '@/components/home/create-cta';
import {
  SortTabs,
  TypeFilterPills,
  type SortKey,
  type GroupOption,
} from '@/components/quiz/quiz-filters';
import type { QuizTypeKey } from '@/components/ui/quiz-type-badge';
import { Spinner } from '@/components/ui/spinner';

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

/** Maps sort-tab keys to API tab values. */
function sortKeyToApiTab(key: SortKey): string {
  switch (key) {
    case 'all': return 'all';
    case 'newest': return 'new';
    case 'most_played': return 'most_liked';
    case 'top_rated': return 'top_rated';
    case 'trending':
    default: return 'trending';
  }
}

/** Maps QuizTypeKey to DB quiz_type. */
function typeKeyToDbType(key: QuizTypeKey): string {
  switch (key) {
    case 'classic': return 'multiple_choice';
    case 'image': return 'image';
    case 'intruder': return 'intruder';
    case 'tf': return 'true_false';
    case 'clue': return 'guess_from_clues';
  }
}

/** Build a cache key for a particular filter combination. */
function cacheKey(tab: string, groupId: number | null, typeKey: QuizTypeKey | null): string {
  return `${tab}:${groupId ?? ''}:${typeKey ?? ''}`;
}

export function QuizFeed({ initialQuizzes, groups: _groups, hideBrowseAllLink = false, showSearch = false }: Props): React.ReactElement {
  void _groups;
  const [sortKey, setSortKey] = useState<SortKey>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<QuizTypeKey | null>(null);

  // Cache: key -> quizzes
  const initialCK = cacheKey('all', null, null);
  const [cache, setCache] = useState<Record<string, QuizCardData[]>>({
    [initialCK]: initialQuizzes,
  });
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({
    [initialCK]: initialQuizzes.length >= PAGE_SIZE,
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

  /** Build URL params for current filters. */
  const buildUrl = useCallback((offset: number) => {
    const apiTab = sortKeyToApiTab(sortKey);
    const params = new URLSearchParams({
      tab: apiTab,
      offset: String(offset),
      limit: String(PAGE_SIZE),
    });
    if (selectedGroupId !== null) params.set('group_id', String(selectedGroupId));
    if (selectedType !== null) params.set('quiz_type', typeKeyToDbType(selectedType));
    return `/api/quizzes?${params.toString()}`;
  }, [sortKey, selectedGroupId, selectedType]);

  const currentCK = cacheKey(sortKeyToApiTab(sortKey), selectedGroupId, selectedType);

  // Fetch when filters change and we don't have cached data.
  useEffect(() => {
    if (cache[currentCK] !== undefined) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(buildUrl(0));
        if (!res.ok) throw new Error('Failed to load quizzes');
        const data: { quizzes: QuizCardData[] } = await res.json();
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [currentCK]: data.quizzes }));
        setHasMore((prev) => ({ ...prev, [currentCK]: data.quizzes.length >= PAGE_SIZE }));
      } catch (err) {
        console.error('Failed to load quizzes:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentCK, buildUrl, cache]);

  const loadMore = useCallback(async () => {
    const current = cache[currentCK] ?? [];
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(current.length));
      if (!res.ok) throw new Error('Failed to load more');
      const data: { quizzes: QuizCardData[] } = await res.json();
      const existingIds = new Set(current.map((q) => q.id));
      const newQuizzes = data.quizzes.filter((q) => !existingIds.has(q.id));
      setCache((prev) => ({ ...prev, [currentCK]: [...current, ...newQuizzes] }));
      setHasMore((prev) => ({ ...prev, [currentCK]: data.quizzes.length >= PAGE_SIZE }));
    } catch (err) {
      console.error('Failed to load more quizzes:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [currentCK, buildUrl, cache]);

  const isSearchActive = showSearch && searchQuery.trim().length >= 2;
  const quizzes = isSearchActive ? (searchResults ?? []) : (cache[currentCK] ?? []);
  const canLoadMore = !isSearchActive && (hasMore[currentCK] ?? false);

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

      {/* Search + filters - hidden when inline search is active */}
      {!isSearchActive && (
        <>
          {/* Search bar - only when showSearch is not already providing one */}
          {!showSearch && (
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

          {/* Type filter - only on browse page */}
          {showSearch && (
            <TypeFilterPills selected={selectedType} onChange={setSelectedType} />
          )}

          {/* Sort tabs + browse all */}
          <div className="flex items-center justify-between">
            <SortTabs selected={sortKey} onChange={setSortKey} />
            {!hideBrowseAllLink && (
              <Link
                href="/quizzes"
                className="text-xs font-medium text-secondary hover:text-accent transition-colors"
              >
                Browse all &rarr;
              </Link>
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
      {(loading || searchLoading) && quizzes.length === 0 ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : quizzes.length === 0 ? (
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
            {quizzes.slice(0, 8).map((quiz) => (
              <QuizListCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
          {quizzes.length > 8 && (
            <>
              {!isSearchActive && <CreateCTA />}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {quizzes.slice(8).map((quiz) => (
                  <QuizListCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Load more button */}
      {canLoadMore && quizzes.length > 0 && (
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

      {quizzes.length > 0 && !hideBrowseAllLink && (
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
