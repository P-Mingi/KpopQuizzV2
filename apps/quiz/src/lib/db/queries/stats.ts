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
