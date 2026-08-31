import { notFound } from 'next/navigation';

import { getGroupBySlug } from '@/lib/db/queries/groups';
import { getOverriddenFacts } from '@/lib/trivia/facts';
import { TRIVIA_MIN_FACTS } from '@/lib/db/queries/trivia';
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

// ISR: revalidate the cached HTML hourly (SEO Fix 1). The child pages
// (group-quiz-page / group-trivia-page) instantiate the Supabase server client,
// which reads cookies - and so does the shared <TopNav> - so these routes render
// dynamically (SSR) today and this window stays dormant until those reads are
// made cookie-free. `generateStaticParams` is intentionally omitted: combined
// with the cookie-reading children it triggers DYNAMIC_SERVER_USAGE at build.
export const revalidate = 3600;

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

  // Trivia eligibility gate at the route level. generateMetadata resolves
  // BEFORE the page body streams (the root loading.tsx shell would otherwise
  // commit a 200), so calling notFound() here for an ineligible / suppressed
  // group yields a TRUE 404 instead of a soft-404. getOverriddenFacts is
  // cache()'d, so the page render below reuses this result with no extra query.
  const facts = await getOverriddenFacts(group.id, group.slug);
  if (facts.length < TRIVIA_MIN_FACTS) notFound();

  return generateGroupTriviaMetadata(group, facts.length);
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
