import { notFound } from 'next/navigation';

import { getGroupBySlug } from '@/lib/db/queries/groups';
import { getOverriddenFacts } from '@/lib/trivia/facts';
import { TRIVIA_MIN_FACTS } from '@/lib/db/queries/trivia';
import { GroupQuizPage, generateGroupQuizMetadata } from './group-quiz-page';
import { GroupTriviaPage, generateGroupTriviaMetadata } from './group-trivia-page';
import { UX_V1 } from '@/lib/ux-v1';
import { GroupHubV11 } from '@/components/group/ux-v1/hub';

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
// one is what flips this route from Dynamic to ISR: a crawl of a group hub now
// serves cached HTML with ZERO DB work instead of re-rendering every time.
//
// It returns [] on purpose: the PRESENCE of the export is what enables ISR (proven
// - the route builds as `●` and /bts-quiz serves MISS then HIT), while returning no
// params means the build prerenders NOTHING and so makes ZERO DB calls for this
// route. Every hub renders on-demand on first hit and caches thereafter. This is
// deliberate: prerendering the hubs made the build depend on the DB being healthy,
// and under the nano's crawl-load timeouts getGroupBySlug (a hard throw, unlike the
// fail-soft group-hub reads) killed the export. On-demand rendering keeps the build
// DB-independent AND avoids baking a 404 for a real group that timed out at build.
export const revalidate = 3600;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  return [];
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

  // UX v11 (NEXT_PUBLIC_UX_V1, default off): the v11 hub, same metadata, H1, intro,
  // FAQ, JSON-LD and links. Flag off renders exactly today's page. The -trivia
  // pages keep today's content inside the v11 shell.
  if (parsed.type === 'quiz') return UX_V1 ? GroupHubV11({ group }) : GroupQuizPage({ group });
  return GroupTriviaPage({ group });
}
