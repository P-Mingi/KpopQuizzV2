// Daily games step 4, row 50: /fr/credits, the French twin of /credits (RAPPORT-JEUX-DU-JOUR-v2.md section 2). It opens with the flag, in the frame of the French pages of the Terrier. CR-021: a 404 as any unknown URL while no image needs a credit. With the flag off: a 404 too.
import { notFound } from 'next/navigation';

import { CardsCreditsSection } from '@/components/cards/credits-section';
import { HubCreditsPage, creditSections } from '@/components/hub/credits/hub-credits';
import { DleChrome } from '@/components/hub/dle/dle-chrome';
import { getCreditNames } from '@/lib/anime/entity-images-read';
import { getKpopdleIdolPictures } from '@/lib/dle/idol-pictures-read';
import { CREDITS_FR, dleAlternates, dleRobots } from '@/lib/dle/seo';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { cardCreditRows } from '@/lib/cards/ui-credit';
import { cardsOn } from '@/lib/cards/ui-flag';
import { getLiveAssets, getPublicPictures } from '@/lib/photos/public-read';
import { dleOpen } from '@/lib/site/hub/daily-guess';

import type { Metadata } from 'next';

export const revalidate = 60;

async function sections(): Promise<ReturnType<typeof creditSections>> {
  const [shown, assets, idolSet] = await Promise.all([getPublicPictures(), getLiveAssets(), getKpopdleIdolPictures()]);
  // The KpopCards photos that stand on the tiles of Kpopdle (only the ones that need a credit, only where no trivia picture comes first).
  const pictures = [...shown, ...idolSet.credits];
  const names = pictures.some((p) => p.kind === 'character' || p.kind === 'series')
    ? await getCreditNames().catch(() => ({ series: {}, character: {} }))
    : { series: {}, character: {} };
  return creditSections(pictures, assets, names.character, names.series, 'fr');
}

/** The same Cards section as /credits (SEO-LAUNCH-1, rule 10.5: declared equivalents hold the same sections; the section's own text stays English, like the names and licences it lists). */
async function cardCredits(): Promise<ReturnType<typeof cardCreditRows>> {
  if (!cardsOn()) return [];
  const cat = await loadCatalog().catch(() => null);
  return cat ? cardCreditRows(cat) : [];
}

export async function generateMetadata(): Promise<Metadata> {
  if (!dleOpen()) notFound();
  // 404 only when /credits is too: it lists the photos of the games or the cards.
  if ((await sections()).length === 0 && (await cardCredits()).length === 0) notFound();
  return { title: CREDITS_FR.title, description: CREDITS_FR.description, alternates: dleAlternates('/credits', 'fr'), robots: dleRobots('fr', true) };
}

export default async function Page(): Promise<React.ReactElement> {
  if (!dleOpen()) notFound();
  const [listed, cards] = await Promise.all([sections(), cardCredits()]);
  if (listed.length === 0 && cards.length === 0) notFound();
  return (
    <DleChrome locale="fr" enPath="/credits">
      <main id="main" tabIndex={-1} className="hub-dle-creditsmain"><HubCreditsPage sections={listed} locale="fr" extra={cards.length > 0 ? <CardsCreditsSection rows={cards} /> : null} /></main>
    </DleChrome>
  );
}
