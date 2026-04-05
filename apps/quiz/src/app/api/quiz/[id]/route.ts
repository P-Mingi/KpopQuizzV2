import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

function validateQuestions(questions: unknown[], quizType: string): string[] {
  const errors: string[] = [];
  if (questions.length < 5) errors.push('Minimum 5 questions required');
  if (questions.length > 20) errors.push('Maximum 20 questions allowed');

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown>;
    if (!q || typeof q.question !== 'string' || q.question.trim().length === 0) {
      errors.push(`Question ${i + 1}: question text is required`);
      continue;
    }
    if (q.question.length > 500) {
      errors.push(`Question ${i + 1}: question text must be 500 characters or less`);
    }

    if (quizType === 'multiple_choice' || quizType === 'guess_from_clues' || quizType === 'image') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`Question ${i + 1}: must have 4 options`);
      } else {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j];
          if (typeof opt !== 'string' || opt.trim().length === 0) {
            errors.push(`Question ${i + 1}: option ${j + 1} is required`);
          } else if (opt.length > 200) {
            errors.push(`Question ${i + 1}: option ${j + 1} must be 200 characters or less`);
          }
        }
      }
      if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
        errors.push(`Question ${i + 1}: correct answer index must be 0-3`);
      }
      if (quizType === 'image' && (typeof q.image_url !== 'string' || q.image_url.trim().length === 0)) {
        errors.push(`Question ${i + 1}: image_url is required`);
      }
    }

    if (quizType === 'intruder') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push(`Question ${i + 1}: must have 4 options`);
      } else {
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j] as Record<string, unknown>;
          if (!opt || typeof opt.label !== 'string' || opt.label.trim().length === 0) {
            errors.push(`Question ${i + 1}: option ${j + 1} label is required`);
          }
          if (!opt || typeof opt.image_url !== 'string' || opt.image_url.trim().length === 0) {
            errors.push(`Question ${i + 1}: option ${j + 1} image_url is required`);
          }
        }
      }
      if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
        errors.push(`Question ${i + 1}: correct answer index must be 0-3`);
      }
    }

    if (quizType === 'true_false') {
      if (typeof q.correct !== 'boolean') {
        errors.push(`Question ${i + 1}: correct must be true or false`);
      }
    }

    if (quizType === 'guess_from_clues') {
      if (!Array.isArray(q.clues) || q.clues.length !== 3) {
        errors.push(`Question ${i + 1}: must have 3 clues`);
      } else {
        for (let j = 0; j < q.clues.length; j++) {
          const clue = q.clues[j];
          if (typeof clue !== 'string' || clue.trim().length === 0) {
            errors.push(`Question ${i + 1}: clue ${j + 1} is required`);
          }
        }
      }
    }

    if (q.fun_fact !== undefined && typeof q.fun_fact === 'string' && q.fun_fact.length > 280) {
      errors.push(`Question ${i + 1}: fun fact must be 280 characters or less`);
    }
  }

  return errors;
}

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
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('Failed to update quiz:', updateError);
    return NextResponse.json({ error: 'Failed to update quiz', detail: updateError.message, code: updateError.code }, { status: 500 });
  }

  return NextResponse.json({ success: true, slug: existing.slug });
}
