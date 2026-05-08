import { ImageResponse } from 'next/og';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { EditorialTemplate } from '@/lib/pinterest/templates/EditorialTemplate';
import { NeonStageTemplate } from '@/lib/pinterest/templates/NeonStageTemplate';
import { Y2KTemplate } from '@/lib/pinterest/templates/Y2KTemplate';

import type { NextRequest } from 'next/server';

const TEMPLATES = {
  editorial: EditorialTemplate,
  neon: NeonStageTemplate,
  y2k: Y2KTemplate,
} as const;

type Variant = keyof typeof TEMPLATES;

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const quizId = searchParams.get('quizId');
  const variant = (searchParams.get('variant') || 'editorial') as Variant;

  if (!quizId || !TEMPLATES[variant]) {
    return new Response('Bad params', { status: 400 });
  }

  const db = createServiceRoleClient();

  const { data: quiz } = await db
    .from('quizzes')
    .select('id, title, slug, difficulty, question_count, pinterest_background_image_url, groups!inner(name, display_color)')
    .eq('id', quizId)
    .single();

  if (!quiz) {
    return new Response('Not found', { status: 404 });
  }

  const row = quiz as unknown as {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    question_count: number;
    pinterest_background_image_url: string | null;
    groups: { name: string; display_color: string };
  };

  const Template = TEMPLATES[variant];

  return new ImageResponse(
    (
      <Template
        title={row.title}
        subtitle={subtitleFor(row)}
        group={row.groups.name}
        questions={row.question_count}
        difficulty={row.difficulty}
        backgroundImage={row.pinterest_background_image_url}
        themeColor={row.groups.display_color || '#D4537E'}
      />
    ),
    { width: 1000, height: 1500 },
  );
}

function subtitleFor(quiz: { title: string; groups: { name: string } }): string {
  const t = quiz.title.toLowerCase();
  if (t.includes('lyric')) return 'Can you finish every line?';
  if (t.includes('era')) return 'Spot the comeback from a single frame';
  if (t.includes('mv') || t.includes('music video')) return 'Name it from the first second';
  if (t.includes('member')) return 'How well do you know the lineup?';
  if (t.includes('song') || t.includes('track')) return 'Name the track from a single clue';
  return `Test your ${quiz.groups.name || 'K-pop'} knowledge`;
}
