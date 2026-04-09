import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const isManualAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isManualAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0]!;

  // 1. Check if tomorrow already has a QOTD
  const { data: existing } = await supabase
    .from('qotd_log')
    .select('id')
    .eq('featured_date', tomorrowStr)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ message: 'QOTD already set for tomorrow', skipped: true });
  }

  // Also check quizzes table (backward compat)
  const { data: existingQuiz } = await supabase
    .from('quizzes')
    .select('id')
    .eq('is_quiz_of_the_day', true)
    .eq('quiz_of_the_day_date', tomorrowStr)
    .maybeSingle();

  if (existingQuiz) {
    return NextResponse.json({ message: 'QOTD already set via quizzes table', skipped: true });
  }

  // Check if a bank quiz is scheduled for tomorrow; if so, skip auto-select.
  // The bank publish cron at 15:00 UTC will handle it.
  const { data: bankQuiz } = await supabase
    .from('quiz_bank')
    .select('id')
    .eq('scheduled_date', tomorrowStr)
    .in('status', ['verified', 'scheduled'])
    .maybeSingle();

  if (bankQuiz) {
    return NextResponse.json({ message: 'Bank quiz scheduled for tomorrow; skipping auto-select', skipped: true });
  }

  // 2. Get recent QOTD group IDs for diversity
  const { data: recentQotd } = await supabase
    .from('qotd_log')
    .select('quiz_id, featured_date')
    .order('featured_date', { ascending: false })
    .limit(5);

  const recentQuizIds = (recentQotd ?? []).map((r) => r.quiz_id as string);

  let recentGroupMap: Map<number, number> = new Map();
  if (recentQuizIds.length > 0) {
    const { data: recentGroups } = await supabase
      .from('quizzes')
      .select('id, group_id')
      .in('id', recentQuizIds);

    for (const q of recentGroups ?? []) {
      const logEntry = (recentQotd ?? []).find((r) => r.quiz_id === q.id);
      const daysAgo = logEntry
        ? Math.floor((Date.now() - new Date(logEntry.featured_date as string).getTime()) / 86400000)
        : 999;
      const existing = recentGroupMap.get(q.group_id as number);
      if (!existing || daysAgo < existing) {
        recentGroupMap.set(q.group_id as number, daysAgo);
      }
    }
  }

  // 3. Fetch eligible quizzes (strict thresholds)
  let { data: eligible } = await supabase
    .from('quizzes')
    .select('id, group_id, play_count, like_count, total_completions, total_score_sum, question_count, created_at, quiz_of_the_day_date')
    .eq('status', 'published')
    .gte('play_count', 15)
    .gte('like_count', 2)
    .gte('total_completions', 10)
    .lt('report_count', 3);

  eligible = (eligible ?? []).filter((q) => {
    if ((q.question_count as number) < 7) return false;
    if (recentQuizIds.includes(q.id as string)) return false;
    if (q.quiz_of_the_day_date) {
      const daysSince = Math.floor((Date.now() - new Date(q.quiz_of_the_day_date as string).getTime()) / 86400000);
      if (daysSince < 90) return false;
    }
    return true;
  });

  // 4. Fallback: lower thresholds
  if ((eligible ?? []).length < 5) {
    const { data: fallback } = await supabase
      .from('quizzes')
      .select('id, group_id, play_count, like_count, total_completions, total_score_sum, question_count, created_at, quiz_of_the_day_date')
      .eq('status', 'published')
      .gte('play_count', 5)
      .gte('like_count', 1)
      .gte('total_completions', 3)
      .lt('report_count', 3);

    const fallbackFiltered = (fallback ?? []).filter((q) => {
      if ((q.question_count as number) < 5) return false;
      if (recentQuizIds.includes(q.id as string)) return false;
      return true;
    });

    const allIds = new Set((eligible ?? []).map((q) => q.id));
    for (const q of fallbackFiltered) {
      if (!allIds.has(q.id)) {
        eligible!.push(q);
        allIds.add(q.id);
      }
    }
  }

  // 5. Last resort: any quiz not featured in 7 days
  if ((eligible ?? []).length < 3) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]!;
    const { data: lastResort } = await supabase
      .from('quizzes')
      .select('id, group_id, play_count, like_count, total_completions, total_score_sum, question_count, created_at, quiz_of_the_day_date')
      .eq('status', 'published')
      .gte('play_count', 1)
      .order('play_count', { ascending: false })
      .limit(10);

    const lastResortFiltered = (lastResort ?? []).filter((q) => {
      if (q.quiz_of_the_day_date && (q.quiz_of_the_day_date as string) > sevenDaysAgo) return false;
      return true;
    });

    const allIds = new Set((eligible ?? []).map((q) => q.id));
    for (const q of lastResortFiltered) {
      if (!allIds.has(q.id)) {
        eligible!.push(q);
        allIds.add(q.id);
      }
    }
  }

  if (!eligible || eligible.length === 0) {
    return NextResponse.json({ message: 'No eligible quizzes found', skipped: true });
  }

  // 6. Score each quiz
  const scored = eligible.map((q) => {
    const questionCount = (q.question_count as number) || 1;
    const playCount = q.play_count as number;
    const likeCount = q.like_count as number;
    const totalCompletions = q.total_completions as number;
    const totalScoreSum = q.total_score_sum as number;

    const likeRatio = playCount > 0 ? likeCount / playCount : 0;
    const completionRate = playCount > 0 ? totalCompletions / playCount : 0;

    const avgScore = totalCompletions > 0
      ? (totalScoreSum / totalCompletions) / questionCount * 100
      : 50;

    const difficultyScore = (avgScore >= 40 && avgScore <= 70)
      ? 1.0
      : (avgScore >= 25 && avgScore <= 85) ? 0.6 : 0.3;

    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(q.created_at as string).getTime()) / 86400000,
    );
    const recencyScore = Math.max(0, 1 - (daysSinceCreated / 60));

    let score = likeRatio * 35 + completionRate * 20 + difficultyScore * 25 + recencyScore * 20;

    // Group diversity penalty
    const groupDaysAgo = recentGroupMap.get(q.group_id as number);
    if (groupDaysAgo !== undefined) {
      if (groupDaysAgo <= 1) score *= 0.1;
      else if (groupDaysAgo <= 2) score *= 0.4;
      else if (groupDaysAgo <= 3) score *= 0.7;
    }

    return { id: q.id as string, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0]!;

  // 7. Clear any existing QOTD for tomorrow and set new one
  await supabase
    .from('quizzes')
    .update({ is_quiz_of_the_day: false, quiz_of_the_day_date: null })
    .eq('quiz_of_the_day_date', tomorrowStr);

  await supabase
    .from('quizzes')
    .update({ is_quiz_of_the_day: true, quiz_of_the_day_date: tomorrowStr })
    .eq('id', winner.id);

  await supabase.from('qotd_log').insert({
    quiz_id: winner.id,
    featured_date: tomorrowStr,
    selection_method: 'auto',
    score: Math.round(winner.score * 100) / 100,
  });

  return NextResponse.json({
    message: 'QOTD set for tomorrow',
    quiz_id: winner.id,
    score: Math.round(winner.score * 100) / 100,
    date: tomorrowStr,
  });
}
