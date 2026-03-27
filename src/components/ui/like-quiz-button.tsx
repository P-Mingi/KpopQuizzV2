'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface LikeQuizButtonProps {
  quizId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeQuizButton({ quizId, initialLiked, initialCount }: LikeQuizButtonProps): React.ReactElement {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount || 0);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  const handleClick = useCallback(async () => {
    if (pending) return;

    const newLiked = !liked;
    setLiked(newLiked);
    setCount((c) => Math.max(c + (newLiked ? 1 : -1), 0));
    setPending(true);

    try {
      const res = await fetch(`/api/quiz/${quizId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newLiked ? 'like' : 'unlike' }),
      });

      if (res.status === 401) {
        setLiked(!newLiked);
        setCount((c) => c + (newLiked ? -1 : 1));
        router.push(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
        return;
      }

      if (!res.ok) {
        setLiked(!newLiked);
        setCount((c) => c + (newLiked ? -1 : 1));
        return;
      }

      const data: { liked: boolean; like_count: number } = await res.json();
      setLiked(data.liked);
      setCount(data.like_count);
    } catch {
      setLiked(!newLiked);
      setCount((c) => c + (newLiked ? -1 : 1));
    } finally {
      setPending(false);
    }
  }, [quizId, liked, pending, router]);

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center gap-2 w-full py-3 rounded-full border text-sm font-medium transition-colors cursor-pointer ${
        liked
          ? 'bg-[#FCEBEB] border-[#F7C1C1] text-[#791F1F]'
          : 'bg-surface-primary border-border-light text-txt-secondary hover:border-border-medium'
      }`}
      aria-label={liked ? 'Unlike this quiz' : 'Like this quiz'}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 14 14"
        fill={liked ? '#E24B4A' : 'none'}
        stroke={liked ? '#E24B4A' : 'currentColor'}
        strokeWidth="1.3"
      >
        <path d="M7 12.1s-5.25-3.2-5.25-6.3a2.625 2.625 0 0 1 5.25-.9 2.625 2.625 0 0 1 5.25.9c0 3.1-5.25 6.3-5.25 6.3Z" />
      </svg>
      {liked ? `Liked (${count})` : `Like this quiz (${count})`}
    </button>
  );
}
