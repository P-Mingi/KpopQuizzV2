// Run O1, lane B1. Brand reads for components: the name and the host of the site of this build,
// and the two-part wordmark (Kpop + Quiz). Values come from the registry (registry.md); a string
// helper is written so that a React child stays ONE text node where the literal it replaces was one
// (two adjacent text nodes would add a comment marker to the served HTML).

import { SITE } from './registry';

import type { SiteConfig } from './types';

/**
 * Splits a brand name or an address at its "Quiz" part, else at its "Verse" part: OtakuQuiz gives Otaku + Quiz, kpopquiz.org gives
 * kpop + quiz.org, FandomVerse gives Fandom + Verse (2026-10-28: the hub is FandomVerse, a name without "Quiz").
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
 * The address of a site as a reader types it: its canonical url without the scheme. kpopquiz.org, fandomverse.org/anime (OtakuQuiz lives
 * in a folder of fandomverse.org since 2026-10-28) and fandomverse.org. On kpop it is the domain, so a kpop string does not change.
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
