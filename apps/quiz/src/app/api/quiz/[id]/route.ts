import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { validateQuestions } from '@/lib/quiz-validation';

import type { NextRequest } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from('quizzes')
    .select('id, creator_id, slug, status')
    .eq('id', id)
    .single();

  if (!existing || existing.creator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (existing.status === 'removed') {
    return NextResponse.json({ error: 'Cannot edit a removed quiz' }, { status: 403 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  // Validate
  const errors: string[] = [];

  if (typeof input.title !== 'string' || input.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters');
  }
  if (typeof input.title === 'string' && input.title.length > 100) {
    errors.push('Title must be at most 100 characters');
  }

  const validTypes = ['multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'];
  if (typeof input.quiz_type !== 'string' || !validTypes.includes(input.quiz_type)) {
    errors.push('Invalid quiz type');
  }

  const validDifficulties = ['easy', 'medium', 'hard'];
  if (input.difficulty !== undefined && (typeof input.difficulty !== 'string' || !validDifficulties.includes(input.difficulty))) {
    errors.push('Invalid difficulty');
  }

  if (typeof input.group_id !== 'number') {
    errors.push('A group must be selected');
  }

  if (!Array.isArray(input.questions)) {
    errors.push('Questions must be an array');
  } else {
    const qErrors = validateQuestions(input.questions, input.quiz_type as string);
    errors.push(...qErrors);
  }

  if (typeof input.settings !== 'object' || input.settings === null) {
    errors.push('Settings are required');
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation error', details: errors }, { status: 400 });
  }

  // Cover image: prefer explicit value from the body, fall back to the
  // first-question auto-populate for image/intruder types.
  let coverImageUrl: string | null = null;
  if (typeof input.cover_image_url === 'string' && input.cover_image_url.trim().length > 0) {
    coverImageUrl = input.cover_image_url.trim();
  } else if (input.quiz_type === 'image' && Array.isArray(input.questions) && input.questions.length > 0) {
    const firstQ = input.questions[0] as Record<string, unknown>;
    if (typeof firstQ.image_url === 'string') coverImageUrl = firstQ.image_url;
  } else if (input.quiz_type === 'intruder' && Array.isArray(input.questions) && input.questions.length > 0) {
    const firstQ = input.questions[0] as Record<string, unknown>;
    if (Array.isArray(firstQ.options) && firstQ.options.length > 0) {
      const firstOpt = firstQ.options[0] as Record<string, unknown>;
      if (typeof firstOpt.image_url === 'string') coverImageUrl = firstOpt.image_url;
    }
  }

  // Update - do NOT change slug
  const { error: updateError } = await supabase
    .from('quizzes')
    .update({
      group_id: input.group_id as number,
      title: (input.title as string).trim(),
      quiz_type: input.quiz_type as string,
      difficulty: (input.difficulty as string) || undefined,
      questions: input.questions,
      settings: input.settings,
      cover_image_url: coverImageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('Failed to update quiz:', updateError);
    return NextResponse.json({ error: 'Failed to update quiz', detail: updateError.message, code: updateError.code }, { status: 500 });
  }

  return NextResponse.json({ success: true, slug: existing.slug });
}

/**
 * DELETE /api/quiz/[id]
 * Owner-only soft delete (status='removed'), same shape the admin remove uses.
 * Anyone else gets 403; missing auth gets 401. Removed quizzes drop out of
 * browse/sitemap/queries and 404 their slug pages.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from('quizzes')
    .select('id, creator_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
  }
  if (existing.creator_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (existing.status === 'removed') {
    return NextResponse.json({ success: true, alreadyRemoved: true });
  }

  const { error: removeError } = await supabase
    .from('quizzes')
    .update({ status: 'removed', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (removeError) {
    console.error('Failed to delete own quiz:', removeError);
    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
