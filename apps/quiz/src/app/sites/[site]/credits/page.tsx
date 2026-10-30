// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/[slug]/page.tsx, rows 42 and H-11: /credits of OtakuQuiz and of bunnyverse.org, one
// page file for both sites (as legal/page.tsx serves rows 26d and H-10). Why one file at the root of app/sites/[site]: two files in the two
// route groups would be one path (/sites/[site]/credits), and a static (hub)/credits beside the anime (anime)/[slug] took /credits from
// OtakuQuiz (a static segment wins over a dynamic one, then the (hub) layout is a 404 off the hub). The page chooses by SITE_ID:
// - anime: the photo credits of OtakuQuiz (components/anime/credits-page.tsx, the bundled photos and the owner's uploads), as the [slug]
//   page served them before, with the same title, description, robots and canonical;
// - hub: the licensed photos of bunnyverse.org (daily games step 2, RAPPORT-JEUX-DU-JOUR-v2.md 7.1; components/hub/credits/hub-credits.tsx),
//   read from the public views of migration 022 (verified pictures and live banners only; lib/photos/public-read.ts), the names of the
//   characters as OtakuQuiz prints them (no spoiler). The footer's Credits link (shown where the route exists) appears on the hub. Noindex
//   while it lists nothing; NET_INDEXING like every hub page otherwise (robotsFor). English only: /fr/credits waits for the French pages
//   of the Burrow;
// - any other build: a 404 (TWINS.md rule 3: a file serves only the sites of its rows; kpopquiz.org has no /credits).
// Server-rendered, ISR: the reads are cached and fail closed (no row, no error page).
import { notFound } from 'next/navigation';

import { CREDITS_DESCRIPTION as ANIME_DESCRIPTION, CREDITS_PATH, CREDITS_TITLE as ANIME_TITLE, CreditsPage } from '@/components/anime/credits-page';
import { CREDITS_DESCRIPTION as HUB_DESCRIPTION, CREDITS_TITLE as HUB_TITLE, HubCreditsPage, creditSections } from '@/components/hub/credits/hub-credits';
import { getCreditNames, getOwnerCreditRows } from '@/lib/anime/entity-images-read';
import { getLiveAssets, getPublicPictures } from '@/lib/photos/public-read';
import { robotsFor } from '@/lib/site/indexing';
import { SITE, SITE_ID } from '@/lib/site/registry';

import type { Metadata } from 'next';

// The hub's period (its reads are cached for one and five minutes); the anime page renders under the [site] layout's one-minute read
// as before, so its pages still refresh within the minute.
export const revalidate = 300;

async function hubSections(): Promise<ReturnType<typeof creditSections>> {
  const [pictures, assets] = await Promise.all([getPublicPictures(), getLiveAssets()]);
  const names = pictures.some((p) => p.kind === 'character' || p.kind === 'series')
    ? await getCreditNames().catch(() => ({ series: {}, character: {} }))
    : { series: {}, character: {} };
  return creditSections(pictures, assets, names.character, names.series);
}

export async function generateMetadata(): Promise<Metadata> {
  if (SITE_ID === 'anime') return { title: ANIME_TITLE, description: ANIME_DESCRIPTION, robots: robotsFor(true), alternates: { canonical: CREDITS_PATH } };
  if (SITE_ID !== 'hub') notFound();
  const listed = (await hubSections()).length > 0;
  return {
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
    alternates: { canonical: CREDITS_PATH },
    robots: robotsFor(listed),
    openGraph: {
      title: `${HUB_TITLE} | ${SITE.brand.name}`, description: HUB_DESCRIPTION, url: `${SITE.url}${CREDITS_PATH}`, siteName: SITE.brand.name, type: 'website',
      images: [{ url: SITE.brand.ogTemplate, width: 1200, height: 630, alt: SITE.brand.name }],
    },
  };
}

export default async function Credits(): Promise<React.ReactElement> {
  if (SITE_ID === 'anime') return CreditsPage({ owner: await getOwnerCreditRows() });
  if (SITE_ID !== 'hub') notFound();
  return <HubCreditsPage sections={await hubSections()} />;
}
