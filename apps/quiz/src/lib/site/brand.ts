// Run O1, lane B1. Brand reads for components: the name and the host of the site of this build,
// and the two-part wordmark (Kpop + Quiz). Values come from the registry (registry.md); a string
// helper is written so that a React child stays ONE text node where the literal it replaces was one
// (two adjacent text nodes would add a comment marker to the served HTML).

import { SITE } from './registry';

import type { SiteConfig } from './types';

/**
 * Splits a brand name or an address at its "Quiz" part, else at its "Verse" part: OtakuQuiz gives Otaku + Quiz, kpopquiz.org gives
 * kpop + quiz.org, Bunnyverse gives Bunny + verse (2026-10-29: the hub is Bunnyverse, a name without "Quiz").
 */
export function splitAtQuiz(text: string): { readonly head: string; readonly tail: string } {
  const lower = text.toLowerCase();
  const q = lower.indexOf('quiz');
  const i = q < 0 ? lower.indexOf('verse') : q;
  return i < 0 ? { head: text, tail: '' } : { head: text.slice(0, i), tail: text.slice(i) };
}

/** The brand name as a wordmark: head and tail of the display name. */
export function brandWordmark(site: SiteConfig = SITE): { readonly head: string; readonly tail: string } {
  return splitAtQuiz(site.brand.name);
}

/**
 * The second colour of the hub's wordmark (owner, 2026-10-29): "verse" in the pink of every validated mockup, "Bunny" in ink. One value
 * for every surface that draws the wordmark: the token --hub-brand-tail of styles/sites/hub/h2.css (the class below reads it), the brand
 * files public/brand/hub/logo-primary.svg and og-default.png (e2e/o1/H1/H2a/brand-marks.mjs), and the images drawn without CSS (the
 * passport card). A test compares them all with this constant.
 */
export const HUB_WORDMARK_TAIL = '#D13A6E';

/**
 * The class of the wordmark's tail on this build: on the hub, the class whose rule reads --hub-brand-tail (styles/sites/hub/h2.css). kpop
 * and anime get none, so their wordmark keeps the markup and the colour it has.
 */
export function wordmarkTailClass(site: SiteConfig = SITE): string | undefined {
  return site.id === 'hub' ? 'hub-h2-brand-tail' : undefined;
}

/** The colour an image drawn without CSS gives the wordmark's tail on this build: the hub's own, or null where the image keeps its own. */
export function wordmarkTailColour(site: SiteConfig = SITE): string | null {
  return site.id === 'hub' ? HUB_WORDMARK_TAIL : null;
}

/**
 * The address of a site as a reader types it: its canonical url without the scheme. kpopquiz.org, bunnyverse.org/anime (OtakuQuiz lives
 * in a folder of bunnyverse.org since 2026-10-28) and bunnyverse.org. On kpop it is the domain, so a kpop string does not change.
 */
export function siteAddress(site: SiteConfig = SITE): string {
  return site.url.replace(/^https?:\/\//, '');
}

/** The address as a wordmark: head and tail of siteAddress. */
export function domainWordmark(site: SiteConfig = SITE): { readonly head: string; readonly tail: string } {
  return splitAtQuiz(siteAddress(site));
}

/** An absolute URL on the site of this build: the registry origin and a path that starts with a slash (or none). */
export function siteUrl(path: string = '', site: SiteConfig = SITE): string {
  return `${site.url}${path}`;
}
