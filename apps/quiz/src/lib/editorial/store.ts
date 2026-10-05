import { createServiceRoleClient } from '@/lib/supabase/server';
import { isMissingTable } from '@/lib/ux-v1/p8/features';
import { insertCommunityDebate } from '@/lib/ux-v1/p8/write';

import { DRAFT_COLS } from './types';

import type { DraftPatch, EditorialStore } from './pipeline';
import type { EditorialAccount, EditorialDraft } from './types';

// The real EditorialStore: the service-role client on the three tables of
// v12-g9-editorial.sql, plus community_debates through the fan-debate insert.
// Server only. Callers check editorialLive() first: nothing here runs against a
// missing table.

type Svc = ReturnType<typeof createServiceRoleClient>;

function must<T extends { error: { message: string } | null }>(r: T, what: string): T {
  if (r.error) throw new Error(`editorial ${what}: ${r.error.message}`);
  return r;
}

/** Do the editorial tables exist? Uncached GET probe (a HEAD on a missing table
 *  answers 204 without an error, lib/ux-v1/p8/features.ts). Throws on any other
 *  failure, so a blip is never read as "not applied". */
export async function editorialLive(svc: Svc = createServiceRoleClient()): Promise<boolean> {
  for (const [table, col] of [['editorial_accounts', 'user_id'], ['editorial_drafts', 'id'], ['editorial_posts', 'id']] as const) {
    const { error, status } = await svc.from(table).select(col).limit(1);
    if (!error) continue;
    if (isMissingTable(error, status)) return false;
    throw new Error(`editorial probe ${table}: ${error.message}`);
  }
  return true;
}

export function supabaseStore(svc: Svc = createServiceRoleClient()): EditorialStore {
  return {
    async accounts() {
      const { data } = must(await svc.from('editorial_accounts').select('user_id, display_name, beat, active').order('created_at', { ascending: true }).limit(50), 'accounts');
      return (data ?? []) as EditorialAccount[];
    },
    async listDrafts(limit) {
      const { data } = must(await svc.from('editorial_drafts').select(DRAFT_COLS).order('created_at', { ascending: false }).limit(limit), 'drafts');
      return (data ?? []) as unknown as EditorialDraft[];
    },
    async getDraft(id) {
      const { data } = must(await svc.from('editorial_drafts').select(DRAFT_COLS).eq('id', id).maybeSingle(), 'draft');
      return (data as unknown as EditorialDraft | null) ?? null;
    },
    async insertDraft(row) {
      const { data, error } = await svc.from('editorial_drafts').insert({
        account_id: row.account_id, kind: row.kind, group_id: row.group_id, title: row.title, body: row.body,
        options: row.options, sources: row.sources, debate_days: row.debate_days, created_by: row.created_by,
        template_key: row.template_key, status: 'draft',
      }).select(DRAFT_COLS).single();
      if (error) {
        if (error.code === '23505') return null; // the template_key already has its draft
        throw new Error(`editorial insert draft: ${error.message}`);
      }
      return data as unknown as EditorialDraft;
    },
    async updateDraft(id, patch: DraftPatch, when) {
      let q = svc.from('editorial_drafts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).in('status', when.status);
      if (when.unclaimed) q = q.is('published_ref', null);
      const { data } = must(await q.select(DRAFT_COLS).maybeSingle(), 'update draft');
      return (data as unknown as EditorialDraft | null) ?? null;
    },
    async approvedDue(nowIso) {
      const { data } = must(await svc.from('editorial_drafts').select(DRAFT_COLS).eq('status', 'approved').lte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true }).order('id', { ascending: true }).limit(200), 'due drafts');
      return (data ?? []) as unknown as EditorialDraft[];
    },
    async publishedCount(startIso, endIso) {
      // GET + exact count (never HEAD), limit 1: the count is exact past 1000 rows.
      const { count } = must(await svc.from('editorial_drafts').select('id', { count: 'exact' }).eq('status', 'published')
        .gte('published_at', startIso).lt('published_at', endIso).limit(1), 'published count');
      return count ?? 0;
    },
    async lastPublishedAccount() {
      const { data } = must(await svc.from('editorial_drafts').select('account_id').eq('status', 'published')
        .order('published_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle(), 'last published');
      return (data as { account_id: string } | null)?.account_id ?? null;
    },
    async insertDebate(row) {
      const r = await insertCommunityDebate(svc, row);
      if ('error' in r) throw new Error(`editorial insert debate: ${r.error}`);
      return r.id;
    },
    async insertPost(row) {
      const { data, error } = await svc.from('editorial_posts').insert({
        draft_id: row.draft_id, kind: row.kind, group_id: row.group_id, author: row.author, title: row.title,
        body: row.body, sources: row.sources, status: 'visible',
      }).select('id').single();
      if (error) throw new Error(`editorial insert post: ${error.message}`);
      return (data as { id: number }).id;
    },
  };
}
