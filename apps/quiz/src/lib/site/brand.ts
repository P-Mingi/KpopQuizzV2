// Run O1, lane B1. Brand reads for components: the name and the host of the site of this build,
// and the two-part wordmark (Kpop + Quiz). Values come from the registry (registry.md); a string
// helper is written so that a React child stays ONE text node where the literal it replaces was one
// (two adjacent text nodes would add a comment marker to the served HTML).

import { SITE } from './registry';

import type { SiteConfig } from './types';

/** Splits a brand name or a domain at its "Quiz" part: OtakuQuiz gives Otaku + Quiz, otakuquiz.org gives otaku + quiz.org. */
export function splitAtQuiz(text: string): { readonly head: string; readonly tail: string } {
  const i = text.toLowerCase().indexOf('quiz');
  return i < 0 ? { head: text, tail: '' } : { head: text.slice(0, i), tail: text.slice(i) };
}

/** The brand name as a wordmark: head and tail of the display name. */
export function brandWordmark(site: SiteConfig = SITE): { readonly head: string; readonly tail: string } {
  return splitAtQuiz(site.brand.name);
}

/** The domain as a wordmark: head and tail of the host name. */
export function domainWordmark(site: SiteConfig = SITE): { readonly head: string; readonly tail: string } {
  return splitAtQuiz(site.domain);
}

/** An absolute URL on the site of this build: the registry origin and a path that starts with a slash (or none). */
export function siteUrl(path: string = '', site: SiteConfig = SITE): string {
  return `${site.url}${path}`;
}
