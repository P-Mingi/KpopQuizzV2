import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('id, title, slug, quiz_type, questions, settings, status, creator_id, group_id, groups!inner(id, name, slug, display_color, text_color)')
    .eq('id', id)
    .single();

  if (error || !quiz) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }

  if (quiz.creator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (quiz.status === 'removed') {
    return NextResponse.json({ error: 'Cannot edit a removed quiz' }, { status: 403 });
  }

  function extractSingle<T>(val: unknown): T | null {
    if (Array.isArray(val)) return (val[0] as T) ?? null;
    return val as T | null;
  }

  const group = extractSingle<{ id: number; name: string; slug: string; display_color: string; text_color: string }>(quiz.groups);

  return NextResponse.json({
    id: quiz.id,
    title: quiz.title,
    slug: quiz.slug,
    quiz_type: quiz.quiz_type,
    questions: quiz.questions,
    settings: quiz.settings,
    group: group,
  });
}
