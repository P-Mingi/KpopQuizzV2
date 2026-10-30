// Daily games step 2 (RAPPORT-JEUX-DU-JOUR-v2.md 7.1): /credits on bunnyverse.org, the hub build only (the (hub) layout is a 404 elsewhere).
// Every licensed photo the site shows with its author, its licence and its source page, read from the public views of migration 022
// (verified pictures and live banners only; lib/photos/public-read.ts), the names of the characters as OtakuQuiz prints them (no spoiler).
// The footer of the hub already links here (components/layout/ux-v1/ux-footer.tsx). Server-rendered, ISR: the reads are cached and fail
// closed (no row, no error page). Indexing follows NET_INDEXING like every hub page (robotsFor), and the page is noindex while it lists
// nothing (an empty page is never offered to search engines). English only: the hub has no French routes yet (/fr/credits waits for the
// French pages of the Burrow).
import { HubCreditsPage, CREDITS_DESCRIPTION, CREDITS_TITLE, creditSections } from '@/components/hub/credits/hub-credits';
import { getCreditNames } from '@/lib/anime/entity-images-read';
import { getLiveAssets, getPublicPictures } from '@/lib/photos/public-read';
import { robotsFor } from '@/lib/site/indexing';
import { SITE } from '@/lib/site/registry';

import type { Metadata } from 'next';

export const revalidate = 300;

async function sections(): Promise<ReturnType<typeof creditSections>> {
  const [pictures, assets] = await Promise.all([getPublicPictures(), getLiveAssets()]);
  const names = pictures.some((p) => p.kind === 'character' || p.kind === 'series')
    ? await getCreditNames().catch(() => ({ series: {}, character: {} }))
    : { series: {}, character: {} };
  return creditSections(pictures, assets, names.character, names.series);
}

export async function generateMetadata(): Promise<Metadata> {
  const listed = (await sections()).length > 0;
  return {
    title: CREDITS_TITLE,
    description: CREDITS_DESCRIPTION,
    alternates: { canonical: '/credits' },
    robots: robotsFor(listed),
    openGraph: { title: `${CREDITS_TITLE} | ${SITE.brand.name}`, description: CREDITS_DESCRIPTION, url: `${SITE.url}/credits`, siteName: SITE.brand.name, type: 'website' },
  };
}

export default async function HubCredits(): Promise<React.ReactElement> {
  return <HubCreditsPage sections={await sections()} />;
}
