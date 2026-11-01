// Daily games step 4, row 50: /fr/credits, the French twin of /credits (RAPPORT-JEUX-DU-JOUR-v2.md section 2). It opens with the flag, in the frame of the French pages of the Terrier. Noindex while it lists nothing. With the flag off: a 404, as any unknown URL.
import { notFound } from 'next/navigation';

import { HubCreditsPage, creditSections } from '@/components/hub/credits/hub-credits';
import { DleChrome } from '@/components/hub/dle/dle-chrome';
import { getCreditNames } from '@/lib/anime/entity-images-read';
import { CREDITS_FR, dleAlternates, dleRobots } from '@/lib/dle/seo';
import { getLiveAssets, getPublicPictures } from '@/lib/photos/public-read';
import { dleOpen } from '@/lib/site/hub/daily-guess';

import type { Metadata } from 'next';

export const revalidate = 60;

async function sections(): Promise<ReturnType<typeof creditSections>> {
  const [pictures, assets] = await Promise.all([getPublicPictures(), getLiveAssets()]);
  const names = pictures.some((p) => p.kind === 'character' || p.kind === 'series')
    ? await getCreditNames().catch(() => ({ series: {}, character: {} }))
    : { series: {}, character: {} };
  return creditSections(pictures, assets, names.character, names.series, 'fr');
}

export async function generateMetadata(): Promise<Metadata> {
  if (!dleOpen()) notFound();
  return { title: CREDITS_FR.title, description: CREDITS_FR.description, alternates: dleAlternates('/credits', 'fr'), robots: dleRobots('fr', (await sections()).length > 0) };
}

export default async function Page(): Promise<React.ReactElement> {
  if (!dleOpen()) notFound();
  return (
    <DleChrome locale="fr" enPath="/credits">
      <main id="main" tabIndex={-1} className="hub-dle-creditsmain"><HubCreditsPage sections={await sections()} locale="fr" /></main>
    </DleChrome>
  );
}
