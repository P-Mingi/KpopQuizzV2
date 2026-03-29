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
    .select('questions, settings, quiz_type')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 });
  }

  const settings = data.settings as { timer: boolean; timer_seconds: number; shuffle: boolean; show_answers: boolean };
  let questions = data.questions as Array<{
    question: string;
    options: string[];
    correct: number | boolean;
    fun_fact?: string;
    clues?: string[];
  }>;

  // Shuffle questions if enabled
  if (settings.shuffle) {
    questions = [...questions];
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j]!, questions[i]!];
    }

    // Shuffle options within each question and update correct index
    questions = questions.map((q) => {
      const optionIndices = q.options.map((_, idx) => idx);
      for (let i = optionIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionIndices[i], optionIndices[j]] = [optionIndices[j]!, optionIndices[i]!];
      }

      const newOptions = optionIndices.map((idx) => q.options[idx]!);

      // For true/false quizzes, correct is a boolean - shuffle options but keep the boolean as-is
      const newCorrect = typeof q.correct === 'boolean'
        ? q.correct
        : optionIndices.indexOf(q.correct);

      return { ...q, options: newOptions, correct: newCorrect };
    });
  }

  return NextResponse.json({ questions, settings, quiz_type: data.quiz_type as string });
}
