// Run O1, lot (d), lane H1: the copy helper of the hub pages. Strings live in copy/hub/h1.ts; the network name, the
// hub brand and the words of a site come from the registry (NETWORK, siteConfig), never from the copy text.

import { COPY as H1 } from '@/copy/hub/h1';
import { NETWORK, siteConfig } from '@/lib/site/registry';

export type HubCopyKey = keyof typeof H1;
export type HubCopyVars = Readonly<Record<string, string | number>>;

const BASE_VARS: HubCopyVars = {
  network: NETWORK.name,
  brand: siteConfig('hub').brand.name,
  domain: siteConfig('hub').domain,
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
