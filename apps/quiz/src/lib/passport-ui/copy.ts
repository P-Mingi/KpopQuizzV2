// Run O1, lot (b), lane P1: one string of copy/anime/p1.ts (namespace anime.p1), filled for a site. The brand, the network
// and the host come from the registry of that site and the vocabulary words from its SITE.vocabulary, never from the
// text, so the hub (which has no copy file of its own for the sign-in and the settings) says "FanQuiz" with the same
// strings. Server and client safe.

import { COPY } from '@/copy/anime/p1';
import { NETWORK, SITE_ID, siteConfig } from '@/lib/site/registry';

import { fmt } from './fmt';

import type { FmtVars } from './fmt';
import type { SiteId } from '@/lib/site/types';

export type P1Key = keyof typeof COPY;

const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** The placeholders every string may use, for `site`. */
export function siteVars(site: SiteId = SITE_ID): FmtVars {
  const cfg = siteConfig(site);
  const v = cfg.vocabulary;
  return {
    brand: cfg.brand.name,
    network: NETWORK.name,
    domain: cfg.domain,
    topic: v.topic, topicCap: cap(v.topic), topicPlural: v.topicPlural, topicPluralCap: cap(v.topicPlural),
    member: v.member, memberCap: cap(v.member), memberPlural: v.memberPlural,
    pick: v.favourites.pickLabel, pickLower: v.favourites.pickLabel.toLowerCase(),
  };
}

/** The raw template of a key (placeholders not filled). */
export function p1Raw(key: P1Key): string {
  return COPY[key];
}

/** `key` filled with the site's placeholders, then `vars`. */
export function p1(key: P1Key, vars: FmtVars = {}, site: SiteId = SITE_ID): string {
  return fmt(COPY[key], { ...siteVars(site), ...vars });
}

/** `key` with only the site's placeholders filled: what a client component finishes with its own numbers. */
export function p1Template(key: P1Key, site: SiteId = SITE_ID): string {
  return fmt(COPY[key], siteVars(site));
}
