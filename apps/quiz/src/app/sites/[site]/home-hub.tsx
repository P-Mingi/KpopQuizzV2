// Run O1, lot H2a: the home of the hub build (bunnyverse.org, /): the new Bunnyverse home of docs/o1/design/fanquiz-hub/. The page is the
// composition of components/hub/home/*; each block reads its data from one loader of lib/site/hub/home-*.ts (lot H2c: the real data of
// lib/site/hub/data/, a block with no data is left out). The one indexable page of the hub: title, description and canonical from the copy and the registry, JSON-LD WebSite
// and the Hot now ItemList. Styles: styles/sites/hub/h2.css (classes hub-h2-*).
// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): two columns, images first; the images of the slots come from
// site_assets (empty until step 2), the quizzes of the day the fan finished today from their plays, the Burrow stays hidden until the
// dailyGuess flag is on and its pages exist.
import { HomePage } from '@/components/hub/home/home-page';
import { ht } from '@/lib/site/hub/copy';
import { burrowOpen } from '@/lib/site/hub/daily-guess';
import { loadHomeAssets } from '@/lib/site/hub/home-assets';
import { loadHomeCrossover } from '@/lib/site/hub/home-crossover';
import { loadHomeDone } from '@/lib/site/hub/home-done';
import { loadHomeDoors } from '@/lib/site/hub/home-doors';
import { loadHomeHot } from '@/lib/site/hub/home-hot';
import { loadHomeQuick } from '@/lib/site/hub/home-quick';
import { loadHomeToday } from '@/lib/site/hub/home-today';
import { loadHomeTopFans } from '@/lib/site/hub/home-topfans';
import { loadHomeSession } from '@/lib/site/hub/home-viewer';
import { loadHomeSurprise } from '@/lib/site/hub/home-surprise';
import { robotsFor } from '@/lib/site/indexing';
import { NETWORK, SITE } from '@/lib/site/registry';

import type { Metadata } from 'next';

const HOME_URL = `${NETWORK.url}/`;

// The home is the one indexable page of the hub (the layout closes the others, and every page while NET_INDEXING is off); canonical from the registry.
export const metadata: Metadata = {
  title: { absolute: ht('hp.meta.title') },
  description: ht('hp.meta.description'),
  robots: robotsFor(true),
  alternates: { canonical: HOME_URL },
  openGraph: {
    type: 'website',
    siteName: SITE.brand.name,
    title: ht('hp.meta.title'),
    description: ht('hp.meta.description'),
    url: HOME_URL,
    images: [{ url: SITE.brand.ogTemplate, width: 1200, height: 630, alt: SITE.brand.name }],
  },
  twitter: { card: 'summary_large_image', title: ht('hp.meta.title'), description: ht('hp.meta.description') },
};

export default async function HubHome(): Promise<React.ReactElement> {
  // Any error of the account reads as signed out, and a block whose data fails is null: the page never fails because the database is down.
  const session = await loadHomeSession();
  const userId = session?.userId ?? null;
  const [doors, today, quick, hot, crossover, fans, surprise, assets] = await Promise.all([
    loadHomeDoors(), loadHomeToday(), loadHomeQuick(), loadHomeHot(), loadHomeCrossover(), loadHomeTopFans(), loadHomeSurprise(userId), loadHomeAssets(),
  ]);
  const done = await loadHomeDone(userId, today);
  return <HomePage data={{ viewer: session?.viewer ?? null, doors, surprise, today, done, quick, hot, crossover, fans, assets, burrow: burrowOpen() }} />;
}
