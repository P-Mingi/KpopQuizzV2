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
    date: '2026-10-15',
    page: 'Group hubs, K-pop generations explained',
    href: '/articles/kpop-generations-explained',
    what: 'Generation labels now come from one sourced file, with a confidence level shown next to each. Groups that debuted from 2023, such as ILLIT and RIIZE, are called the newest wave instead of a settled 5th generation, because that label is not official. Groups that debuted in 2018 and 2019, such as Stray Kids and ITZY, now say that the line between the 3rd and 4th generations is debated.',
  },
  {
    date: '2026-10-15',
    page: 'Which member are you',
    what: 'The roles printed on results (such as "main dancer" or "the youngest") came from an unsourced list. Each page now lists the members and public roles that Wikidata and Wikipedia agree on, with both sources linked. Heeseung (ENHYPEN) and Danielle (NewJeans) are no longer given as results: both sources list them as former members.',
  },
  {
    date: '2026-10-14',
    page: 'BTS trivia',
    href: '/bts-trivia',
    what: 'Removed a fact that tied the 2018 UN speech to the Love Myself campaign (it launched UNICEF Generation Unlimited), facts without a subject, and unsourced fan items. Dynamite topped the Billboard Hot 100 dated September 5, 2020, not August 22. Epiphany was a comeback trailer, not the intro track.',
  },
  {
    date: '2026-10-14',
    page: 'General K-pop trivia',
    href: '/general-kpop-trivia',
    what: 'TWICE has five Korean members, not six. Jennie is also Korean-born, not only Jisoo. Jackson Wang joined JYP, not SM. Minnie is the only Thai member of (G)I-DLE. Out-of-date and wrong items (labels, Grammy and chart firsts, Coachella, debut dates, member counts) and items about health or legal matters were removed. The page is kept out of search results until every fact is verified.',
  },
  {
    date: '2026-10-14',
    page: 'Group hubs',
    what: 'Removed the "What label is the group on?" answer: our label data mixed Korean labels with US distribution partners (it said BTS is on Columbia Records; BTS is a BIGHIT MUSIC artist). It returns when the data is sourced.',
  },
  {
    date: '2026-10-14',
    page: 'K-pop generations explained',
    href: '/articles/kpop-generations-explained',
    what: 'Four generations are widely recognized; the 5th generation is now credited to the sources that use it, and noted as unofficial. Group counts that did not match the tables were removed.',
  },
  {
    date: '2026-10-14',
    page: 'K-pop quiz sites comparison',
    href: '/articles/best-kpop-quiz-sites-2026',
    what: 'The page now says first that we run kpopquiz.org and compares sites on criteria instead of ranking them. QuizUp (offline since March 2021) and Kpop-Quiz.com (its domain no longer resolves) were removed.',
  },
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
