// Run O1, lane B1. The site-wide JSON-LD that the chrome layout renders, by site.

import { joinSiteUrl } from './base-path';
import { NETWORK, SITE } from './registry';

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
      url: joinSiteUrl(site.url, n.path),
    })),
  };
}

// The entity graph of the network (SEO-LAUNCH-1, lane C): stable @ids, so every page of every site points at the same entities. Bunnyverse is the
// parent Organization; kpopquiz.org and OtakuQuiz name it as parentOrganization; each site has one WebSite whose publisher is its own Organization.
// No sameAs between the sites: the link between them is the parent, not a profile. The @id is the origin of the site, a slash and a fragment.
type EntityPart = 'organization' | 'website';
const entityId = (url: string, part: EntityPart): string => `${url.replace(/\/+$/, '')}/#${part}`;

/** The @id of the Organization of a site (the one the chrome layout of that site prints). */
export function organizationId(site: SiteConfig = SITE): string { return entityId(site.url, 'organization'); }
/** The @id of the WebSite of a site. */
export function websiteId(site: SiteConfig = SITE): string { return entityId(site.url, 'website'); }

/**
 * The logo of the Bunnyverse Organization (SEO-LAUNCH-1, lane C): the rabbit of the hub's own bar (RabbitMark, public/mascot/mascot-default.png, 128 px square, above Google's 112 px
 * floor), not kpopquiz's pink star that brand.logo still is (owner decision D-099: the favicon and the manifest icons stay kpopquiz's files until the owner supplies a Bunnyverse set).
 * The one file the repo has for it: the owner may replace it with a real Bunnyverse logo by changing this constant.
 */
export const HUB_ORGANIZATION_LOGO = '/mascot/mascot-default.png';

/** The parent: Bunnyverse, https://bunnyverse.org/#organization. */
export const HUB_ORGANIZATION_ID = entityId(NETWORK.url, 'organization');

/** The parent as a child names it: an inline Organization (id, name, url), so a reader of the child's markup alone still sees who the parent is (SEO-LAUNCH-1 review, fix 10). */
export function hubParentOrganization(): Record<string, unknown> {
  return { '@type': 'Organization', '@id': HUB_ORGANIZATION_ID, name: NETWORK.name, url: NETWORK.url };
}

/** The WebSite of a home that has no search (the hub): its own name and origin. */
export function websiteJsonLdFor(description: string, site: SiteConfig = SITE): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId(site),
    name: site.brand.name,
    alternateName: site.seo.organization.alternateName,
    url: site.url,
    description,
    publisher: { '@id': organizationId(site) },
  };
}

/**
 * The Organization of the chrome layout of an anime or hub site: its own @id, name, host, logo and, once the owner names
 * one, contact mailbox. The hub is the parent of the network and names no child (the hub's JSON-LD never prints kpopquiz.org); the anime site names it as its
 * parentOrganization. No founder and no profile links: those are kpopquiz.org's (lib/seo/org.ts organizationJsonLd(), which the
 * kpop layout keeps calling), and no sameAs between the sites.
 */
export function organizationJsonLdFor(site: SiteConfig = SITE): Record<string, unknown> {
  const org = site.seo.organization;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(site),
    name: org.name,
    alternateName: org.alternateName,
    url: site.url,
    logo: `${site.url}${site.kind === 'hub' ? HUB_ORGANIZATION_LOGO : org.logo}`,
    ...(org.email ? { email: org.email } : {}),
    ...(site.kind === 'hub' ? {} : { parentOrganization: hubParentOrganization() }),
  };
}

/** An ItemList of links: the Hot now list of the hub home (lot H2a). Each item is a name and the URL of the page it points to. */
export function itemListJsonLd(name: string, items: readonly { readonly name: string; readonly url: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: item.url })),
  };
}
