// Who runs kpopquiz.org, for the trust pages and the structured data (SEO Mission 1, owner
// 2026-10-14; rulebook section 12). The owner chose how he appears: his first name and his
// role, nothing more (no surname, no country, no photo). sameAs lists only the profiles the
// owner confirmed are live: the Discord server and r/Kpop_Verse.

import { SOCIAL_LINKS } from '@kpopquiz/shared/social-links';

export const SITE_URL = 'https://kpopquiz.org';
export const CONTACT_EMAIL = 'hello@kpopquiz.org';

export const FOUNDER = {
  name: 'Louis',
  role: 'Founder of kpopquiz.org',
  url: `${SITE_URL}/about`,
} as const;

/** The author of articles and data pages: a Person that links to /about. */
export function founderPerson(): Record<string, unknown> {
  return { '@type': 'Person', name: FOUNDER.name, jobTitle: FOUNDER.role, url: FOUNDER.url };
}

/** The live public profiles of the site (owner-confirmed). */
export const ORG_SAME_AS: readonly string[] = [SOCIAL_LINKS.discord.invite, SOCIAL_LINKS.reddit.url];

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'KpopQuiz',
    alternateName: 'kpopquiz.org',
    url: SITE_URL,
    logo: `${SITE_URL}/logo-512.png`,
    email: CONTACT_EMAIL,
    founder: founderPerson(),
    sameAs: [...ORG_SAME_AS],
  };
}
