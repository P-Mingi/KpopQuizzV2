import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

function getIntervalDays(period: string): number | null {
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  if (period === 'all') return null;
  return 7;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? '7d';
  const days = getIntervalDays(period);

  // Build date filter
  const now = new Date();
  const periodStart = days ? new Date(now.getTime() - days * 86400000) : null;
  const prevPeriodStart = days ? new Date(now.getTime() - days * 2 * 86400000) : null;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const periodStartISO = periodStart?.toISOString() ?? '1970-01-01T00:00:00Z';
  const prevPeriodStartISO = prevPeriodStart?.toISOString() ?? '1970-01-01T00:00:00Z';

  // Fetch all data in parallel
  const [
    playsCurrentRes,
    playsPrevRes,
    quizzesCurrentRes,
    usersCurrentRes,
    playsTodayRes,
    usersTodayRes,
    quizzesTodayRes,
    pendingReportsRes,
    allPublishedQuizzesRes,
    playsForActivityRes,
    usersForActivityRes,
    quizzesForActivityRes,
    topGroupsRes,
    topQuizzesRes,
    topCreatorsRes,
  ] = await Promise.all([
    // KPI: plays current period
    periodStart
      ? supabase.from('plays').select('id', { count: 'exact', head: true }).gte('created_at', periodStartISO)
      : supabase.from('plays').select('id', { count: 'exact', head: true }),
    // KPI: plays previous period
    periodStart
      ? supabase.from('plays').select('id', { count: 'exact', head: true }).gte('created_at', prevPeriodStartISO).lt('created_at', periodStartISO)
      : Promise.resolve({ count: 0 }),
    // KPI: quizzes current period
    periodStart
      ? supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', periodStartISO)
      : supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    // KPI: users current period
    periodStart
      ? supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', periodStartISO)
      : supabase.from('profiles').select('id', { count: 'exact', head: true }),
    // Today: plays
    supabase.from('plays').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    // Today: users
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    // Today: quizzes
    supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', todayStart),
    // Today: pending reports
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    // Avg completion rate - fetch published quizzes with play data
    supabase.from('quizzes').select('play_count, total_completions').eq('status', 'published').gt('play_count', 0),
    // Activity: plays per day
    periodStart
      ? supabase.from('plays').select('created_at').gte('created_at', periodStartISO).order('created_at', { ascending: true })
      : supabase.from('plays').select('created_at').order('created_at', { ascending: true }),
    // Activity: users per day
    periodStart
      ? supabase.from('profiles').select('created_at').gte('created_at', periodStartISO).order('created_at', { ascending: true })
      : supabase.from('profiles').select('created_at').order('created_at', { ascending: true }),
    // Activity: quizzes per day
    periodStart
      ? supabase.from('quizzes').select('created_at').eq('status', 'published').gte('created_at', periodStartISO).order('created_at', { ascending: true })
      : supabase.from('quizzes').select('created_at').eq('status', 'published').order('created_at', { ascending: true }),
    // Top groups by plays
    supabase.from('groups').select('name, display_color, total_plays').order('total_plays', { ascending: false }).limit(10),
    // Top quizzes this period
    periodStart
      ? supabase.from('quizzes').select('title, slug, play_count, groups(name), profiles!quizzes_creator_id_fkey(username)').eq('status', 'published').gte('created_at', periodStartISO).order('play_count', { ascending: false }).limit(10)
      : supabase.from('quizzes').select('title, slug, play_count, groups(name), profiles!quizzes_creator_id_fkey(username)').eq('status', 'published').order('play_count', { ascending: false }).limit(10),
    // Top creators - fetch all published quizzes with creator info for the period
    periodStart
      ? supabase.from('quizzes').select('play_count, creator_id, profiles!quizzes_creator_id_fkey(username, total_quizzes_created)').eq('status', 'published').gte('created_at', periodStartISO).order('play_count', { ascending: false })
      : supabase.from('quizzes').select('play_count, creator_id, profiles!quizzes_creator_id_fkey(username, total_quizzes_created)').eq('status', 'published').order('play_count', { ascending: false }),
  ]);

  // Calculate KPIs
  const totalPlays = playsCurrentRes.count ?? 0;
  const prevPlays = ('count' in playsPrevRes) ? (playsPrevRes.count ?? 0) : 0;
  const totalPlaysDelta = prevPlays > 0 ? Math.round(((totalPlays - prevPlays) / prevPlays) * 100) : 0;

  const totalQuizzesNew = quizzesCurrentRes.count ?? 0;
  const totalUsersNew = usersCurrentRes.count ?? 0;

  // Avg completion rate
  const quizData = allPublishedQuizzesRes.data ?? [];
  let avgCompletionRate = 0;
  if (quizData.length > 0) {
    const rates = quizData.map(q => {
      if (q.total_completions > 0 && q.play_count > 0) {
        return (q.total_completions / q.play_count) * 100;
      }
      return 0;
    });
    avgCompletionRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }

  // Build activity data - group by day
  const activityDays = days ?? 365;
  const dates: string[] = [];
  for (let i = activityDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    dates.push(d.toISOString().split('T')[0]!);
  }

  function countByDay(records: { created_at: string }[] | null): Record<string, number> {
    const counts: Record<string, number> = {};
    if (!records) return counts;
    for (const r of records) {
      const day = r.created_at.split('T')[0]!;
      counts[day] = (counts[day] ?? 0) + 1;
    }
    return counts;
  }

  const playsByDay = countByDay(playsForActivityRes.data);
  const usersByDay = countByDay(usersForActivityRes.data);
  const quizzesByDay = countByDay(quizzesForActivityRes.data);

  const activity = {
    dates,
    plays: dates.map(d => playsByDay[d] ?? 0),
    users: dates.map(d => usersByDay[d] ?? 0),
    quizzes: dates.map(d => quizzesByDay[d] ?? 0),
  };

  // Top groups
  const topGroups = (topGroupsRes.data ?? []).map(g => ({
    name: g.name,
    display_color: g.display_color,
    total_plays: g.total_plays,
  }));

  // Helper to extract single item from Supabase join (may return array or object)
  function extractSingle<T>(val: unknown): T | null {
    if (Array.isArray(val)) return (val[0] as T) ?? null;
    return val as T | null;
  }

  // Top quizzes
  const topQuizzes = (topQuizzesRes.data ?? []).map((q: Record<string, unknown>) => {
    return {
      title: q.title as string,
      slug: q.slug as string,
      group_name: extractSingle<{ name: string }>(q.groups)?.name ?? '',
      creator_username: extractSingle<{ username: string }>(q.profiles)?.username ?? '',
      play_count: q.play_count as number,
    };
  });

  // Top creators - aggregate by creator
  const creatorMap = new Map<string, { username: string; total_quizzes: number; period_quizzes: number; period_plays: number }>();
  for (const q of (topCreatorsRes.data ?? [])) {
    const creatorId = q.creator_id as string;
    const profiles = extractSingle<{ username: string; total_quizzes_created: number }>(q.profiles);
    const existing = creatorMap.get(creatorId);
    if (existing) {
      existing.period_quizzes += 1;
      existing.period_plays += (q.play_count as number) ?? 0;
    } else {
      creatorMap.set(creatorId, {
        username: profiles?.username ?? '',
        total_quizzes: profiles?.total_quizzes_created ?? 0,
        period_quizzes: 1,
        period_plays: (q.play_count as number) ?? 0,
      });
    }
  }
  const topCreators = Array.from(creatorMap.values())
    .sort((a, b) => b.period_plays - a.period_plays)
    .slice(0, 10)
    .map(c => ({
      username: c.username,
      total_quizzes: c.total_quizzes,
      total_plays: c.period_plays,
      period_plays: c.period_plays,
    }));

  return NextResponse.json({
    kpis: {
      total_plays: totalPlays,
      total_plays_delta: totalPlaysDelta,
      total_quizzes: totalQuizzesNew,
      total_quizzes_new: totalQuizzesNew,
      total_users: totalUsersNew,
      total_users_new: totalUsersNew,
      avg_completion_rate: avgCompletionRate,
      avg_completion_rate_delta: 0,
      plays_today: playsTodayRes.count ?? 0,
      users_today: usersTodayRes.count ?? 0,
      quizzes_today: quizzesTodayRes.count ?? 0,
      pending_reports: pendingReportsRes.count ?? 0,
    },
    activity,
    top_groups: topGroups,
    top_quizzes: topQuizzes,
    top_creators: topCreators,
  });
}
