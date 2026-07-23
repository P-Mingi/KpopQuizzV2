import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

import type { QuizCardData } from '@/lib/db/types';

// Returns the signed-in user's liked quizzes. Hit by the client-side ProfileTabs
// island so the public /u/[username] page never reads cookies and stays
// static/ISR. Owner-only by construction: a user can only fetch their own likes.
export const dynamic = 'force-dynamic';

interface LikedQuizRow {
  created_at: string;
  quizzes: {
    id: string; title: string; slug: string; quiz_type: string; difficulty: string; language?: string;
    play_count: number; total_score_sum: number; total_completions: number; like_count: number;
    created_at: string; questions?: unknown[]; cover_image_url?: string | null;
    groups: { name: string; slug: string; display_color: string; text_color: string; fandom_name: string; logo_url: string | null };
    profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string };
  };
}

function toCard(row: LikedQuizRow): QuizCardData {
  const q = row.quizzes;
  const g = q.groups;
  const p = q.profiles;
  return {
    id: q.id, title: q.title, slug: q.slug,
    quiz_type: q.quiz_type as QuizCardData['quiz_type'],
    difficulty: q.difficulty as QuizCardData['difficulty'],
    language: (q.language as QuizCardData['language']) ?? 'en',
    play_count: q.play_count, total_score_sum: q.total_score_sum,
    total_completions: q.total_completions, like_count: q.like_count ?? 0,
    created_at: q.created_at, group_name: g.name, group_slug: g.slug,
    display_color: g.display_color, text_color: g.text_color, logo_url: g.logo_url,
    fandom_name: g.fandom_name, creator_username: p.username,
    creator_avatar_url: p.avatar_url, creator_avatar_bg: p.avatar_bg,
    creator_avatar_text: p.avatar_text,
    question_count: Array.isArray(q.questions) ? q.questions.length : 0,
    cover_image_url: q.cover_image_url ?? null,
  };
}

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ quizzes: [] });

  const { data } = await supabase
    .from('likes')
    .select(`
      created_at,
      quizzes!inner (
        id, title, slug, quiz_type, difficulty, language, play_count, total_score_sum, total_completions, like_count, created_at, questions, cover_image_url,
        groups!inner (name, slug, display_color, text_color, fandom_name, logo_url),
        profiles!inner (username, avatar_url, avatar_bg, avatar_text)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const quizzes = ((data ?? []) as unknown as LikedQuizRow[]).map(toCard);
  return NextResponse.json({ quizzes });
}
