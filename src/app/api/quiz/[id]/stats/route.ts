import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select('play_count, total_score_sum, total_completions, difficulty')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }

  return NextResponse.json({
    play_count: data.play_count,
    total_score_sum: data.total_score_sum,
    total_completions: data.total_completions,
    difficulty: data.difficulty,
  });
}
