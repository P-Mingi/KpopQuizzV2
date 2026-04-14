'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
}

const HOMEPAGE_LIMIT = 24;

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
export function QuizFeed({ initialQuizzes, groups, hideBrowseAllLink = false }: Props): React.ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<QuizTypeKey | null>(null);
  const [quizzesBySort, setQuizzesBySort] = useState<Record<string, QuizCardData[]>>({
    all: initialQuizzes,
  });
  const [loading, setLoading] = useState(false);

  const fetchSortTab = useCallback(async (key: SortKey) => {
    // top_rated reuses the trending dataset (sorted client-side later).
    const apiTab = sortKeyToApiTab(key);
    if (quizzesBySort[apiTab]) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/quizzes?tab=${apiTab}&offset=0&limit=${HOMEPAGE_LIMIT}`);
      if (!res.ok) throw new Error('Failed to load quizzes');
      const data: { quizzes: QuizCardData[] } = await res.json();
      setQuizzesBySort((prev) => ({ ...prev, [apiTab]: data.quizzes }));
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  }, [quizzesBySort]);

  useEffect(() => {
    void fetchSortTab(sortKey);
  }, [sortKey, fetchSortTab]);

  const baseQuizzes = quizzesBySort[sortKeyToApiTab(sortKey)] ?? [];

  // Apply client-side filters + top-rated reorder.
  const visibleQuizzes = useMemo(() => {
    let list = [...baseQuizzes];
    if (selectedGroupId !== null) {
      list = list.filter((q) => {
        // QuizCardData doesn't carry group_id directly; match by group slug via the groups array.
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
    return list;
  }, [baseQuizzes, selectedGroupId, selectedType, groups, sortKey]);

  return (
    <div className="flex flex-col gap-4">
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

      {/* Quiz list */}
      {loading && baseQuizzes.length === 0 ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : visibleQuizzes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-tertiary">No quizzes match these filters.</p>
          {(selectedGroupId !== null || selectedType !== null) && (
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
              <CreateCTA />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {visibleQuizzes.slice(8).map((quiz) => (
                  <QuizListCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            </>
          )}
        </>
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
