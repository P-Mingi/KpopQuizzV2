import { notFound } from 'next/navigation';

import { getGroupBySlug, getAllGroups } from '@/lib/db/queries/groups';
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

// ISR: revalidate the cached HTML hourly (SEO Fix 1).
//
// FREE-VIABILITY: the child pages' reads are now cookie-free (getGroupBySlug and
// the group-hub queries moved to createPublicReadClient + unstable_cache), and the
// shared <TopNav> was already cookie-free, so the DYNAMIC_SERVER_USAGE that once
// forced this route dynamic is gone. A dynamic route segment renders per-request
// (Cache-Control: no-store) UNLESS it declares generateStaticParams, so declaring
// it is what actually flips this route from Dynamic to ISR - a crawl of a group hub
// now serves cached HTML with ZERO DB work instead of re-rendering every time. We
// prerender the busiest hubs (top group `-quiz` pages by quiz_count) and let every
// other slug (including all `-trivia`) fall to on-demand ISR via the default
// dynamicParams. Fail-soft to [] so a saturated DB never fails the build.
export const revalidate = 3600;

const PRERENDER_TOP_HUBS = 24;
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const groups = await getAllGroups(); // cached, cookie-free, sorted by quiz_count desc
    return groups.slice(0, PRERENDER_TOP_HUBS).map((g) => ({ slug: `${g.slug}-quiz` }));
  } catch (err) {
    console.warn('[[slug]] generateStaticParams failed - on-demand ISR only:', (err as Error)?.message ?? err);
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
