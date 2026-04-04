import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { generateSlug } from '@/lib/utils';
import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

// Called by Vercel cron at 15:00 UTC (midnight KST) daily.
// Also callable manually by admins (GET with cookie auth or CRON_SECRET).
// Optional ?date=YYYY-MM-DD query param to publish for a specific date.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  let isAdminUser = false;
  if (!isVercelCron && !isManualAuth) {
    const serverClient = await createServerClient();
    const { data: { user } } = await serverClient.auth.getUser();
    isAdminUser = !!(user && isAdmin(user.id));
  }

  if (!isVercelCron && !isManualAuth && !isAdminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const dateParam = req.nextUrl.searchParams.get('date');
  const today = dateParam ?? new Date().toISOString().split('T')[0]!;

  // Already published today?
  const { data: alreadyPublished } = await supabase
    .from('quiz_bank')
    .select('id, published_quiz_id')
    .eq('scheduled_date', today)
    .eq('status', 'published')
    .maybeSingle();

  if (alreadyPublished?.published_quiz_id) {
    return NextResponse.json({ already_published: true, quiz_id: alreadyPublished.published_quiz_id });
  }

  // Find today's scheduled bank quiz
  const { data: scheduled } = await supabase
    .from('quiz_bank')
    .select('*')
    .eq('scheduled_date', today)
    .in('status', ['verified', 'scheduled'])
    .maybeSingle();

  if (!scheduled) {
    return NextResponse.json({ error: 'No quiz scheduled for today' }, { status: 404 });
  }

  // Strip source fields from questions before inserting into public quizzes
  const publishQuestions = (scheduled.questions as Record<string, unknown>[]).map(
    ({ source: _source, ...rest }) => rest,
  );

  // Generate a unique slug
  let slug = generateSlug(scheduled.title as string);
  const { data: slugCheck } = await supabase
    .from('quizzes')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (slugCheck) {
    slug = `${slug}-${Date.now()}`;
  }

  // Clear any existing QOTD for today
  await supabase
    .from('quizzes')
    .update({ is_quiz_of_the_day: false, quiz_of_the_day_date: null })
    .eq('quiz_of_the_day_date', today);

  // Create the real quiz
  const { data: newQuiz, error } = await supabase
    .from('quizzes')
    .insert({
      title: scheduled.title,
      description: scheduled.description ?? null,
      creator_id: '00000000-0000-0000-0000-000000000001', // kpopquizz system user
      group_id: scheduled.group_id ?? null,
      slug,
      quiz_type: scheduled.quiz_type ?? 'multiple_choice',
      difficulty: scheduled.difficulty ?? 'medium',
      questions: publishQuestions,
      question_count: (publishQuestions).length,
      settings: { timer: true, timer_seconds: 15, shuffle: true, show_answers: false },
      status: 'published',
      is_quiz_of_the_day: true,
      quiz_of_the_day_date: today,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[qotd/publish] Failed to insert quiz:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Mark bank entry as published
  await supabase
    .from('quiz_bank')
    .update({
      status: 'published',
      published_quiz_id: newQuiz.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduled.id);

  // Log to qotd_log
  await supabase.from('qotd_log').upsert(
    {
      quiz_id: newQuiz.id,
      featured_date: today,
      selection_method: 'bank',
    },
    { onConflict: 'featured_date' },
  );

  return NextResponse.json({ success: true, quiz_id: newQuiz.id, date: today });
}
