// Run O1, lot (d), lane H1: the copy helper of the hub pages. Strings live in copy/hub/h1.ts; the network name, the
// hub brand and the words of a site come from the registry (NETWORK, siteConfig), never from the copy text.

import { COPY as H1 } from '@/copy/hub/h1';
import { HANDOFF_LOG_DAYS, DELETION_GRACE_DAYS, leavableSites } from '@/lib/passport/deletion/policy';
import { PASSPORT_SECONDS } from '@/lib/passport/types';
import { siteAddress } from '@/lib/site/brand';
import { formatLaunchDate } from '@/lib/site/indexing';
import { MAILBOX, NETWORK, SITE, siteConfig } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

export type HubCopyKey = keyof typeof H1;
export type HubCopyVars = Readonly<Record<string, string | number>>;

/** "A", "A and B", "A, B and C". */
function andList(names: readonly string[]): string {
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : (names[0] ?? '');
}

/** The sites of the network, in display order, with their addresses: "A (a.org), B (c.org/b) and C (c.org)" (siteAddress: OtakuQuiz is a folder of fandomverse.org). */
function siteList(): string {
  return andList(SITE_IDS.map((id) => `${siteConfig(id).brand.name} (${siteAddress(siteConfig(id))})`));
}

/** The mailbox of the hub: the one network mailbox, from the registry. */
export const HUB_EMAIL = MAILBOX;

/** The day the privacy text last changed: bump it with every change of a privacy.* string (FandomVerse cookies, 2026-10-28). */
export const PRIVACY_REVISED = '2026-10-28';

/** The minimum age on the three sites (owner, 2026-10-24). */
export const MIN_AGE = 15;

const BASE_VARS: HubCopyVars = {
  network: NETWORK.name,
  brand: siteConfig('hub').brand.name,
  domain: siteConfig('hub').domain,
  // The legal notice (legal.*): the site that serves the page, from the registry, with its address (fandomverse.org/anime on OtakuQuiz).
  site: SITE.brand.name,
  siteDomain: siteAddress(SITE),
  // The privacy draft (privacy.*): the three sites with their domains, and the hub mailbox.
  sites: siteList(),
  email: HUB_EMAIL,
  // Two of the three sites by name (the cookies and the sign-in methods that belong to one site only).
  kpopName: siteConfig('kpop').brand.name,
  animeName: siteConfig('anime').brand.name,
  // The sites a member can leave (everything but kpop).
  leavable: andList(leavableSites().map((id) => siteConfig(id).brand.name)),
  // The numbers the code decides (lib/passport/types.ts PASSPORT_SECONDS, lib/passport/deletion/policy.ts), never typed in the copy.
  ticketMinutes: PASSPORT_SECONDS.ticket / 60,
  codeSeconds: PASSPORT_SECONDS.code,
  freshMinutes: PASSPORT_SECONDS.freshSignIn / 60,
  logDays: HANDOFF_LOG_DAYS,
  graceDays: DELETION_GRACE_DAYS,
  minAge: MIN_AGE,
  // How long the sign-in return cookie lives (lib/auth/oauth-return.ts OAUTH_RETURN_SECONDS / 60; privacy-final.test.ts keeps them equal
  // without importing that module here).
  oauthMinutes: 10,
  // The last change of the privacy text (PRIVACY_REVISED), "28 October 2026": shown on the draft and on the live page.
  revised: formatLaunchDate(PRIVACY_REVISED) ?? '',
  // The launch date (NET_LAUNCH_DATE), "24 October 2026"; empty while it is missing (the page prints the line only when it has one).
  date: formatLaunchDate(process.env.NET_LAUNCH_DATE) ?? '',
};

/** `{name}` placeholders replaced from `vars` then from the base vars; an unknown placeholder is left as written. */
export function fillHub(template: string, vars: HubCopyVars = {}): string {
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (whole, key: string) => {
    const v = vars[key] ?? BASE_VARS[key];
    return v === undefined ? whole : String(v);
  });
}

/** One hub copy string by key, filled. */
export function ht(key: HubCopyKey, vars: HubCopyVars = {}): string {
  return fillHub(H1[key], vars);
}
