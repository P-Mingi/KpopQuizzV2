// Run O1, lane O1 (lot a, finishing): the words a shared component prints for "the things a topic holds", taken from the
// vocabulary of a site (registry.md, SiteConfig.vocabulary). On kpop they are today's words (member, members, song, songs),
// so a component that falls back to KPOP_WORDS renders what it rendered before.

import { SITE } from './registry';

import type { SiteConfig, SiteVocabulary } from './types';

export interface SiteWords {
  readonly member: string;
  readonly members: string;
  readonly song: string;
  readonly songs: string;
}

/** The words of a vocabulary. The plural of the song word is the word and an "s" (opening, openings). */
export function wordsOf(v: SiteVocabulary): SiteWords {
  return { member: v.member, members: v.memberPlural, song: v.song, songs: `${v.song}s` };
}

/** Today's kpop words. */
export const KPOP_WORDS: SiteWords = { member: 'member', members: 'members', song: 'song', songs: 'songs' };

/** The words of a site (default: the site of this build). */
export function siteWords(site: SiteConfig = SITE): SiteWords {
  return wordsOf(site.vocabulary);
}
