import { KpopGamesPage, kpopGamesMetadata } from '@/components/games/kpop-games-page';
import { getKpopGamesData, keepLastGoodCopy } from '@/lib/games/data';

import type { Metadata } from 'next';

// /kpop-games (SEO Mission 2, part A; rulebook sections 1, 3, 4, 7 and 8; cluster "kpop
// games, kpop games online" in docs/seo/TARGETS.md). Every game of the site in one page:
// the registry (lib/games/registry.ts) decides which games exist on this build and every
// number comes from lib/stats/site-stats.ts or a documented query (lib/games/data.ts).
// Server rendered and ISR: the reads are cached for six hours, the page for one.

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return kpopGamesMetadata(await getKpopGamesData());
}

export default async function Page(): Promise<React.ReactElement> {
  const data = await getKpopGamesData();
  keepLastGoodCopy(data.failed);
  return <KpopGamesPage data={data} />;
}
