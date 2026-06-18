'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createBrowserClient } from '@/lib/supabase/client';
import { isAdmin } from '@/lib/admin';

interface Props {
  quizId: string;
  creatorId: string | null;
}

type ViewerRole = 'none' | 'owner' | 'admin';

/**
 * Owner + admin affordances on the quiz page.
 *
 * - Mounted on every quiz page; detects viewer client-side via the browser
 *   Supabase auth (so the page shell stays static/ISR-cacheable).
 * - Renders nothing when the viewer has no role.
 * - Owner: Edit + Delete.
 * - Admin (and not owner): Remove (admin route, also soft-deletes).
 */
export function QuizOwnerActions({ quizId, creatorId }: Props): React.ReactElement | null {
  const router = useRouter();
  const [role, setRole] = useState<ViewerRole>('none');
  const [busy, setBusy] = useState<'edit' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        if (creatorId && user.id === creatorId) {
          setRole('owner');
        } else if (isAdmin(user.id)) {
          setRole('admin');
        }
      } catch {
        /* anonymous - render nothing */
      }
    })();
    return () => { cancelled = true; };
  }, [creatorId]);

  async function handleDelete(asAdmin: boolean): Promise<void> {
    const confirmMsg = asAdmin
      ? 'Remove this quiz from the site? It will stop appearing in browse/sitemap and the slug page will 404.'
      : 'Delete this quiz? It will be removed from the site and your profile. This action is irreversible from the UI.';
    if (!window.confirm(confirmMsg)) return;
    setBusy('delete');
    setError(null);
    try {
      const url = asAdmin ? `/api/admin/quiz/${quizId}/remove` : `/api/quiz/${quizId}`;
      const method = asAdmin ? 'POST' : 'DELETE';
      const res = await fetch(url, { method });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Failed (${res.status})`);
        setBusy(null);
        return;
      }
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message ?? 'Network error');
      setBusy(null);
    }
  }

  if (role === 'none') return null;

  return (
    <section className="quiz-owner-actions" aria-label="Quiz owner actions">
      <div className="quiz-owner-actions-row">
        {role === 'owner' && (
          <>
            <a
              href={`/admin/quiz/${quizId}/edit`}
              className="quiz-owner-btn"
              aria-busy={busy === 'edit' ? 'true' : 'false'}
              onClick={() => setBusy('edit')}
            >
              Edit quiz
            </a>
            <button
              type="button"
              className="quiz-owner-btn danger"
              onClick={() => void handleDelete(false)}
              disabled={busy !== null}
            >
              {busy === 'delete' ? 'Deleting…' : 'Delete quiz'}
            </button>
          </>
        )}
        {role === 'admin' && (
          <button
            type="button"
            className="quiz-owner-btn danger"
            onClick={() => void handleDelete(true)}
            disabled={busy !== null}
          >
            {busy === 'delete' ? 'Removing…' : 'Remove quiz (admin)'}
          </button>
        )}
      </div>
      {error && <p className="quiz-owner-actions-error">{error}</p>}
    </section>
  );
}
