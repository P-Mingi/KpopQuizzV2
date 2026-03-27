import Link from 'next/link';

import { createServerClient } from '@/lib/supabase/server';
import { UserAvatar } from '@/components/ui/user-avatar';
import { QuizCard } from '@/components/quiz/quiz-card';
import { formatCount } from '@/lib/utils';

import type { Metadata } from 'next';
import type { QuizCardData } from '@/lib/db/types';

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q} | KpopQuizz` : 'Search | KpopQuizz',
    robots: { index: false, follow: true },
  };
}

interface RawSearchQuizRow {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  play_count: number;
  total_score_sum: number;
  total_completions: number;
  like_count: number;
  created_at: string;
  questions: unknown[];
  groups: { name: string; slug: string; display_color: string; text_color: string; fandom_name: string; logo_url: string | null };
  profiles: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string };
}

function toQuizCardData(row: RawSearchQuizRow): QuizCardData {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
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
    question_count: Array.isArray(row.questions) ? row.questions.length : 0,
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps): Promise<React.ReactElement> {
  const { q } = await searchParams;
  const query = q?.trim() ?? '';

  if (query.length < 2) {
    return (
      <div className="py-6">
        <h1 className="text-xl font-medium text-txt-primary mb-4">Search</h1>
        <p className="text-sm text-txt-secondary text-center py-8">Enter at least 2 characters to search.</p>
      </div>
    );
  }

  const supabase = await createServerClient();
  const pattern = `%${query}%`;

  const [quizzesResult, groupsResult, creatorsResult] = await Promise.all([
    supabase
      .from('quizzes')
      .select(`
        id, title, slug, difficulty, play_count, total_score_sum, total_completions, like_count, created_at, questions,
        groups!inner (name, slug, display_color, text_color, fandom_name, logo_url),
        profiles!inner (username, avatar_url, avatar_bg, avatar_text)
      `)
      .eq('status', 'published')
      .ilike('title', pattern)
      .order('play_count', { ascending: false })
      .limit(20),

    supabase
      .from('groups')
      .select('id, name, slug, display_color, text_color, quiz_count')
      .ilike('name', pattern)
      .order('quiz_count', { ascending: false })
      .limit(10),

    supabase
      .from('profiles')
      .select('username, avatar_url, avatar_bg, avatar_text, total_quizzes_created')
      .ilike('username', pattern)
      .gt('total_quizzes_created', 0)
      .order('total_plays_received', { ascending: false })
      .limit(5),
  ]);

  const quizzes = ((quizzesResult.data ?? []) as unknown as RawSearchQuizRow[]).map(toQuizCardData);
  const groups = (groupsResult.data ?? []) as Array<{ id: number; name: string; slug: string; display_color: string; text_color: string; quiz_count: number }>;
  const creators = (creatorsResult.data ?? []) as Array<{ username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string; total_quizzes_created: number }>;

  const hasResults = quizzes.length > 0 || groups.length > 0 || creators.length > 0;

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-txt-primary mb-1">Search results</h1>
      <p className="text-sm text-txt-secondary mb-6">for &quot;{query}&quot;</p>

      {!hasResults && (
        <p className="text-sm text-txt-secondary text-center py-8">No results for &quot;{query}&quot;</p>
      )}

      {/* Quizzes */}
      {quizzes.length > 0 && (
        <div className="mb-8">
          <p className="text-sm font-medium text-txt-primary mb-3">Quizzes ({quizzes.length})</p>
          <div className="space-y-3">
            {quizzes.map((q) => (
              <QuizCard key={q.id} quiz={q} />
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      {groups.length > 0 && (
        <div className="mb-8">
          <p className="text-sm font-medium text-txt-primary mb-3">Groups ({groups.length})</p>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/group/${g.slug}`}
                className="px-4 py-2 rounded-full text-sm font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: g.display_color, color: g.text_color }}
              >
                {g.name} ({g.quiz_count})
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Creators */}
      {creators.length > 0 && (
        <div className="mb-8">
          <p className="text-sm font-medium text-txt-primary mb-3">Creators ({creators.length})</p>
          <div className="space-y-2">
            {creators.map((c) => (
              <Link
                key={c.username}
                href={`/u/${c.username}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-border-light hover:border-border-medium transition-colors"
              >
                <UserAvatar
                  username={c.username}
                  avatarUrl={c.avatar_url}
                  bgColor={c.avatar_bg}
                  textColor={c.avatar_text}
                  size={36}
                />
                <div>
                  <p className="text-sm font-medium text-txt-primary">{c.username}</p>
                  <p className="text-xs text-txt-secondary">{formatCount(c.total_quizzes_created)} quizzes created</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
