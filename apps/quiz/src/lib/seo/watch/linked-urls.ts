// SEO Mission 3, part D, point 1: the linked-URL guard list, versioned in git. Every URL here
// earned a link and must keep answering (rulebook 13.5): a 200 that is indexable and canonical
// to itself, or, when it is kept as a redirect, a one-hop permanent redirect to the exact
// successor. The nightly cron /api/cron/seo-linked-urls checks each one and alerts on failure.
//
// Where the list comes from (2026-10-15). No backlink data exists yet: the owner's strategy notes
// record that Bing Webmaster's inbound-links report is empty and Ahrefs shows a domain rating of
// 1, and no partner embed or tracked share referrer was found in the database. So the list starts
// with the links we can prove:
//   gsc     pages Google links to and sends visitors to: every page with 20 or more clicks in the
//           Search Console "Pages" export committed at docs/refonte/gsc/Pages.csv (2026-09-19).
//           linked-urls.test.ts reads that file and fails if this list and the export disagree.
//   bing    old URLs Bing still crawls, answered by an exact 301 since SEO Mission 1
//           (docs/seo/LIVE-CHECK-2026-10.md, "Still open after part A").
//   fandom  /coer-quiz: the CORTIS fandom-name URL that ranked for "coer quiz" before it was
//           folded into the hub (next.config.ts, fandomRedirects).
// Then it grows from link data: rows of seo_linked_urls (docs/pending-migrations/seo-watch.sql),
// filled by the weekly Search Console and Bing link imports or by hand, are checked the same way.
//
// Adding a URL: append it with its evidence. Removing one: only when it is retired with an exact
// 301, and then it stays here as a redirect entry, never deleted.

import type { Expectation } from './page-check';

export interface LinkedUrl {
  path: string;
  expect: Expectation;
  evidence: 'gsc' | 'bing' | 'fandom' | 'link-data';
  note: string;
}

const OK: Expectation = { kind: 'ok' };
const GSC_NOTE = 'Search Console Pages export, 20+ clicks (docs/refonte/gsc/Pages.csv)';

export const LINKED_URLS: readonly LinkedUrl[] = [
  { path: '/', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/cortis-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/illit-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/seventeen-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/blindtest', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/aespa-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/q/babymonster-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/stray-kids-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/quizzes', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/cortis-trivia', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/articles/guess-the-kpop-idol-guide', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/q/are-you-a-real-coer', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/bts-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/articles/hardest-kpop-quizzes', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/babymonster-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/q/illit-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/q/bts-arirang-comeback-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  { path: '/twice-quiz', expect: OK, evidence: 'gsc', note: GSC_NOTE },
  {
    path: '/games/name-all/name-all-aespa',
    expect: { kind: 'redirect', to: '/aespa-name-all-members' },
    evidence: 'bing',
    note: 'Crawled by Bing; exact 301 since SEO Mission 1 (docs/seo/LIVE-CHECK-2026-10.md)',
  },
  {
    path: '/games/name-all/name-all-gidle',
    expect: { kind: 'redirect', to: '/g-i-dle-name-all-members' },
    evidence: 'bing',
    note: 'Crawled by Bing; exact 301 since SEO Mission 1 (docs/seo/LIVE-CHECK-2026-10.md)',
  },
  {
    path: '/battle?quiz=illit-quiz',
    expect: { kind: 'redirect', to: '/q/illit-quiz' },
    evidence: 'bing',
    note: 'Crawled by Bing; exact 301 since SEO Mission 1 (docs/seo/LIVE-CHECK-2026-10.md)',
  },
  {
    path: '/coer-quiz',
    expect: { kind: 'redirect', to: '/cortis-quiz' },
    evidence: 'fandom',
    note: 'Ranked for "coer quiz" before the fold into the CORTIS hub (next.config.ts fandomRedirects)',
  },
];
