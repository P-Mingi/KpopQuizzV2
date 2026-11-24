// SEO-LAUNCH-1, lane C: the words of the /about page of bunnyverse.org (trust page, rule 12). Pure: the page, its metadata, its JSON-LD and the sitemap row all read this file, so the
// title, the description and the answer block are the same everywhere. No number is typed here: the page counts nothing. The founder's name comes from FOUNDER (lib/seo/org.ts).
import { FOUNDER } from '@/lib/seo/org';

/** The day the page was last written. It is the lastmod of its sitemap row and the date it prints (rule 3.5: moved only by a real change of the text). */
export const HUB_ABOUT_UPDATED = '2026-11-23';

export const HUB_ABOUT_PATH = '/about';

/** Title: the layout adds " | Bunnyverse" (rule 2.2: 60 characters or fewer with the suffix). */
export const HUB_ABOUT_TITLE = 'About Bunnyverse: Team, Sources and Contact';

export const HUB_ABOUT_DESCRIPTION = 'About Bunnyverse, a free fan-made home for K-pop and anime daily games and quizzes: who runs it, how the content is made, our sources and how to reach us.';

/** The open sources the daily games read their data from (lib/dle/copy.ts: Kpopdle uses Wikidata, MusicBrainz and official sites; Otakudle uses Wikidata and Wikipedia). */
export const HUB_ABOUT_SOURCES = 'Wikidata, MusicBrainz and Wikipedia';

/**
 * The self-contained answer block (rule 3.1, 40 to 60 words), the first paragraph under the H1. It says only what is true in the code: the daily game data comes from open sources through our own
 * data pipelines; Team content goes through editorial review; fan quizzes are written by fans and can be reported (a person reviews a report). Owner rule 0: no blanket claim of a review of everything.
 */
export const HUB_ABOUT_ANSWER = `Bunnyverse is a free, fan-made home for daily games and quizzes about K-pop and anime, run by ${FOUNDER.name}, ${FOUNDER.role.charAt(0).toLowerCase()}${FOUNDER.role.slice(1)}. Daily game data is read from open sources, ${HUB_ABOUT_SOURCES}, by our own data pipelines. Team content goes through editorial review, and fan quizzes are written by fans and can be reported.`;
