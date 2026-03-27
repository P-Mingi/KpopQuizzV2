import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();

  // Get the quiz's group_id
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('group_id')
    .eq('id', id)
    .single();

  if (!quiz) {
    return NextResponse.json({ quizzes: [] });
  }

  // Fetch top 6 from same group, excluding current quiz
  const { data, error } = await supabase
    .from('quizzes')
    .select('id, title, slug, difficulty, play_count, quiz_type')
    .eq('group_id', quiz.group_id)
    .eq('status', 'published')
    .neq('id', id)
    .order('play_count', { ascending: false })
    .limit(6);

  if (error) {
    return NextResponse.json({ quizzes: [] });
  }

  // Pick 3 random from the top 6 for variety
  const shuffled = (data ?? []).sort(() => Math.random() - 0.5).slice(0, 3);

  return NextResponse.json({ quizzes: shuffled });
}
