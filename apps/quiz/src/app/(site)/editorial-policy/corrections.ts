// The dated corrections log shown at /editorial-policy#corrections (rulebook section 5.8:
// every correction is logged with a date). Newest first. Plain facts about what changed;
// no blame, no private details.

export interface Correction {
  /** ISO day of the correction. */
  date: string;
  /** The page or family of pages, as a reader would name it. */
  page: string;
  /** Where to see it now, when it is one page. */
  href?: string;
  what: string;
}

export const CORRECTIONS: readonly Correction[] = [
  {
    date: '2026-10-14',
    page: 'Group hubs',
    what: 'The number of songs in each group blind test came from an outdated table (BTS showed 28, the game plays 20; Stray Kids showed 14, the game plays 21). Hubs now count the songs the game really plays.',
  },
  {
    date: '2026-10-14',
    page: 'Blind test',
    href: '/blindtest',
    what: 'The page said "300+ songs across 60+ groups". The counts now come from the catalogue itself (more than 4,200 songs across more than 80 groups on this date).',
  },
  {
    date: '2026-10-14',
    page: 'Home, quiz list, about page',
    what: 'Counts typed into the copy had gone stale ("380+ quizzes", "42k+ plays", "30+ groups"). Every count now comes from one live source and is rounded down. A "3k+ fans every week" figure that nothing measured was removed.',
  },
  {
    date: '2026-10-13',
    page: 'Group hubs',
    what: 'Quiz counts in titles and FAQs included drafts and removed quizzes (BTS showed 31). They now count published quizzes only.',
  },
];
