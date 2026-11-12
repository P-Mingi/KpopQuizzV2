// Bunnyverse Cards, lane U: the switches the pages read. NET_CARDS (server, hub only): off, every Cards page is a 404 like any unknown
// URL. The fixture switch is for development servers and tests only; a production build never honours it.
import { flagOn, SITE_ID } from '@/lib/site/registry';

/** True on the hub build with NET_CARDS on. */
export function cardsOn(): boolean {
  return SITE_ID === 'hub' && flagOn(process.env.NET_CARDS);
}

/** True when the pages may read the test fixture instead of the database: never in production. */
export function cardsFixtureOn(): boolean {
  return process.env.NODE_ENV !== 'production' && flagOn(process.env.CARDS_UI_FIXTURE);
}
