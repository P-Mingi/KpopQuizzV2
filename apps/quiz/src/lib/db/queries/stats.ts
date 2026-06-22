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
