import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { QuizCardData, QuizWithGroup } from '@/lib/db/types';

const QUIZ_CARD_SELECT = `
  id, title, slug, quiz_type, difficulty, play_count, total_score_sum, total_completions, like_count, question_count, created_at, cover_image_url,
  groups!inner (name, slug, display_color, text_color, fandom_name, logo_url),
  profiles!inner (username, avatar_url, avatar_bg, avatar_text)
`;

const QUIZ_FULL_SELECT = `
  *,
  groups!inner (name, slug, display_color, text_color, fandom_name, logo_url),
  profiles!inner (username, avatar_url, avatar_bg, avatar_text)
`;

interface RawQuizRow {
  id: string;
  title: string;
  slug: string;
  quiz_type: string;
  difficulty: string;
  play_count: number;
  total_score_sum: number;
  total_completions: number;
  like_count: number;
  question_count: number;
  created_at: string;
  cover_image_url: string | null;
  questions?: unknown[];
  groups: { name: string; slug: string; display_color: string; text_color: string; fandom_name: string; logo_url: string | null };
  profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string };
  [key: string]: unknown;
}

function toQuizCardData(row: RawQuizRow): QuizCardData {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    quiz_type: row.quiz_type as QuizCardData['quiz_type'],
    difficulty: row.difficulty as QuizCardData['difficulty'],
    play_count: row.play_count,
    total_score_sum: row.total_score_sum,
    total_completions: row.total_completions,
    like_count: row.like_count ?? 0,
    created_at: row.created_at,
    group_name: row.groups.name,
    group_slug: row.groups.slug,
    display_color: row.groups.display_color,
    text_color: row.groups.text_color,
    logo_url: row.groups.logo_url,
    fandom_name: row.groups.fandom_name,
    creator_username: row.profiles.username,
    creator_avatar_url: row.profiles.avatar_url,
    creator_avatar_bg: row.profiles.avatar_bg,
    creator_avatar_text: row.profiles.avatar_text,
    question_count: row.question_count ?? 0,
    cover_image_url: row.cover_image_url ?? null,
  };
}

export async function getQuizBySlug(slug: string): Promise<QuizWithGroup | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_FULL_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch quiz: ${error.message}`);
  }

  const row = data as unknown as RawQuizRow;
  return {
    ...data,
    group_name: row.groups.name,
    group_slug: row.groups.slug,
    display_color: row.groups.display_color,
    text_color: row.groups.text_color,
    logo_url: row.groups.logo_url,
    fandom_name: row.groups.fandom_name,
    creator_username: row.profiles.username,
    creator_avatar_url: row.profiles.avatar_url,
    creator_avatar_bg: row.profiles.avatar_bg,
    creator_avatar_text: row.profiles.avatar_text,
  } as QuizWithGroup;
}

export async function getQuizById(id: string): Promise<QuizWithGroup | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_FULL_SELECT)
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to fetch quiz: ${error.message}`);
  }

  const row = data as unknown as RawQuizRow;
  return {
    ...data,
    group_name: row.groups.name,
    group_slug: row.groups.slug,
    display_color: row.groups.display_color,
    text_color: row.groups.text_color,
    logo_url: row.groups.logo_url,
    fandom_name: row.groups.fandom_name,
    creator_username: row.profiles.username,
    creator_avatar_url: row.profiles.avatar_url,
    creator_avatar_bg: row.profiles.avatar_bg,
    creator_avatar_text: row.profiles.avatar_text,
  } as QuizWithGroup;
}

export async function getAllQuizzes(offset: number, limit: number): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch all quizzes: ${error.message}`);
  return (data as unknown as RawQuizRow[]).map(toQuizCardData);
}

export async function getTrendingQuizzes(offset: number, limit: number): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  // Try last 7 days first
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .gte('created_at', sevenDaysAgo)
    .order('play_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch trending quizzes: ${error.message}`);

  // If fewer than limit from 7 days, try 30 days
  if ((data as unknown[]).length < limit && offset === 0) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: extendedData, error: extendedError } = await supabase
      .from('quizzes')
      .select(QUIZ_CARD_SELECT)
      .eq('status', 'published')
      .gte('created_at', thirtyDaysAgo)
      .order('play_count', { ascending: false })
      .range(offset, offset + limit - 1);

    if (extendedError) throw new Error(`Failed to fetch trending quizzes: ${extendedError.message}`);
    return (extendedData as unknown as RawQuizRow[]).map(toQuizCardData);
  }

  return (data as unknown as RawQuizRow[]).map(toQuizCardData);
}

