import { notFound } from 'next/navigation';

import { getGroupBySlug, getAllGroups } from '@/lib/db/queries/groups';
import { GroupQuizPage, generateGroupQuizMetadata } from './group-quiz-page';
import { GroupTriviaPage, generateGroupTriviaMetadata } from './group-trivia-page';

import type { Metadata } from 'next';

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

const RESERVED_SLUGS = [
  'trending', 'new', 'most-liked', 'terms', 'privacy', 'login', 'settings',
  'admin', 'search', 'onboarding', 'banned', 'create', 'easy-kpop-quizzes',
  'hard-kpop-quizzes', 'kpop-quiz-2026', 'guess-the-kpop-idol', 'kpop-true-or-false',
];

// The child pages (group-quiz-page / group-trivia-page) instantiate the
// Supabase server client, which reads cookies and forces dynamic rendering.
// Setting this explicitly avoids the DYNAMIC_SERVER_USAGE error that happens
// when `generateStaticParams` is combined with a cookie-reading child.
export const dynamic = 'force-dynamic';

/**
 * Pre-build `/{slug}-quiz` and `/{slug}-trivia` for every group that has at
 * least one published quiz. Speeds up initial crawler visits on the most
 * important landing pages; any group added after a deploy is generated
 * on-demand via ISR thanks to the `revalidate = 60` above.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const groups = await getAllGroups();
    return groups
      .filter((g) => g.quiz_count > 0)
      .flatMap((g) => [{ slug: `${g.slug}-quiz` }, { slug: `${g.slug}-trivia` }]);
  } catch {
    // Fallback to on-demand generation if the DB is unreachable at build time.
    return [];
  }
}

function parseSlug(slug: string): { type: 'quiz' | 'trivia'; groupSlug: string } | null {
  if (RESERVED_SLUGS.includes(slug)) return null;
  if (slug.endsWith('-quiz')) return { type: 'quiz', groupSlug: slug.replace(/-quiz$/, '') };
  if (slug.endsWith('-trivia')) return { type: 'trivia', groupSlug: slug.replace(/-trivia$/, '') };
  return null;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) return {};

  const group = await getGroupBySlug(parsed.groupSlug);
  if (!group) return {};

  if (parsed.type === 'quiz') return generateGroupQuizMetadata(group);
  return generateGroupTriviaMetadata(group);
}

export default async function SlugPage({ params }: SlugPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) notFound();

  const group = await getGroupBySlug(parsed.groupSlug);
  if (!group) notFound();

  if (parsed.type === 'quiz') return GroupQuizPage({ group });
  return GroupTriviaPage({ group });
}
