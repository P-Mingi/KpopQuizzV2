import { notFound, redirect } from 'next/navigation';

import { isAdmin } from '@/lib/admin';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isUxV12 } from '@/lib/ux-v12';

import { RestoreList } from './restore-list';

import type { HiddenRow } from './restore-list';
import type { Metadata } from 'next';

// /admin/community-reports (owner, 2026-10-06): what the 3rd report by 3 different accounts
// hid on /community (community_autohidden, migration v12-community-posts.sql). Nothing is
// deleted: Restore gives the content its status back and dismisses its reports.
// Gates: v12 flag off = 404; not an admin = redirect to / (as every /admin page).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Community reports | Admin | KpopQuiz',
  robots: { index: false, follow: false },
};

const HREF: Record<string, (id: number) => string | null> = {
  thread: (id) => `/community/thread/${id}`,
  essay: (id) => `/community/blog/${id}`,
  debate: (id) => `/community/debate/${id}`,
  challenge: (id) => `/community/challenge/${id}`,
  comment: () => null,
  reply: () => null,
  debate_vote: () => null,
};

async function previews(rows: { target_type: string; target_id: number; target_ref: string | null }[]): Promise<Map<string, string>> {
  const svc = createServiceRoleClient();
  const ids = (t: string): number[] => rows.filter((r) => r.target_type === t).map((r) => r.target_id);
  const out = new Map<string, string>();
  const put = (t: string, list: Array<Record<string, unknown>> | null, field: string): void => {
    for (const r of list ?? []) out.set(`${t}:${String(r.id)}`, String(r[field] ?? '').slice(0, 160));
  };
  const refs = rows.filter((r) => r.target_type === 'debate_vote' && r.target_ref).map((r) => r.target_ref as string);
  const [th, es, cm, db, ch, rp, dv] = await Promise.all([
    ids('thread').length ? svc.from('verse_threads').select('id, title').in('id', ids('thread')) : Promise.resolve({ data: [] }),
    ids('essay').length ? svc.from('verse_essays').select('id, title').in('id', ids('essay')) : Promise.resolve({ data: [] }),
    ids('comment').length ? svc.from('verse_discussions').select('id, body').in('id', ids('comment')) : Promise.resolve({ data: [] }),
    ids('debate').length ? svc.from('community_debates').select('id, question').in('id', ids('debate')) : Promise.resolve({ data: [] }),
    ids('challenge').length ? svc.from('community_challenges').select('id, message').in('id', ids('challenge')) : Promise.resolve({ data: [] }),
    ids('reply').length ? svc.from('community_replies').select('id, body').in('id', ids('reply')) : Promise.resolve({ data: [] }),
    refs.length ? svc.from('debate_votes').select('id, comment, date').in('id', refs) : Promise.resolve({ data: [] }),
  ]);
  put('thread', th.data as Array<Record<string, unknown>> | null, 'title');
  put('essay', es.data as Array<Record<string, unknown>> | null, 'title');
  put('comment', cm.data as Array<Record<string, unknown>> | null, 'body');
  put('debate', db.data as Array<Record<string, unknown>> | null, 'question');
  put('challenge', ch.data as Array<Record<string, unknown>> | null, 'message');
  put('reply', rp.data as Array<Record<string, unknown>> | null, 'body');
  // vote comments of the daily debate, keyed by their uuid (target_ref), with their debate's page
  for (const r of (dv.data ?? []) as Array<{ id: string; comment: string | null; date: string }>) {
    out.set(`debate_vote:${r.id}`, String(r.comment ?? '').slice(0, 160));
    out.set(`debate_vote_href:${r.id}`, `/community/debate/${r.date}`);
  }
  return out;
}

export default async function CommunityReportsPage(): Promise<React.ReactElement> {
  if (!isUxV12()) notFound();
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('community_autohidden').select('id, target_type, target_id, target_ref, prev_status, reports, hidden_at')
    .is('restored_at', null).order('hidden_at', { ascending: false }).limit(200);
  const rows = (data ?? []) as { id: number; target_type: string; target_id: number; target_ref: string | null; prev_status: string; reports: number; hidden_at: string }[];
  const pre = rows.length ? await previews(rows) : new Map<string, string>();
  const key = (r: (typeof rows)[number]): string => (r.target_type === 'debate_vote' ? `debate_vote:${r.target_ref}` : `${r.target_type}:${r.target_id}`);
  const list: HiddenRow[] = rows.map((r) => ({
    id: r.id, type: r.target_type === 'debate_vote' ? 'vote comment' : r.target_type, reports: r.reports, hiddenAt: r.hidden_at,
    preview: pre.get(key(r)) ?? '(no longer in the database)',
    href: r.target_type === 'debate_vote' ? pre.get(`debate_vote_href:${r.target_ref}`) ?? null : HREF[r.target_type]?.(r.target_id) ?? null,
  }));

  return (
    <div className="py-4">
      <h1 className="text-xl font-semibold text-primary mb-1">Community reports</h1>
      <p className="text-sm text-secondary mb-4">Posts and replies hidden after 3 reports by 3 different accounts. Nothing is deleted: Restore puts the content back and clears its reports.</p>
      {error ? <p className="text-sm text-secondary">The list could not be read. Try again in a minute.</p> : <RestoreList rows={list} />}
    </div>
  );
}
