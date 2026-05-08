import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  const { count: total_quizzes } = await db
    .from('quizzes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  // Cards with ready status
  const { data: cardCounts } = await db
    .from('quiz_pinterest_cards')
    .select('quiz_id, generation_status')
    .eq('generation_status', 'ready');

  const readyCounts: Record<string, number> = {};
  (cardCounts ?? []).forEach(c => {
    readyCounts[c.quiz_id] = (readyCounts[c.quiz_id] ?? 0) + 1;
  });

  const with_all_cards = Object.values(readyCounts).filter(c => c >= 3).length;
  const total_cards_ready = (cardCounts ?? []).length;
  const missing_cards = (total_quizzes ?? 0) - with_all_cards;
  const missing_jobs = (total_quizzes ?? 0) * 3 - total_cards_ready;

  const { count: total_posted } = await db
    .from('quiz_pinterest_cards')
    .select('*', { count: 'exact', head: true })
    .eq('pinterest_status', 'posted');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: recent_count } = await db
    .from('quizzes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('created_at', thirtyDaysAgo);

  return NextResponse.json({
    total_quizzes: total_quizzes ?? 0,
    with_all_cards,
    missing_cards,
    missing_jobs,
    total_cards_ready,
    total_posted: total_posted ?? 0,
    recent_count: recent_count ?? 0,
  });
}
