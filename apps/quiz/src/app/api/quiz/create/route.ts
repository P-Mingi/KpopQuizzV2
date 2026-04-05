import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { generateSlug } from '@/lib/utils';

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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse body
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

  // 3. Validate
  const errors: string[] = [];

  // Title
  if (typeof input.title !== 'string' || input.title.trim().length < 5) {
    errors.push('Title must be at least 5 characters');
  }
  if (typeof input.title === 'string' && input.title.length > 100) {
    errors.push('Title must be at most 100 characters');
  }

  // Quiz type
  const validTypes = ['multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'];
  if (typeof input.quiz_type !== 'string' || !validTypes.includes(input.quiz_type)) {
    errors.push('Invalid quiz type');
  }

  // Difficulty
  const validDifficulties = ['easy', 'medium', 'hard'];
  if (input.difficulty !== undefined && (typeof input.difficulty !== 'string' || !validDifficulties.includes(input.difficulty))) {
    errors.push('Invalid difficulty');
  }

  // Group
  if (input.group_id === undefined && (typeof input.group_name !== 'string' || input.group_name.trim().length < 2)) {
    errors.push('A group must be selected or typed');
  }

  // Questions
  if (!Array.isArray(input.questions)) {
    errors.push('Questions must be an array');
  } else {
    const qErrors = validateQuestions(input.questions, input.quiz_type as string);
    errors.push(...qErrors);
  }

  // Settings
  if (typeof input.settings !== 'object' || input.settings === null) {
    errors.push('Settings are required');
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation error', details: errors }, { status: 400 });
  }

  // 4. Resolve group
  let groupId: number;

  if (typeof input.group_id === 'number') {
    groupId = input.group_id;
  } else {
    const groupName = (input.group_name as string).trim();

    // Check if group already exists (case-insensitive)
    const { data: existingGroup } = await supabase
      .from('groups')
      .select('id')
      .ilike('name', groupName)
      .maybeSingle();

    if (existingGroup) {
      groupId = existingGroup.id;
    } else {
      // Create custom group
      let groupSlug = groupName
        .toLowerCase()
        .replace(/[()]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);

      // Ensure slug uniqueness
      const { data: slugCheck } = await supabase
        .from('groups')
        .select('id')
        .eq('slug', groupSlug)
        .maybeSingle();

      if (slugCheck) {
        let suffix = 2;
        while (true) {
          const candidate = `${groupSlug}-${suffix}`;
          const { data: check } = await supabase
            .from('groups')
            .select('id')
            .eq('slug', candidate)
            .maybeSingle();
          if (!check) {
            groupSlug = candidate;
            break;
          }
          suffix++;
        }
      }

      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName,
          slug: groupSlug,
          fandom_name: 'fan',
          display_color: '#F1EFE8',
          text_color: '#444441',
          is_custom: true,
          needs_review: true,
          created_by_user: true,
        })
        .select('id')
        .single();

      if (groupError) {
        console.error('Failed to create group:', groupError);
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
      }
      groupId = newGroup.id;
    }
  }

  // 5. Generate unique slug
  const title = (input.title as string).trim();
  let slug = generateSlug(title);
  if (!slug) slug = `quiz-${Date.now()}`;

  const { data: slugCheck } = await supabase
    .from('quizzes')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (slugCheck) {
    // Append number suffix
    let suffix = 2;
    let candidateSlug = `${slug}-${suffix}`;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: check } = await supabase
        .from('quizzes')
        .select('id')
        .eq('slug', candidateSlug)
        .maybeSingle();
      if (!check) {
        slug = candidateSlug;
        break;
      }
      suffix++;
      candidateSlug = `${slug}-${suffix}`;
    }
  }

  // 6. Insert quiz
  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert({
      creator_id: user.id,
      group_id: groupId,
      title,
      slug,
      quiz_type: input.quiz_type as string,
      difficulty: (input.difficulty as string) || 'medium',
      questions: input.questions,
      settings: input.settings,
      question_count: (input.questions as unknown[]).length,
    })
    .select('id, slug')
    .single();

  if (quizError) {
    console.error('Failed to create quiz:', quizError);
    return NextResponse.json({ error: 'Failed to create quiz', detail: quizError.message, code: quizError.code, received_quiz_type: input.quiz_type }, { status: 500 });
  }

  // Award XP for creating a quiz
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_quizzes_created')
      .eq('id', user.id)
      .single();

    const isFirst = profile && profile.total_quizzes_created <= 1;
    const xpAmount = isFirst ? 75 : 25; // 25 base + 50 first-time bonus
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_amount: xpAmount,
      p_reason: 'create',
    });
  } catch (err) {
    // XP award is non-critical, don't fail the request
    console.error('Failed to award XP:', err);
  }

  return NextResponse.json({ id: quiz.id, slug: quiz.slug });
}
