// Run O1, lot (d), lane H1: the legal notice (mentions légales) of the three sites. Pure: every string is a legal.* key of
// copy/hub/h1.ts (legal.publisher is the publisher's name and address; privacy.controller is the same person for the privacy policy), the site name and domain come from the
// registry, the contact mailbox and the place of the privacy policy follow the site: kpopquiz.org keeps its own mailbox and its own
// /privacy, OtakuQuiz and FanQuiz print the network mailbox and link the network policy.

import { COPY } from '@/copy/hub/h1';
import { HUB_EMAIL, ht } from '@/lib/site/hub/copy';
import { LEGAL_PLACEHOLDER_KEYS, privacyUrl } from '@/lib/site/hub/network-page';
import { flagOn, MAILBOX, SITE, SITE_ID } from '@/lib/site/registry';

import type { LegalKey } from '@/lib/site/hub/network-page';

/** The mailbox printed in the notice: the site's own on kpopquiz.org, the network mailbox on the other two. */
export function legalEmail(): string {
  return SITE_ID === 'kpop' ? (SITE.seo.organization.email ?? MAILBOX) : HUB_EMAIL;
}

/** Where "Read the privacy policy" goes: the site's own /privacy on kpopquiz.org, the network policy on the other two. */
export function legalPrivacyUrl(): string {
  return SITE_ID === 'kpop' ? `${SITE.url}/privacy` : privacyUrl();
}

/** One legal key, filled for this site. */
export function lt(key: LegalKey): string {
  return ht(key);
}

/** The [BRACKETED] lines that are still printed, in page order: empty once the owner has filled the phone. */
export function legalPlaceholders(): string[] {
  return LEGAL_PLACEHOLDER_KEYS.map((k) => COPY[k]).filter((v) => /^\[[^\]]+\]$/.test(v));
}

/**
 * The launch gate: a build with NET_INDEXING on (the network is open) must not print a placeholder, so launch cannot go out with
 * one. Returns nothing; throws an Error that names the keys. Next calls generateMetadata while it builds the page, which fails the build.
 */
export function legalLaunchGate(open: boolean = flagOn(process.env.NET_INDEXING), left: readonly string[] = legalPlaceholders()): void {
  if (!open || left.length === 0) return;
  throw new Error(
    `NET_INDEXING is on, so the legal notice is public, but it still prints ${left.join(', ')}. `
    + `Fill the keys ${LEGAL_PLACEHOLDER_KEYS.join(', ')} in apps/quiz/src/copy/hub/h1.ts, or turn NET_INDEXING off.`,
  );
}
