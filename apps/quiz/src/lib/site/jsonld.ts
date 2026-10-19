// Run O1, lane B1. The site-wide JSON-LD that the chrome layout renders, by site.

import { SITE } from './registry';

import type { FeatureKey, SiteConfig } from './types';

/** The main navigation entries, each shown only on a site that has the feature behind it. */
const NAVIGATION: readonly { readonly name: string; readonly path: string; readonly feature: FeatureKey }[] = [
  { name: 'Quizzes', path: '/quizzes', feature: 'quizzes' },
  { name: 'Blind Test', path: '/blindtest', feature: 'blindTest' },
  { name: 'Leaderboard', path: '/leaderboard', feature: 'leaderboards' },
  { name: 'Trivia', path: '/trivia', feature: 'trivia' },
];

/** The SiteNavigationElement of the chrome layout: on kpop, the four links it carries today. */
export function siteNavigationJsonLd(site: SiteConfig = SITE): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'Main Navigation',
    hasPart: NAVIGATION.filter((n) => site.features[n.feature]).map((n) => ({
      '@type': 'WebPage',
      name: n.name,
      url: `${site.url}${n.path}`,
    })),
  };
}
