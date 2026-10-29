'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { SITE } from '@/lib/site/registry';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { quizLine } from '@/lib/ux-v1/p10/passport-model';

import { quizRowAverage, Thumb } from './rows';

import type { QuizCardData } from '@/lib/db/types';

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

// A row of "Your quizzes" on the owner's passport (/me), with Edit and Delete (owner,
// 2026-10-14: an owner could only reach these from the bottom of each quiz page, and the
// passport list, where a creator looks for them, had none). Edit opens the owner editor
// (/quiz/<id>/edit, creator or admin only). Delete is the owner soft delete
// DELETE /api/quiz/<id> (status 'removed', same as the quiz page's button): the row goes
// at once and the page refreshes its count. The rest of the row still opens the quiz.

export function OwnQuizRow({ q }: { q: QuizCardData }): React.ReactElement | null {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'deleting' | 'deleted'>('idle');
  const [error, setError] = useState<string | null>(null);

  const remove = async (): Promise<void> => {
    if (!window.confirm(`Delete "${q.title}"? It leaves the site and your passport. You cannot undo this.`)) return;
    setState('deleting');
    setError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/quiz/${q.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        setError(res.status === 401
          ? 'Your session ended. Sign in again to delete this quiz.'
          : res.status === 403
            ? 'Only the creator of this quiz can delete it.'
            : 'We could not delete this quiz. Try again.');
        setState('idle');
        return;
      }
      setState('deleted');
      router.refresh();
    } catch {
      setError('We could not delete this quiz. Check your connection and try again.');
      setState('idle');
    }
  };

  if (state === 'deleted') return null;

  return (
    <div className="ux-row p10-own" data-testid="own-quiz-row">
      <Link href={`/q/${q.slug}`} className="p10-own-link">
        <Thumb src={q.cover_image_url || groupPhotoUrl(q.group_slug)} />
        <span className="ux-row-grow">
          <span className="ux-rt">{q.title}</span>
          <span className="ux-rs">{[quizLine(q), quizRowAverage(q)].filter(Boolean).join(' · ')}</span>
          {error ? <span className="ux-err" role="alert">{error}</span> : null}
        </span>
      </Link>
      <span className="p10-own-act">
        {/* Run C1: the owner editor (/quiz/{id}/edit) is a kpop page; the route maps of anime and hub have no such page. */}
        {SITE.id === 'kpop' ? <Link href={`/quiz/${q.id}/edit`} className="ux-btn ux-btn-ghost ux-btn-sm" prefetch={false} aria-label={`Edit ${q.title}`}>Edit</Link> : null}
        <button
          type="button"
          className="ux-btn ux-btn-ghost ux-btn-sm p10-own-del"
          onClick={() => { void remove(); }}
          disabled={state === 'deleting'}
          aria-busy={state === 'deleting' || undefined}
          aria-label={`Delete ${q.title}`}
        >
          {state === 'deleting' ? 'Deleting' : 'Delete'}
        </button>
      </span>
    </div>
  );
}

/** The owner's list: one managed row per quiz (the public passport keeps QuizRows). */
export function OwnQuizRows({ quizzes }: { quizzes: QuizCardData[] }): React.ReactElement {
  return <>{quizzes.map((q) => <OwnQuizRow key={q.id} q={q} />)}</>;
}
