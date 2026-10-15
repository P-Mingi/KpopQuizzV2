// Server side of the SEO refresh queue: reads the real hub dates, ranks with
// lib/seo/refresh-queue.ts, and stores the weekly snapshot and the monthly approvals.
//
// Storage is docs/pending-migrations/seo-refresh-queue.sql (owner-applied). Until it is
// applied every store call fails soft: the queue is computed on the fly, nothing is saved,
// and /admin/seo says approvals cannot be recorded yet.

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';

import { loadCalendar, utcDay } from './calendar';
import {
  NO_SEARCH_SIGNALS,
  rankRefreshQueue,
  weekOf as weekOfDate,
  type HubFreshness,
  type RefreshItem,
  type RefreshReason,
  type SearchSignalsSource,
} from './refresh-queue';

/**
 * Every group quiz hub the sitemap lists (a group with at least one published quiz), with
 * the created_at of its newest published quiz and the finished plays of its published
 * quizzes. Paginated past the 1000-row cap. Throws on a failed read.
 */
export async function readHubFreshness(): Promise<HubFreshness[]> {
  const db = createPublicReadClient();
  type QuizRow = { group_id: number; created_at: string; play_count: number | null };
  const [quizzes, groups] = await Promise.all([
    fetchAllRows<QuizRow>(() =>
      db.from('quizzes').select('group_id, created_at, play_count').eq('status', 'published').not('group_id', 'is', null).order('id'),
    ),
    db.from('groups').select('id, slug, name'),
  ]);
  if (groups.error) throw new Error(`[refresh-queue] groups: ${groups.error.message}`);
  const byGroup = new Map<number, { newest: string; plays: number }>();
  for (const q of quizzes) {
    const cur = byGroup.get(q.group_id);
    const plays = q.play_count ?? 0;
    if (!cur) byGroup.set(q.group_id, { newest: q.created_at, plays });
    else {
      cur.plays += plays;
      if (new Date(q.created_at) > new Date(cur.newest)) cur.newest = q.created_at;
    }
  }
  const hubs: HubFreshness[] = [];
  for (const g of (groups.data ?? []) as Array<{ id: number; slug: string; name: string }>) {
    const s = byGroup.get(g.id);
    if (!s) continue;
    hubs.push({ path: `/${g.slug}-quiz`, groupSlug: g.slug, groupName: g.name, lastUpdated: s.newest, plays: s.plays });
  }
  return hubs;
}

export interface RefreshQueueResult {
  weekOf: string;
  today: string;
  items: RefreshItem[];
  /** Which search sources had data (false = that signal was off). */
  search: { clicks: boolean; citations: boolean };
}

/** The queue of the week holding `now`, computed from live rows. Throws on a failed read. */
export async function computeRefreshQueue(now: Date = new Date(), source: SearchSignalsSource = NO_SEARCH_SIGNALS): Promise<RefreshQueueResult> {
  const week = weekOfDate(now);
  const [hubs, search] = await Promise.all([readHubFreshness(), source.read(week)]);
  const items = rankRefreshQueue({ weekOf: week, hubs, events: loadCalendar(), search });
  return { weekOf: week, today: utcDay(now), items, search: { clicks: search.clicks !== null, citations: search.citations !== null } };
}

export interface RefreshApproval {
  month: string;
  path: string;
  rank: number;
  score: number;
  reasons: RefreshReason[];
  approved_at: string;
}

/** undefined_table, undefined_column, undefined_function, and the PostgREST schema-cache misses. */
const MISSING = new Set(['42P01', '42703', '42883', 'PGRST200', 'PGRST202', 'PGRST204', 'PGRST205']);
export const isMissingTable = (err: { code?: string } | null | undefined): boolean => !!err && typeof err.code === 'string' && MISSING.has(err.code);

export interface RefreshStore {
  /** true once the pending migration is applied. */
  live(): Promise<boolean>;
  saveWeek(weekOf: string, items: readonly RefreshItem[]): Promise<void>;
  approvals(month: string): Promise<RefreshApproval[]>;
  approve(month: string, items: readonly RefreshItem[]): Promise<void>;
}

/** The store, or null when the service role key is not configured (preview, CI). */
export function getRefreshStore(): RefreshStore | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const svc = createServiceRoleClient();
  return {
    async live() {
      // A GET (not a head request), so a missing table comes back with its error code.
      const [a, b] = await Promise.all([
        svc.from('seo_refresh_queue').select('id').limit(1),
        svc.from('seo_refresh_approvals').select('id').limit(1),
      ]);
      for (const r of [a, b]) {
        if (isMissingTable(r.error)) return false;
        if (r.error) throw new Error(r.error.message);
      }
      return true;
    },
    async saveWeek(week, items) {
      // One snapshot per week: the rows of a rerun replace the earlier ones.
      const del = await svc.from('seo_refresh_queue').delete().eq('week_of', week);
      if (del.error) throw new Error(del.error.message);
      if (items.length === 0) return;
      const rows = items.map((it) => ({ week_of: week, rank: it.rank, path: it.path, score: it.score, reasons: it.reasons }));
      const ins = await svc.from('seo_refresh_queue').insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    },
    async approvals(month) {
      const { data, error } = await svc
        .from('seo_refresh_approvals')
        .select('month, path, rank, score, reasons, approved_at')
        .eq('month', month)
        .order('rank', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as RefreshApproval[];
    },
    async approve(month, items) {
      const rows = items.map((it) => ({ month, path: it.path, rank: it.rank, score: it.score, reasons: it.reasons }));
      const { error } = await svc.from('seo_refresh_approvals').insert(rows);
      if (error) throw new Error(error.message);
    },
  };
}
