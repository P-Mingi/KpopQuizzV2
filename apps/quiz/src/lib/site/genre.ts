// Run O1, lane O1: the genre word of a site's copy. The copy shared by the three builds (home header, FAQ, popular pages,
// meta descriptions) says "K-pop" on kpop, byte for byte as before; another site says its own word. The registry holds the
// frozen shape of a site (registry.md), so this small table sits beside it and is typed to cover every SiteId.

import { SITE_ID } from './registry';

import type { SiteId } from './types';

/** The genre word of each site's copy: the hub has none (it lists no quiz of its own). */
export const GENRE_WORDS: Readonly<Record<SiteId, string>> = { kpop: 'K-pop', anime: 'anime', hub: '' };

/** The genre word of the site of this build ("K-pop" on kpop, so every kpop sentence reads as it did). */
export const GENRE: string = GENRE_WORDS[SITE_ID];

/** True on the kpop build: the places where a sentence names kpop groups or the kpop Discord keep their words only there. */
export const IS_KPOP: boolean = SITE_ID === 'kpop';

/** `word` with its first letter in capitals ("anime" -> "Anime", "K-pop" stays). */
export function titleCase(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
