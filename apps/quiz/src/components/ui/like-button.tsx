'use client';

import { useState, useCallback, useEffect } from 'react';

const ANON_LIKES_KEY = 'anon_liked_quizzes';

function getAnonLikes(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ANON_LIKES_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function setAnonLiked(quizId: string, liked: boolean): void {
  const likes = getAnonLikes();
  if (liked && !likes.includes(quizId)) {
    likes.push(quizId);
  } else if (!liked) {
    const idx = likes.indexOf(quizId);
    if (idx !== -1) likes.splice(idx, 1);
  }
  localStorage.setItem(ANON_LIKES_KEY, JSON.stringify(likes));
}

interface LikeButtonProps {
  quizId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({ quizId, initialLiked, initialCount }: LikeButtonProps): React.ReactElement {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount || 0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!initialLiked && getAnonLikes().includes(quizId)) {
      setLiked(true);
    }
  }, [quizId, initialLiked]);

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (pending) return;

    const newLiked = !liked;
    setLiked(newLiked);
    setCount((c) => c + (newLiked ? 1 : -1));
    setPending(true);

    try {
      const res = await fetch(`/api/quiz/${quizId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: newLiked ? 'like' : 'unlike' }),
      });

      if (!res.ok) {
        setLiked(!newLiked);
        setCount((c) => c + (newLiked ? -1 : 1));
        return;
      }

      const data: { liked: boolean; like_count: number } = await res.json();
      setLiked(data.liked);
      setCount(data.like_count);
      setAnonLiked(quizId, data.liked);
    } catch {
      setLiked(!newLiked);
      setCount((c) => c + (newLiked ? -1 : 1));
    } finally {
      setPending(false);
    }
  }, [quizId, liked, pending]);

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1 cursor-pointer transition-transform duration-100 hover:scale-110"
      aria-label={liked ? 'Unlike' : 'Like'}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill={liked ? '#E24B4A' : 'none'}
        stroke={liked ? '#E24B4A' : 'currentColor'}
        strokeWidth="1.3"
        className={liked ? '' : 'text-txt-secondary'}
      >
        <path d="M7 12.1s-5.25-3.2-5.25-6.3a2.625 2.625 0 0 1 5.25-.9 2.625 2.625 0 0 1 5.25.9c0 3.1-5.25 6.3-5.25 6.3Z" />
      </svg>
      <span className={`text-xs ${liked ? 'text-[#E24B4A]' : 'text-txt-secondary'}`}>
        {count}
      </span>
    </button>
  );
}
