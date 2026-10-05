import { notFound, redirect } from 'next/navigation';

import { isAdmin } from '@/lib/admin';
import { editorialLive, supabaseStore } from '@/lib/editorial/store';
import { safeFetch } from '@/lib/error-handling';
import { createServerClient } from '@/lib/supabase/server';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { getP8Groups } from '@/lib/ux-v1/p8/feed';
import { isUxV12 } from '@/lib/ux-v12';

import { EditorialAdminRoot } from './editorial-admin';

import type { EditorialAccount, EditorialDraft } from '@/lib/editorial/types';
import type { Metadata } from 'next';

// /admin/editorial (V12 G9, SYSTEM.md 5.6): the review queue of the editorial
// accounts. Queue, preview rendered exactly like the post, edit, approve with a
// date, reject. Nothing is published without an admin's approval; the cron
// /api/cron/editorial-publish publishes what is approved and due.
// Gates: v12 flag off = 404; not an admin = redirect to / (as every /admin page).
// Never indexed (the admin layout already says so; said again here).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editorial | Admin | KpopQuiz',
  robots: { index: false, follow: false },
};

export default async function EditorialAdminPage(): Promise<React.ReactElement> {
  if (!isUxV12()) notFound();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  let live = false;
  let failed = false;
  let drafts: EditorialDraft[] = [];
  let accounts: EditorialAccount[] = [];
  try {
    live = await editorialLive();
    if (live) {
      const store = supabaseStore();
      [drafts, accounts] = await Promise.all([store.listDrafts(200), store.accounts()]);
    }
  } catch (err) {
    console.error('[admin/editorial] read failed:', err instanceof Error ? err.message : err);
    failed = true;
  }
  const groups = (await safeFetch(getP8Groups(), [], '[admin/editorial] groups')).map((g) => ({ ...g, photo: groupPhotoUrl(g.slug) }));

  return <EditorialAdminRoot live={live} failed={failed} drafts={drafts} accounts={accounts} groups={groups} now={Date.now()} />;
}
