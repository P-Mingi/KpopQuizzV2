'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { QuizCard } from '@/components/quiz/quiz-card';
import { Spinner } from '@/components/ui/spinner';

import type { QuizCardData } from '@/lib/db/types';

interface InfiniteQuizListProps {
  initialQuizzes: QuizCardData[];
  fetchUrl: string;
  isOwner?: boolean;
}

export function InfiniteQuizList({ initialQuizzes, fetchUrl, isOwner }: InfiniteQuizListProps): React.ReactElement {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [offset, setOffset] = useState(initialQuizzes.length);
  const [hasMore, setHasMore] = useState(initialQuizzes.length >= 10);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const sep = fetchUrl.includes('?') ? '&' : '?';
      const res = await fetch(`${fetchUrl}${sep}offset=${offset}`);
      if (!res.ok) throw new Error('Failed to load');
      const data: { quizzes: QuizCardData[] } = await res.json();
      setQuizzes((prev) => [...prev, ...data.quizzes]);
      setOffset((prev) => prev + data.quizzes.length);
      setHasMore(data.quizzes.length >= 10);
    } catch (err) {
      console.error('Failed to load more quizzes:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, offset, loading, hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (quizzes.length === 0 && !loading) return <></>;

  return (
    <>
      <div className="space-y-3">
        {quizzes.map((q) => (
          <QuizCard key={q.id} quiz={q} isOwner={isOwner ?? false} />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
