// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/[slug]/page.tsx, rows 3, 4, 5: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { SITE_ID as O1_SITE_ID } from '@/lib/site/registry';
import { notFound } from 'next/navigation';

import { getGroupBySlug } from '@/lib/db/queries/groups';
import { TRIVIA_MIN_FACTS } from '@/lib/db/queries/trivia';
import { GroupQuizPage } from '@/app/(site)/[slug]/group-quiz-page';
import { GroupTriviaPage } from '@/app/(site)/[slug]/group-trivia-page';
import { UX_V1 } from '@/lib/ux-v1';
import { GroupHubV11 } from '@/components/group/ux-v1/hub';
import { CREDITS_DESCRIPTION, CREDITS_PATH, CREDITS_TITLE, CreditsPage } from '@/components/anime/credits-page';
import { buildMixSlots, buildSeriesSlots, buildTriviaVariant } from '@/components/anime/series-hub-slots';
import { getOwnerCharacterPictures, getOwnerCreditRows } from '@/lib/anime/entity-images-read';
import { getRelatedSeries, getSeriesHub } from '@/lib/anime/series';
import { getSeriesHubSlugs } from '@/lib/anime/directory';
import { mixHubMetadata, seriesHubMetadata, seriesTriviaMetadata, uniqueFacts } from '@/lib/anime/series-model';
import { ANIME_MIX_SLUG } from '@/lib/anime/types';
import { robotsFor } from '@/lib/site/indexing';
import { SITE } from '@/lib/site/registry';

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

// /credits (run O1, IMG): the page of the photo credits is served by this file, as the one dynamic segment of the anime build, because
// twins.json lists no row for a new screen file. Reserved as a slug: no series can take it (a hub slug ends in -quiz or -trivia).
const CREDITS_SLUG = CREDITS_PATH.slice(1);

function parseSlug(slug: string): { type: 'quiz' | 'trivia'; groupSlug: string } | null {
  if (RESERVED_SLUGS.includes(slug)) return null;
  if (slug.endsWith('-quiz')) return { type: 'quiz', groupSlug: slug.replace(/-quiz$/, '') };
  if (slug.endsWith('-trivia')) return { type: 'trivia', groupSlug: slug.replace(/-trivia$/, '') };
  return null;
}

// The anime hub is the series hub: /{series}-quiz and /{series}-trivia read the series (lib/anime/series.ts) and fill the
// slots of the shared hub and trivia components; /anime-mix-quiz is the hub of the whole catalog. A missing, unpublished
// or unreadable series is a true 404. ?arc, ?q, ?role and ?progress never change the canonical (the clean URL).
export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === CREDITS_SLUG) return { title: CREDITS_TITLE, description: CREDITS_DESCRIPTION, robots: robotsFor(true), alternates: { canonical: CREDITS_PATH } };
  const parsed = parseSlug(slug);
  if (!parsed) return {};

  if (parsed.type === 'quiz' && parsed.groupSlug === ANIME_MIX_SLUG) {
    const mix = await getGroupBySlug(parsed.groupSlug);
    return mix ? mixHubMetadata(mix, SITE.url, SITE.brand.name) : {};
  }

  // generateMetadata resolves BEFORE the page body streams (the root loading.tsx shell would otherwise commit a 200), so
  // notFound() here, for a missing series or a series under the trivia floor, yields a TRUE 404 instead of a soft-404.
  const hub = await getSeriesHub(parsed.groupSlug);
  if (!hub) notFound();

  if (parsed.type === 'quiz') return seriesHubMetadata(hub, SITE.url, SITE.brand.name);

  const facts = uniqueFacts(hub.trivia);
  if (facts.length < TRIVIA_MIN_FACTS) notFound();
  return seriesTriviaMetadata(hub, facts.length, SITE.url, SITE.brand.name);
}

export default async function SlugPage({ params }: SlugPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  if (slug === CREDITS_SLUG) return CreditsPage({ owner: await getOwnerCreditRows() });
  const parsed = parseSlug(slug);
  if (!parsed) notFound();
  const site = { origin: SITE.url, brand: SITE.brand.name };

  if (parsed.type === 'quiz' && parsed.groupSlug === ANIME_MIX_SLUG) {
    const mix = await getGroupBySlug(parsed.groupSlug);
    if (!mix) notFound();
    return UX_V1 ? GroupHubV11({ group: mix, slots: buildMixSlots(mix, site) }) : GroupQuizPage({ group: mix });
  }

  const hub = await getSeriesHub(parsed.groupSlug);
  if (!hub) notFound();

  // UX v11 (NEXT_PUBLIC_UX_V1, always on for this site): the shared hub with the anime blocks in its slots. The -trivia
  // page is the shared trivia page fed with the series' stored, sourced facts; under TRIVIA_MIN_FACTS it is a 404.
  if (parsed.type === 'quiz') {
    if (!UX_V1) return GroupQuizPage({ group: hub.group });
    const related = await getRelatedSeries(hub.group.id);
    const portraits = await getOwnerCharacterPictures(hub.group.slug);
    return GroupHubV11({ group: hub.group, slots: buildSeriesSlots(hub, related, site, portraits) });
  }
  return GroupTriviaPage({ group: hub.group, variant: buildTriviaVariant(hub, site) });
}

// Run O1: a child of app/sites/[site] returns its params with the parent's site, and nothing on the kpop build
// (the [site] layout generates no site there and refuses params without one). The parent layout has dynamicParams off,
// so the anime hubs are the slugs of the site's published series, read at build time (lib/anime/directory.ts).
export async function generateStaticParams({ params }: { params?: { site?: string } } = {}): Promise<Array<Record<string, string>>> {
  if (O1_SITE_ID === 'kpop' || !params?.site) return [];
  return [CREDITS_SLUG, ...(await getSeriesHubSlugs())].map((slug) => ({ slug, site: params.site as string }));
}
