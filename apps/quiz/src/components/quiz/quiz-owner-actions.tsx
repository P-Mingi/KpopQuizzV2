'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { SITE } from '@/lib/site/registry';

import type { MeResponse } from '@/lib/auth/use-me';

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

interface Props {
  quizId: string;
  creatorId: string | null;
}

type ViewerRole = 'none' | 'owner' | 'admin';

/** The viewer's role on a quiz, from the shared /api/auth/me result (null while loading or signed out). */
export function viewerRole(me: MeResponse | null, creatorId: string | null): ViewerRole {
  if (!me?.profile || !me.id) return 'none';
  if (creatorId && me.id === creatorId) return 'owner';
  return me.is_admin ? 'admin' : 'none';
}

/**
 * Owner + admin affordances on the quiz page.
 *
 * - Mounted on every quiz page; detects the viewer client-side through the shared
 *   /api/auth/me result (useUxMe, already loaded by the shell), so the page shell
 *   stays static/ISR-cacheable and the page ships no supabase-js for it.
 * - Renders nothing when the viewer has no role.
 * - Owner: Edit + Delete.
 * - Admin (and not owner): Remove (admin route, also soft-deletes).
 */
export function QuizOwnerActions({ quizId, creatorId }: Props): React.ReactElement | null {
  const router = useRouter();
  const me = useUxMe();
  const [busy, setBusy] = useState<'edit' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Null while loading, during hydration and for a visitor: render nothing. is_admin comes
  // from the server (the admin list is not readable in the browser).
  const role = viewerRole(me, creatorId);

  async function handleDelete(asAdmin: boolean): Promise<void> {
    const confirmMsg = asAdmin
      ? 'Remove this quiz from the site? It will stop appearing in browse/sitemap and the slug page will 404.'
      : 'Delete this quiz? It will be removed from the site and your profile. This action is irreversible from the UI.';
    if (!window.confirm(confirmMsg)) return;
    setBusy('delete');
    setError(null);
    try {
      const url = asAdmin ? `${BASE_PATH}/api/admin/quiz/${quizId}/remove` : `${BASE_PATH}/api/quiz/${quizId}`;
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
            {SITE.id === 'kpop' ? (
            <a
              href={`${BASE_PATH}/quiz/${quizId}/edit`}
              className="quiz-owner-btn"
              aria-busy={busy === 'edit' ? 'true' : 'false'}
              onClick={() => setBusy('edit')}
            >
              Edit quiz
            </a>
            ) : null}
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
