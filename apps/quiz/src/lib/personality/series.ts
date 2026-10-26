// Run O1, lane PERS: Which character are you on the anime build. The engine, the quiz component and the result card are the ones of
// Which member are you (rule 18); this file holds what differs and nothing else: where a series' questions sit, the pretty URL, and
// the words of a result that comes from a character (a profile text written by us) instead of from the six axes.
// Pure (no Supabase, no Next), so it is unit tested without a database. Server and tests only: no client module imports it.
//
// Storage (docs/anime/data/personality, scripts/anime/k1/personality-data.mjs):
//   personality_profiles   one active row per character of the series (site_id anime): member_name = the character's name,
//                          member_slug = its slug, axes = the six positions, trait_lines = the profile lines, character_id.
//   personality_questions  the table has no group column and a unique index on ord, so the eight questions of a series sit at
//                          ord = group_id * QUESTION_BAND + 1 to group_id * QUESTION_BAND + 8 (site_id anime). The loader writes
//                          them, this file reads them back.

import { whichMemberPath } from './view';

import type { SeriesProfile } from './parse';

export { parseSeriesProfiles, QUESTION_BAND, questionBand, SERIES_MIN_PROFILES } from './parse';
export type { SeriesProfile } from './parse';

/** The public URL of a series' quiz. The internal route behind it is /which-character/<series>. */
export function whichCharacterPath(seriesSlug: string): string {
  return `/which-${seriesSlug}-character-are-you`;
}

/** The public URL of the personality quiz of a topic on a site: the kpop build says member, every other build says character. */
export function whichPath(site: string, slug: string): string {
  return site === 'kpop' ? whichMemberPath(slug) : whichCharacterPath(slug);
}

const ROLE_LABEL: Readonly<Record<string, string>> = {
  main: 'Main character',
  supporting: 'Supporting character',
  antagonist: 'Antagonist',
};

/** "Main character, Yagami family": what the series' own data says about the character, nothing invented. */
export function characterRoleLine(role: string | null, affiliation: string | null, seriesName: string): string {
  const label = (role && ROLE_LABEL[role]) || 'Character';
  return affiliation ? `${label}, ${affiliation}` : `${label} of ${seriesName}`;
}

/** The result text: the profile lines, one paragraph. */
export function profileText(p: Pick<SeriesProfile, 'lines'>): string {
  return p.lines.join(' ');
}
