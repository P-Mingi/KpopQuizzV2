// The beforeSend of <Analytics> (audit 02 P1-2). Pure, so it is unit tested.
//
// Every event and page view loses the parameters Web Analytics must never receive (cleanUrl, which used
// to run only with a NET flag on), and the page views of /embed/ are dropped: an iframe on a partner site
// is not a visit to kpopquiz.org. Each kept page view also bumps the tab's page counter, which game_complete
// reports as a depth bucket (lib/analytics.ts visitDepth).

import { countPageView } from '@/lib/analytics';
import { cleanUrl } from '@/lib/network/via';

export interface VaEvent {
  type: 'pageview' | 'event';
  url: string;
}

const EMBED = /^\/(?:[a-z]+\/)?embed(?:\/|$)/i;

/** True for the address of an embed page (any base path, e.g. /anime/embed/q/x). */
export function isEmbedUrl(href: string): boolean {
  try {
    const path = new URL(href, 'https://example.invalid').pathname;
    return EMBED.test(path) || /\/embed\//.test(path);
  } catch {
    return false;
  }
}

export function beforeSend<T extends VaEvent>(event: T): T | null {
  if (event.type === 'pageview' && isEmbedUrl(event.url)) return null;
  if (event.type === 'pageview') countPageView();
  return { ...event, url: cleanUrl(event.url) };
}