export async function getNewQuizzes(offset: number, limit: number): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch new quizzes: ${error.message}`);
  return (data as unknown as RawQuizRow[]).map(toQuizCardData);
}

export async function getHardestQuizzes(offset: number, limit: number): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .gte('total_completions', 10)
    .order('difficulty', { ascending: false })
    .order('total_completions', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch hardest quizzes: ${error.message}`);

  // Sort by avg score ascending client-side (Supabase can't do computed column sorting)
  const cards = (data as unknown as RawQuizRow[]).map(toQuizCardData);
  cards.sort((a, b) => {
    const avgA = a.total_completions > 0 && a.question_count > 0
      ? (a.total_score_sum / a.total_completions) / a.question_count * 100
      : 50;
    const avgB = b.total_completions > 0 && b.question_count > 0
      ? (b.total_score_sum / b.total_completions) / b.question_count * 100
      : 50;
    return avgA - avgB;
  });

  return cards;
}

export async function getMostLikedQuizzes(offset: number, limit: number): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .gt('like_count', 0)
    .order('like_count', { ascending: false })
    .order('play_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch most liked quizzes: ${error.message}`);
  return (data as unknown as RawQuizRow[]).map(toQuizCardData);
}

export async function getQuizzesByGroup(
  groupId: number,
  tab: 'popular' | 'newest' | 'most_liked' | 'hardest',
  offset: number,
  limit: number,
): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .eq('group_id', groupId);

  if (tab === 'popular') {
    query = query.order('play_count', { ascending: false });
  } else if (tab === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (tab === 'most_liked') {
    query = query.gt('like_count', 0).order('like_count', { ascending: false }).order('play_count', { ascending: false });
  } else {
    query = query.gte('total_completions', 10).order('difficulty', { ascending: false });
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch group quizzes: ${error.message}`);

  const cards = (data as unknown as RawQuizRow[]).map(toQuizCardData);

  if (tab === 'hardest') {
    cards.sort((a, b) => {
      const avgA = a.total_completions > 0 && a.question_count > 0
        ? (a.total_score_sum / a.total_completions) / a.question_count * 100
        : 50;
      const avgB = b.total_completions > 0 && b.question_count > 0
        ? (b.total_score_sum / b.total_completions) / b.question_count * 100
        : 50;
      return avgA - avgB;
    });
  }

  return cards;
}

export async function getQuizzesByCreator(
  creatorId: string,
  offset: number,
  limit: number,
): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch creator quizzes: ${error.message}`);
  return (data as unknown as RawQuizRow[]).map(toQuizCardData);
}

export async function getQuizzesByDifficulty(
  difficulty: 'easy' | 'medium' | 'hard',
  offset: number,
  limit: number,
): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .eq('difficulty', difficulty)
    .order('play_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch ${difficulty} quizzes: ${error.message}`);
  return (data as unknown as RawQuizRow[]).map(toQuizCardData);
}

export async function getQuizzesByYear(
  year: number,
  offset: number,
  limit: number,
): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch ${year} quizzes: ${error.message}`);
  return (data as unknown as RawQuizRow[]).map(toQuizCardData);
}

export async function getQuizzesByType(
  quizType: 'multiple_choice' | 'true_false' | 'guess_from_clues',
  offset: number,
  limit: number,
): Promise<QuizCardData[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .eq('quiz_type', quizType)
    .order('play_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to fetch ${quizType} quizzes: ${error.message}`);
  return (data as unknown as RawQuizRow[]).map(toQuizCardData);
}

export async function getQuizOfTheDay(): Promise<QuizCardData | null> {
  const admin = createServiceRoleClient();
  const today = new Date().toISOString().split('T')[0]!;

  // Atomically publish today's bank quiz if not yet done (no cron needed)
  await admin.rpc('ensure_daily_quiz', { p_date: today });

  const { data, error } = await admin
    .from('quizzes')
    .select(QUIZ_CARD_SELECT)
    .eq('status', 'published')
    .eq('is_quiz_of_the_day', true)
    .eq('quiz_of_the_day_date', today)
    .maybeSingle();

  if (error) {
    console.error('[getQuizOfTheDay]', error.message);
    return null;
  }
  if (data) return toQuizCardData(data as unknown as RawQuizRow);

  return null;
}

export async function checkSlugExists(slug: string): Promise<boolean> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quizzes')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to check slug: ${error.message}`);
  return data !== null;
}
