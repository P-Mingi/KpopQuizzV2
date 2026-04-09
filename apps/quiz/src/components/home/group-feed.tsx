'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { TabBar } from '@/components/ui/tab-bar';
import { QuizCard } from '@/components/quiz/quiz-card';
import { Spinner } from '@/components/ui/spinner';

import type { QuizCardData } from '@/lib/db/types';

interface GroupFeedProps {
  groupId: number;
  initialQuizzes: QuizCardData[];
}

const TABS = ['Popular', 'Newest', 'Most liked', 'Hardest'] as const;

function tabToKey(tab: string): 'popular' | 'newest' | 'most_liked' | 'hardest' {
  if (tab === 'Newest') return 'newest';
  if (tab === 'Most liked') return 'most_liked';
  if (tab === 'Hardest') return 'hardest';
  return 'popular';
}

export function GroupFeed({ groupId, initialQuizzes }: GroupFeedProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState('Popular');
  const [quizzesByTab, setQuizzesByTab] = useState<Record<string, QuizCardData[]>>({
    popular: initialQuizzes,
  });
  const [offsetByTab, setOffsetByTab] = useState<Record<string, number>>({
    popular: initialQuizzes.length,
  });
  const [hasMoreByTab, setHasMoreByTab] = useState<Record<string, boolean>>({
    popular: initialQuizzes.length >= 10,
  });
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const tabKey = tabToKey(activeTab);
  const quizzes = quizzesByTab[tabKey] ?? [];
  const hasMore = hasMoreByTab[tabKey] ?? true;
  const offset = offsetByTab[tabKey] ?? 0;

  const fetchQuizzes = useCallback(async (tab: string, currentOffset: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/quizzes/group?groupId=${groupId}&tab=${tab}&offset=${currentOffset}`);
      if (!res.ok) throw new Error('Failed to load quizzes');
      const data: { quizzes: QuizCardData[] } = await res.json();

      setQuizzesByTab((prev) => ({
        ...prev,
        [tab]: append ? [...(prev[tab] ?? []), ...data.quizzes] : data.quizzes,
      }));
      setOffsetByTab((prev) => ({ ...prev, [tab]: currentOffset + data.quizzes.length }));
      setHasMoreByTab((prev) => ({ ...prev, [tab]: data.quizzes.length >= 10 }));
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const key = tabToKey(tab);
    if (quizzesByTab[key] === undefined) {
      fetchQuizzes(key, 0, false);
    }
  }, [quizzesByTab, fetchQuizzes]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loading && hasMore) {
          fetchQuizzes(tabKey, offset, true);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, tabKey, offset, fetchQuizzes]);

  return (
    <div>
      <div className="mt-4 mb-4">
        <TabBar tabs={[...TABS]} activeTab={activeTab} onTabChange={handleTabChange} />
      </div>

      <div className="space-y-3">
        {quizzes.map((q) => (
          <QuizCard key={q.id} quiz={q} />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-4"><Spinner /></div>
      )}

      {!loading && quizzes.length === 0 && (
        <p className="text-sm text-secondary text-center py-8">No quizzes in this tab yet.</p>
      )}

      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </div>
  );
}
