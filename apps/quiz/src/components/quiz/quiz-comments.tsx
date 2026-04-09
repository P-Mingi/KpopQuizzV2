'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { formatRelativeDate } from '@/lib/utils';
import { playComment } from '@/lib/sounds';

interface Comment {
  id: string;
  quiz_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

interface Props {
  quizId: string;
}

const MAX_LENGTH = 200;
const PREVIEW_COUNT = 3;

/**
 * Comment list + input shown on the result screen. Loads up to 20 newest
 * comments; shows the first 3 with a "Show all" expansion. Posting requires
 * auth - a 401 flips the input into a sign-in hint.
 */
export function QuizComments({ quizId }: Props): React.ReactElement {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newlyPostedIds, setNewlyPostedIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [posting, setPosting] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/quiz/${quizId}/comment?limit=20`);
        if (!res.ok) return;
        const data: { comments: Comment[] } = await res.json();
        if (cancelled) return;
        setComments(data.comments ?? []);
      } catch {
        // Non-critical; keep empty list
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quizId]);

  async function handlePost(): Promise<void> {
    const trimmed = input.trim();
    if (!trimmed || posting) return;
    setPosting(true);

    try {
      const res = await fetch(`/api/quiz/${quizId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }

      if (!res.ok) return;

      const data: { comment: Comment } = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      setNewlyPostedIds((prev) => {
        const next = new Set(prev);
        next.add(data.comment.id);
        return next;
      });
      setInput('');
      playComment();
    } catch {
      // Ignore - user can retry
    } finally {
      setPosting(false);
    }
  }

  const visible = showAll ? comments : comments.slice(0, PREVIEW_COUNT);
  const remaining = comments.length - visible.length;

  return (
    <div className="mt-5">
      <p className="text-[10px] uppercase tracking-wider text-ghost mb-2">
        Comments {comments.length > 0 && <span className="text-tertiary">({comments.length})</span>}
      </p>

      {/* List */}
      {loaded && comments.length === 0 && (
        <p className="text-[11px] text-ghost italic py-2">Be the first to comment.</p>
      )}

      {visible.length > 0 && (
        <ul className="flex flex-col">
          {visible.map((c) => (
            <li
              key={c.id}
              className={`flex gap-2 py-2 border-b border-subtle last:border-0 ${
                newlyPostedIds.has(c.id) ? 'animate-slide-in-up' : ''
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-accent-bg flex items-center justify-center text-[9px] font-bold text-accent-hover flex-shrink-0">
                {c.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-primary leading-snug">
                  <Link
                    href={`/u/${c.username}`}
                    className="font-semibold hover:text-accent transition-colors"
                  >
                    {c.username}
                  </Link>{' '}
                  <span className="text-secondary">{c.content}</span>
                </p>
                <p className="text-[9px] text-ghost mt-0.5">{formatRelativeDate(c.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-[11px] text-accent font-medium mt-2 hover:underline cursor-pointer"
        >
          Show all {comments.length} comments
        </button>
      )}

      {/* Input */}
      {!needsAuth ? (
        <div className="flex gap-2 mt-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handlePost();
              }
            }}
            placeholder="Add a comment..."
            maxLength={MAX_LENGTH}
            disabled={posting}
            className="flex-1 py-2 px-3 rounded-xl border border-default text-[12px] text-primary bg-surface outline-none focus:border-accent placeholder:text-ghost disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={posting || input.trim().length === 0}
            className="py-2 px-4 rounded-xl bg-accent text-white text-[12px] font-bold active:scale-[0.97] transition-transform disabled:opacity-40 disabled:active:scale-100 cursor-pointer disabled:cursor-default"
          >
            Post
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-ghost mt-3 text-center">
          <Link href="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>{' '}
          to leave a comment.
        </p>
      )}
    </div>
  );
}
