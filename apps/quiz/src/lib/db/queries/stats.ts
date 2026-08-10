import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';

export interface SiteStats {
  totalSongs: number;
  totalQuizzes: number;
  totalPlays: number;
  totalGroups: number;
  generationsCovered: number;
  topQuizzesByGroup: Array<{
    groupName: string;
    groupSlug: string;
    quizCount: number;
    totalPlays: number;
  }>;
  updatedAt: string;
}

const STATS_TTL = 604800; // 1 week

const fetchSiteStats = async (): Promise<SiteStats> => {
  const supabase = createPublicReadClient();

  const [songsRes, quizzesRes, playsRes, groupsRes] = await Promise.all([
    supabase
      .from('songs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('quizzes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published'),
    supabase
      .from('plays')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('groups')
      .select('name, slug, quiz_count, total_plays')
      .gt('quiz_count', 0)
      .order('total_plays', { ascending: false })
      .limit(10),
  ]);

  const totalGroups = await supabase
    .from('groups')
    .select('id', { count: 'exact', head: true });

  const topQuizzesByGroup = (groupsRes.data ?? []).map((g) => ({
    groupName: g.name as string,
    groupSlug: g.slug as string,
    quizCount: (g.quiz_count as number) ?? 0,
    totalPlays: (g.total_plays as number) ?? 0,
  }));

  return {
    totalSongs: songsRes.count ?? 0,
    totalQuizzes: quizzesRes.count ?? 0,
    totalPlays: playsRes.count ?? 0,
    totalGroups: totalGroups.count ?? 0,
    generationsCovered: 5,
    topQuizzesByGroup,
    updatedAt: new Date().toISOString(),
  };
};

export const getSiteStats = unstable_cache(
  fetchSiteStats,
  ['db:stats:getSiteStats:v1'],
  { revalidate: STATS_TTL, tags: ['stats'] },
);

// S1.1 - hardest + easiest published quizzes by real average score. Average is
// the maintained aggregate total_score_sum / total_completions, normalised by
// the quiz's actual question count (questions.length, which is authoritative;
// the denormalised question_count column can go stale when a quiz is edited and
// produces impossible >100% averages). Min 30 completions so the average is
// trustworthy. Candidate set is capped for NANO safety.
export interface QuizScoreRow {
  title: string;
  slug: string;
  groupName: string;
  groupSlug: string;
  avgPct: number;
  plays: number;
}
export interface QuizExtremes {
  hardest: QuizScoreRow[];
  easiest: QuizScoreRow[];
  minPlays: number;
  candidates: number;
  updatedAt: string;
}

const MIN_COMPLETIONS = 30;

const fetchQuizScoreExtremes = async (): Promise<QuizExtremes> => {
  const supabase = createPublicReadClient();
  const { data } = await supabase
    .from('quizzes')
    .select('slug, title, total_score_sum, total_completions, questions, groups(name, slug)')
    .eq('status', 'published')
    .gte('total_completions', MIN_COMPLETIONS)
    .limit(600);

  const rows: QuizScoreRow[] = [];
  for (const x of (data ?? []) as Array<Record<string, unknown>>) {
    const qc = Array.isArray(x.questions) ? (x.questions as unknown[]).length : 0;
    const completions = (x.total_completions as number) ?? 0;
    const sum = (x.total_score_sum as number) ?? 0;
    if (qc <= 0 || completions <= 0) continue;
    const avgPct = Math.round((sum / completions / qc) * 100);
    // Drop impossible values (edited-after-plays artifacts) so the ranking is honest.
    if (avgPct < 0 || avgPct > 100) continue;
    const grp = x.groups as { name?: string; slug?: string } | null;
    rows.push({
      title: x.title as string,
      slug: x.slug as string,
      groupName: grp?.name ?? 'K-pop',
      groupSlug: grp?.slug ?? '',
      avgPct,
      plays: completions,
    });
  }

  rows.sort((a, b) => a.avgPct - b.avgPct);
  return {
    hardest: rows.slice(0, 5),
    easiest: rows.slice(-5).reverse(),
    minPlays: MIN_COMPLETIONS,
    candidates: rows.length,
    updatedAt: new Date().toISOString(),
  };
};

export const getQuizScoreExtremes = unstable_cache(
  fetchQuizScoreExtremes,
  ['db:stats:quizExtremes:v2'],
  { revalidate: 3600, tags: ['stats'] },
);

// SEO iteration - three new READ helpers for the article bodies. Pure reads (no DDL), cached
// hourly + tagged 'stats'. Covenant: every number is DB-derived; honest emptiness over invention.

// ---- most-played PUBLISHED quizzes over the trailing 30 days ----------------------------------
// The `plays` table has no per-window aggregate, so we count from it. To respect the PostgREST
// 1000-row cap we paginate the recent plays (created_at desc) up to a safety ceiling; if the window
// is busier than the ceiling the ranking is the most-recent slice (still an honest "most played
// lately"), and we cap-log it. Date.now() at request time is fine (it only runs on a cache miss).
export interface PlayedRow { title: string; slug: string; groupName: string; groupSlug: string; plays: number; }

const PLAYS_PAGE = 1000;
const PLAYS_MAX_PAGES = 30; // ceiling: 30k recent plays

const fetchMostPlayed30d = async (limit: number): Promise<PlayedRow[]> => {
  const supabase = createPublicReadClient();
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const counts = new Map<number, number>();
  let capped = false;
  for (let page = 0; page < PLAYS_MAX_PAGES; page += 1) {
    const from = page * PLAYS_PAGE;
    const { data } = await supabase
      .from('plays').select('quiz_id')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .range(from, from + PLAYS_PAGE - 1);
    const rows = (data ?? []) as { quiz_id: number | null }[];
    for (const r of rows) if (r.quiz_id != null) counts.set(r.quiz_id, (counts.get(r.quiz_id) ?? 0) + 1);
    if (rows.length < PLAYS_PAGE) break;
    if (page === PLAYS_MAX_PAGES - 1) capped = true;
  }
  if (capped) console.warn(`[stats] getMostPlayedQuizzes30d hit the ${PLAYS_MAX_PAGES}-page ceiling; ranking uses the most recent plays.`);
  if (counts.size === 0) return [];
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  // over-fetch candidate quizzes (some of the most-played may be unpublished/deleted -> skipped).
  const candidateIds = ranked.slice(0, limit * 3).map(([id]) => id);
  const { data: qz } = await supabase
    .from('quizzes').select('id, slug, title, groups(name, slug)')
    .eq('status', 'published').in('id', candidateIds);
  const byId = new Map(((qz ?? []) as Array<{ id: number; slug: string; title: string; groups: { name?: string; slug?: string } | null }>).map((q) => [q.id, q]));
  const out: PlayedRow[] = [];
  for (const [id, plays] of ranked) {
    const q = byId.get(id);
    if (!q) continue;
    out.push({ title: q.title, slug: q.slug, groupName: q.groups?.name ?? 'K-pop', groupSlug: q.groups?.slug ?? '', plays });
    if (out.length >= limit) break;
  }
  return out;
};

export const getMostPlayedQuizzes30d = unstable_cache(
  (limit = 10) => fetchMostPlayed30d(limit),
  ['db:stats:mostPlayed30d:v1'],
  { revalidate: 3600, tags: ['stats'] },
);

// ---- girl-group vs boy-group average quiz scores ----------------------------------------------
// `groups` has no gender; each group's songs carry a gender ('gg' | 'bg' | 'coed'), uniform per
// group in practice, so the group's TYPE is the majority of its songs' gender. avgPct is computed
// exactly like getQuizScoreExtremes. Returns null when either bucket is too sparse to be honest
// (< MIN_BUCKET quizzes) so the article can fall back to evergreen prose with no invented numbers.
export interface TypeScore { avgPct: number; quizzes: number; plays: number; }
export interface GroupTypeScores { female: TypeScore; male: TypeScore; }

const MIN_BUCKET = 10;

const fetchGroupTypeScores = async (): Promise<GroupTypeScores | null> => {
  const supabase = createPublicReadClient();
  const { data: qData } = await supabase
    .from('quizzes')
    .select('total_score_sum, total_completions, questions, group_id, groups(slug, is_custom, needs_review)')
    .eq('status', 'published')
    .gte('total_completions', MIN_COMPLETIONS)
    .limit(1000);
  const quizzes = ((qData ?? []) as Array<Record<string, unknown>>).filter((q) => {
    const g = q.groups as { slug?: string; is_custom?: boolean; needs_review?: boolean } | null;
    return g && !g.is_custom && !g.needs_review && g.slug !== 'general-kpop';
  });
  const groupIds = [...new Set(quizzes.map((q) => q.group_id as number).filter((x) => x != null))];
  if (!groupIds.length) return null;

  // majority gender per group, paginating songs to clear the 1000-row cap.
  const genderTally = new Map<number, Record<string, number>>();
  for (let page = 0; page < 20; page += 1) {
    const from = page * 1000;
    const { data } = await supabase.from('songs').select('group_id, gender').in('group_id', groupIds).range(from, from + 999);
    const rows = (data ?? []) as { group_id: number; gender: string | null }[];
    for (const r of rows) { const t = genderTally.get(r.group_id) ?? {}; const k = r.gender ?? 'null'; t[k] = (t[k] ?? 0) + 1; genderTally.set(r.group_id, t); }
    if (rows.length < 1000) break;
  }
  const typeOf = (gid: number): 'female' | 'male' | null => {
    const t = genderTally.get(gid); if (!t) return null;
    const top = Object.entries(t).sort((a, b) => b[1] - a[1])[0]?.[0];
    return top === 'gg' ? 'female' : top === 'bg' ? 'male' : null;
  };

  const acc: Record<'female' | 'male', { pctSum: number; n: number; plays: number }> = {
    female: { pctSum: 0, n: 0, plays: 0 }, male: { pctSum: 0, n: 0, plays: 0 },
  };
  for (const q of quizzes) {
    const type = typeOf(q.group_id as number);
    if (!type) continue;
    const qc = Array.isArray(q.questions) ? (q.questions as unknown[]).length : 0;
    const completions = (q.total_completions as number) ?? 0;
    const sum = (q.total_score_sum as number) ?? 0;
    if (qc <= 0 || completions <= 0) continue;
    const avgPct = (sum / completions / qc) * 100;
    if (avgPct < 0 || avgPct > 100) continue;
    acc[type].pctSum += avgPct; acc[type].n += 1; acc[type].plays += completions;
  }
  if (acc.female.n < MIN_BUCKET || acc.male.n < MIN_BUCKET) return null;
  return {
    female: { avgPct: Math.round(acc.female.pctSum / acc.female.n), quizzes: acc.female.n, plays: acc.female.plays },
    male: { avgPct: Math.round(acc.male.pctSum / acc.male.n), quizzes: acc.male.n, plays: acc.male.plays },
  };
};

export const getGroupTypeScores = unstable_cache(
  fetchGroupTypeScores,
  ['db:stats:groupTypeScores:v1'],
  { revalidate: 3600, tags: ['stats'] },
);

// ---- member counts per group (from the idols roster) ------------------------------------------
// Real active-member counts, mirroring the name-them-all filters (exclude custom / needs_review /
// the general-kpop catch-all). Ordered by roster size.
export interface MemberCountRow { groupName: string; groupSlug: string; members: number; generation: string | null; }

const fetchGroupMemberCounts = async (limit: number): Promise<MemberCountRow[]> => {
  const supabase = createPublicReadClient();
  const { data: idolRows } = await supabase.from('idols').select('group_id').eq('active', true).limit(1000);
  const counts = new Map<number, number>();
  for (const r of ((idolRows ?? []) as { group_id: number | null }[])) if (r.group_id != null) counts.set(r.group_id, (counts.get(r.group_id) ?? 0) + 1);
  const groupIds = [...counts.keys()];
  if (!groupIds.length) return [];
  const { data: grpRows } = await supabase
    .from('groups').select('id, name, slug, generation, is_custom, needs_review').in('id', groupIds);
  const rows: MemberCountRow[] = [];
  for (const g of ((grpRows ?? []) as Array<{ id: number; name: string; slug: string; generation: string | null; is_custom: boolean; needs_review: boolean }>)) {
    if (g.is_custom || g.needs_review || g.slug === 'general-kpop') continue;
    rows.push({ groupName: g.name, groupSlug: g.slug, members: counts.get(g.id) ?? 0, generation: g.generation });
  }
  rows.sort((a, b) => b.members - a.members || a.groupName.localeCompare(b.groupName));
  return rows.slice(0, limit);
};

export const getGroupMemberCounts = unstable_cache(
  (limit = 12) => fetchGroupMemberCounts(limit),
  ['db:stats:groupMemberCounts:v1'],
  { revalidate: 3600, tags: ['stats'] },
);
