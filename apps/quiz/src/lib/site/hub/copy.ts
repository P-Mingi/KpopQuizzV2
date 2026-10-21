// Run O1, lot (d), lane H1: the copy helper of the hub pages. Strings live in copy/hub/h1.ts; the network name, the
// hub brand and the words of a site come from the registry (NETWORK, siteConfig), never from the copy text.

import { COPY as H1 } from '@/copy/hub/h1';
import { NETWORK, siteConfig } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

export type HubCopyKey = keyof typeof H1;
export type HubCopyVars = Readonly<Record<string, string | number>>;

/** The sites of the network, in display order, with their domains: "A (a.org), B (b.org) and C (c.org)". */
function siteList(): string {
  const labels = SITE_IDS.map((id) => `${siteConfig(id).brand.name} (${siteConfig(id).domain})`);
  return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : (labels[0] ?? '');
}

/** The mailbox of the hub (contact@ its own host, as the other legal pages print it). */
export const HUB_EMAIL = `contact@${siteConfig('hub').domain}`;

const BASE_VARS: HubCopyVars = {
  network: NETWORK.name,
  brand: siteConfig('hub').brand.name,
  domain: siteConfig('hub').domain,
  // The privacy draft (privacy.*): the three sites with their domains, and the hub mailbox.
  sites: siteList(),
  email: HUB_EMAIL,
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
