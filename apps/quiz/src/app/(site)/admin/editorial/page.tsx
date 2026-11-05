import { notFound } from 'next/navigation';

import { requireAdmin } from '@/lib/admin/guard';
import { editorialQuizOn } from '@/lib/editorial/quiz/flag';
import { readQuizPanel } from '@/lib/editorial/quiz/panel';
import { quizLaneLive, supabaseQuizStore } from '@/lib/editorial/quiz/store';
import { editorialLive, supabaseStore } from '@/lib/editorial/store';
import { safeFetch } from '@/lib/error-handling';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { getP8Groups } from '@/lib/ux-v1/p8/feed';
import { isUxV12 } from '@/lib/ux-v12';

import { EditorialAdminRoot } from './editorial-admin';

import type { QuizPanel } from '@/lib/editorial/quiz/panel';
import type { EditorialAccount, EditorialDraft } from '@/lib/editorial/types';
import type { Metadata } from 'next';

// /admin/editorial (V12 G9, SYSTEM.md 5.6): the review queue of the editorial
// accounts. Queue, preview rendered exactly like the post, edit, approve with a
// date, reject. Nothing is published without an admin's approval; the cron
// /api/cron/editorial-publish publishes what is approved and due.
// Gates: v12 flag off = 404; not an admin = 404 (ADMIN-1: requireAdmin, as every /admin page).
// Never indexed (the admin layout already says so; said again here).
// Quiz lane (run O1, lot E1b): with EDITORIAL_QUIZ on and SQL 012 applied the page also shows the quiz panel (paste drafts, review
// batches, approve, spread over N days). With the flag off it reads and renders exactly what it did before.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editorial | Admin | KpopQuiz',
  robots: { index: false, follow: false },
};

export default async function EditorialAdminPage(): Promise<React.ReactElement> {
  if (!isUxV12()) notFound();
  await requireAdmin();

  let live = false;
  let failed = false;
  let drafts: EditorialDraft[] = [];
  let accounts: EditorialAccount[] = [];
  let quiz: QuizPanel | null = null;
  try {
    live = await editorialLive();
    if (live) {
      const store = supabaseStore();
      [drafts, accounts] = await Promise.all([store.listDrafts(200), store.accounts()]);
      if (editorialQuizOn()) {
        // A failure of the quiz panel hides the panel only: the queue above still works.
        try {
          if (await quizLaneLive()) quiz = await readQuizPanel(supabaseQuizStore(), Date.now());
        } catch (err) {
          console.error('[admin/editorial] quiz panel read failed:', err instanceof Error ? err.message : err);
        }
      }
    }
  } catch (err) {
    console.error('[admin/editorial] read failed:', err instanceof Error ? err.message : err);
    failed = true;
  }
  const groups = (await safeFetch(getP8Groups(), [], '[admin/editorial] groups')).map((g) => ({ ...g, photo: groupPhotoUrl(g.slug) }));

  return <EditorialAdminRoot live={live} failed={failed} drafts={drafts} accounts={accounts} groups={groups} now={Date.now()} quiz={quiz} />;
}
