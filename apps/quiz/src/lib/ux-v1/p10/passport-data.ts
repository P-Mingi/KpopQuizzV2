// P10 passport extra READS (flag-on only). /me and /u/[username] keep every call
// they make today, in the same order; when the flag is on they append these
// read-only selects after it. Nothing here writes. Every read fails soft (an
// empty result), so a DB blip never 500s or bakes an error into the ISR page.

import { fetchAllRows } from '@/lib/db/fetch-all';
import { getGroupWarRank } from '@/lib/db/queries/group-hub';

import { averagePct } from './passport-model';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { HistoryRow } from './passport-model';

/** Main group (ult_groups[0]) fandom name, e.g. STAY. */
export async function readFandomName(db: SupabaseClient, slug: string | null | undefined): Promise<string | null> {
  if (!slug) return null;
  try {
    const { data } = await db.from('groups').select('fandom_name').eq('slug', slug).maybeSingle();
    const n = (data as { fandom_name: string | null } | null)?.fandom_name;
    return n && n.trim() ? n.trim() : null;
  } catch {
    return null;
  }
}

/** "This week: STAY is #2 in the fandom war" (the group hub's own ranking). */
export async function readWar(slug: string | null | undefined, fandom: string | null): Promise<{ fandom: string; rank: number } | null> {
  if (!slug || !fandom) return null;
  try {
    const r = await getGroupWarRank(slug);
    return r ? { fandom, rank: r.rank } : null;
  } catch {
    return null;
  }
}

/** Owner's average score over every play (paginated past the 1000-row cap). */
export async function readAverage(db: SupabaseClient, userId: string): Promise<number | null> {
  try {
    const rows = await fetchAllRows<{ score: number | null; total_questions: number | null }>(
      () => db.from('plays').select('score, total_questions').eq('player_id', userId).order('created_at', { ascending: true }),
    );
    return averagePct(rows);
  } catch {
    return null;
  }
}

/** Owner's latest quiz plays + blindtests, newest first (History tab, Recent activity). */
export async function readHistory(db: SupabaseClient, userId: string, limit = 20): Promise<HistoryRow[]> {
  try {
    const [playsRes, btRes] = await Promise.all([
      db.from('plays').select('quiz_id, score, total_questions, created_at').eq('player_id', userId).order('created_at', { ascending: false }).limit(limit),
      db.from('blind_test_plays').select('score, total, created_at').eq('player_id', userId).order('created_at', { ascending: false }).limit(limit),
    ]);
    const plays = (playsRes.data ?? []) as Array<{ quiz_id: string; score: number; total_questions: number; created_at: string }>;
    const bts = (btRes.data ?? []) as Array<{ score: number; total: number; created_at: string }>;

    const ids = [...new Set(plays.map((p) => p.quiz_id))];
    const quizzes = new Map<string, { title: string; slug: string; group_id: number | null }>();
    if (ids.length) {
      const { data } = await db.from('quizzes').select('id, title, slug, group_id, status').in('id', ids);
      for (const q of (data ?? []) as Array<{ id: string; title: string; slug: string; group_id: number | null; status: string }>) {
        if (q.status === 'published') quizzes.set(q.id, { title: q.title, slug: q.slug, group_id: q.group_id });
      }
    }
    const gids = [...new Set([...quizzes.values()].map((q) => q.group_id).filter((g): g is number => g !== null))];
    const groupSlug = new Map<number, string>();
    if (gids.length) {
      const { data } = await db.from('groups').select('id, slug').in('id', gids);
      for (const g of (data ?? []) as Array<{ id: number; slug: string }>) groupSlug.set(g.id, g.slug);
    }

    const rows: HistoryRow[] = [];
    for (const p of plays) {
      const q = quizzes.get(p.quiz_id);
      if (!q) continue; // unpublished / removed quiz: not listed
      rows.push({ kind: 'quiz', title: q.title, href: `/q/${q.slug}`, groupSlug: q.group_id !== null ? groupSlug.get(q.group_id) ?? null : null, score: p.score ?? 0, total: p.total_questions ?? 0, at: p.created_at });
    }
    for (const b of bts) rows.push({ kind: 'blindtest', title: 'Blindtest', href: null, groupSlug: null, score: b.score ?? 0, total: b.total ?? 0, at: b.created_at });
    return rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);
  } catch {
    return [];
  }
}
