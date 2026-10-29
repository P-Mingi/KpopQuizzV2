// Run O1 (rule 18): the home of an anime or hub build. bunnyverse.org/anime shows the twin of kpopquiz.org's home (TWINS row 1,
// home-anime.tsx); bunnyverse.org shows the twin of its /about page (row H-1, home-hub.tsx). Both are copies made by
// scripts/o1/twins-codemod.mjs that import the kpop components.
import type { Metadata } from 'next';

import { SITE } from '@/lib/site/registry';

import AnimeHome, { generateMetadata as animeMetadata } from './home-anime';
import HubHome, { metadata as hubMetadata } from './home-hub';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return SITE.id === 'hub' ? hubMetadata : animeMetadata();
}

export default function SiteHome(): React.ReactElement {
  return SITE.id === 'hub' ? <HubHome /> : <AnimeHome />;
}
