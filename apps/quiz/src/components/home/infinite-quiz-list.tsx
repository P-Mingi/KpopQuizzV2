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
  // The `loading` state alone cannot gate this: the IntersectionObserver can fire
  // again before React has committed setLoading(true), so two fetches would go out
  // for the SAME offset and append the same page twice. A ref flips synchronously.
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const sep = fetchUrl.includes('?') ? '&' : '?';
      const res = await fetch(`${fetchUrl}${sep}offset=${offset}`);
      if (!res.ok) throw new Error('Failed to load');
      const data: { quizzes: QuizCardData[] } = await res.json();
      // Dedupe by id. Even with the guard above, a page can overlap what we
      // already hold when rows shift between requests (ties in the sort order as
      // play counts change). Appending blind produced duplicate React keys.
      setQuizzes((prev) => {
        const seen = new Set(prev.map((q) => q.id));
        const fresh = data.quizzes.filter((q) => !seen.has(q.id));
        return fresh.length > 0 ? [...prev, ...fresh] : prev;
      });
      // Offset tracks rows CONSUMED from the server, not rows kept, so paging
      // stays aligned even when a page was entirely duplicate.
      setOffset((prev) => prev + data.quizzes.length);
      setHasMore(data.quizzes.length >= 10);
    } catch (err) {
      console.error('Failed to load more quizzes:', err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchUrl, offset, hasMore]);

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
