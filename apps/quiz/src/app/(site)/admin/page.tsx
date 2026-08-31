import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { AdminDashboard } from './admin-dashboard';

export default async function AdminPage(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    redirect('/');
  }

  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 86400000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

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
    moderationRes,
    qotdCurrentRes,
    qotdUpcomingRes,
    recentUsersRes,
    allQuizzesRes,
  ] = await Promise.all([
    supabase.from('plays').select('id', { count: 'exact', head: true }).gte('created_at', periodStart),
    supabase.from('plays').select('id', { count: 'exact', head: true }).gte('created_at', new Date(now.getTime() - 14 * 86400000).toISOString()).lt('created_at', periodStart),
    supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', periodStart),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', periodStart),
    supabase.from('plays').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    supabase.from('quizzes').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', todayStart),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('quizzes').select('play_count, total_completions').eq('status', 'published').gt('play_count', 0),
    supabase.from('plays').select('created_at').gte('created_at', periodStart).order('created_at', { ascending: true }),
    supabase.from('profiles').select('created_at').gte('created_at', periodStart).order('created_at', { ascending: true }),
    supabase.from('quizzes').select('created_at').eq('status', 'published').gte('created_at', periodStart).order('created_at', { ascending: true }),
    supabase.from('groups').select('name, display_color, total_plays').order('total_plays', { ascending: false }).limit(10),
    supabase.from('quizzes').select('title, slug, play_count, groups(name), profiles!quizzes_creator_id_fkey(username)').eq('status', 'published').gte('created_at', periodStart).order('play_count', { ascending: false }).limit(10),
    supabase.from('quizzes').select('play_count, creator_id, profiles!quizzes_creator_id_fkey(username, total_quizzes_created)').eq('status', 'published').gte('created_at', periodStart).order('play_count', { ascending: false }),
    // Moderation queue
    supabase.from('reports').select('id, reason, details, created_at, status, quiz_id, quizzes!inner(id, title, slug, status, report_count), profiles!reports_reporter_id_fkey(username)').eq('status', 'pending').order('created_at', { ascending: false }).limit(50),
    // Current QOTD
    supabase.from('quizzes').select('id, title, slug, quiz_of_the_day_date, profiles!quizzes_creator_id_fkey(username)').eq('is_quiz_of_the_day', true).eq('quiz_of_the_day_date', now.toISOString().split('T')[0]!).maybeSingle(),
    // Upcoming QOTD
    supabase.from('quizzes').select('id, title, slug, quiz_of_the_day_date, profiles!quizzes_creator_id_fkey(username)').eq('is_quiz_of_the_day', true).gt('quiz_of_the_day_date', now.toISOString().split('T')[0]!).order('quiz_of_the_day_date', { ascending: true }).limit(7),
    // Recent users
    supabase.from('profiles').select('id, username, display_name, avatar_url, avatar_bg, avatar_text, xp, total_quizzes_created, total_plays_received, created_at, banned_at').order('created_at', { ascending: false }).limit(20),
    // All quizzes (first page)
    supabase.from('quizzes').select('id, title, slug, status, play_count, report_count, total_score_sum, total_completions, difficulty, created_at, questions, groups(name), profiles!quizzes_creator_id_fkey(username)').order('created_at', { ascending: false }).limit(20),
  ]);

  // Process KPIs
  const totalPlays = playsCurrentRes.count ?? 0;
  const prevPlays = playsPrevRes.count ?? 0;
  const totalPlaysDelta = prevPlays > 0 ? Math.round(((totalPlays - prevPlays) / prevPlays) * 100) : 0;

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

  // Activity data
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
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

  // Top quizzes
  function extractSingle<T>(val: unknown): T | null {
    if (Array.isArray(val)) return (val[0] as T) ?? null;
    return val as T | null;
  }

  const topQuizzes = (topQuizzesRes.data ?? []).map((q: Record<string, unknown>) => ({
    title: q.title as string,
    slug: q.slug as string,
    group_name: extractSingle<{ name: string }>(q.groups)?.name ?? '',
    creator_username: extractSingle<{ username: string }>(q.profiles)?.username ?? '',
    play_count: q.play_count as number,
  }));

  // Top creators
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

  // Moderation data
  const moderation = (moderationRes.data ?? []).map((r: Record<string, unknown>) => {
    const quiz = extractSingle<{ id: string; title: string; slug: string; status: string; report_count: number }>(r.quizzes);
    const reporter = extractSingle<{ username: string }>(r.profiles);
    return {
      report_id: r.id as string,
      reason: r.reason as string,
      details: r.details as string | null,
      report_date: r.created_at as string,
      quiz_id: quiz?.id ?? (r.quiz_id as string),
      quiz_title: quiz?.title ?? '',
      quiz_slug: quiz?.slug ?? '',
      quiz_status: quiz?.status ?? '',
      report_count: quiz?.report_count ?? 0,
      reporter_username: reporter?.username ?? 'anonymous',
    };
  });

  // QOTD
  const qotdCurrent = qotdCurrentRes.data ? {
    id: qotdCurrentRes.data.id as string,
    title: qotdCurrentRes.data.title as string,
    slug: qotdCurrentRes.data.slug as string,
    date: qotdCurrentRes.data.quiz_of_the_day_date as string,
    username: extractSingle<{ username: string }>((qotdCurrentRes.data as Record<string, unknown>).profiles)?.username ?? '',
  } : null;

  const qotdUpcoming = (qotdUpcomingRes.data ?? []).map((q: Record<string, unknown>) => ({
    id: q.id as string,
    title: q.title as string,
    slug: q.slug as string,
    date: q.quiz_of_the_day_date as string,
    username: extractSingle<{ username: string }>(q.profiles)?.username ?? '',
  }));

  // Recent users
  const recentUsers = (recentUsersRes.data ?? []).map(u => ({
    id: u.id as string,
    username: u.username as string,
    display_name: (u.display_name as string | null) ?? null,
    avatar_url: u.avatar_url as string | null,
    avatar_bg: u.avatar_bg as string,
    avatar_text: u.avatar_text as string,
    xp: (u.xp as number) ?? 0,
    total_quizzes_created: u.total_quizzes_created as number,
    total_plays_received: u.total_plays_received as number,
    created_at: u.created_at as string,
    banned_at: u.banned_at as string | null,
  }));

  // All quizzes
  const allQuizzes = (allQuizzesRes.data ?? []).map((q: Record<string, unknown>) => ({
    id: q.id as string,
    title: q.title as string,
    slug: q.slug as string,
    status: q.status as string,
    play_count: q.play_count as number,
    report_count: q.report_count as number,
    avg_score: (q.total_completions as number) > 0 && Array.isArray(q.questions) && q.questions.length > 0
      ? Math.round(((q.total_score_sum as number) / (q.total_completions as number)) / q.questions.length * 100)
      : 0,
    question_count: Array.isArray(q.questions) ? q.questions.length : 0,
    difficulty: q.difficulty as string,
    created_at: q.created_at as string,
    group_name: extractSingle<{ name: string }>(q.groups)?.name ?? '',
    creator_username: extractSingle<{ username: string }>(q.profiles)?.username ?? '',
  }));

  const initialData = {
    kpis: {
      total_plays: totalPlays,
      total_plays_delta: totalPlaysDelta,
      total_quizzes: quizzesCurrentRes.count ?? 0,
      total_quizzes_new: quizzesCurrentRes.count ?? 0,
      total_users: usersCurrentRes.count ?? 0,
      total_users_new: usersCurrentRes.count ?? 0,
      avg_completion_rate: avgCompletionRate,
      avg_completion_rate_delta: 0,
      plays_today: playsTodayRes.count ?? 0,
      users_today: usersTodayRes.count ?? 0,
      quizzes_today: quizzesTodayRes.count ?? 0,
      pending_reports: pendingReportsRes.count ?? 0,
    },
    activity: {
      dates,
      plays: dates.map(d => playsByDay[d] ?? 0),
      users: dates.map(d => usersByDay[d] ?? 0),
      quizzes: dates.map(d => quizzesByDay[d] ?? 0),
    },
    top_groups: (topGroupsRes.data ?? []).map(g => ({
      name: g.name as string,
      display_color: g.display_color as string,
      total_plays: g.total_plays as number,
    })),
    top_quizzes: topQuizzes,
    top_creators: topCreators,
    moderation,
    qotd_current: qotdCurrent,
    qotd_upcoming: qotdUpcoming,
    recent_users: recentUsers,
    all_quizzes: allQuizzes,
  };

  return <AdminDashboard initialData={initialData} />;
}
