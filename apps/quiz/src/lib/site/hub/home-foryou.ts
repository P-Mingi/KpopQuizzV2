// Run O1, lot H2c: the data of "For you" (signed in: the next quiz of the fandom, the bridge to the other site; a Continue card is not
// possible, see data.md) and "Start easy" (the friendliest first quiz of each site: signed out, and signed in while the fan has played
// nothing yet). Both come from the modules of lib/site/hub/data/; the signed-in fan's id is checked by the caller (the session).
// An empty list is a block that disappears.

import { getForYou, getStartEasy } from './data';
import { safeBlock } from './home-safe';

import type { HubForYouCard, HubQuizCard } from './data';
import type { HomeForYou, HomeForYouCard } from './home-types';

/** "Easy · 1.7k plays", "Easy · New", or just "Easy". */
export function easyMeta(card: HubQuizCard): string {
  return [card.meta, card.plays || (card.isNew ? 'New' : '')].filter(Boolean).join(' · ');
}

export function toForYouCard(c: HubForYouCard): HomeForYouCard {
  return {
    site: c.card.site,
    label: c.eyebrow,
    title: c.card.title,
    meta: c.meta,
    path: c.card.path,
    ...(c.kind === 'bridge' ? { bridge: true } : {}),
  };
}

const FIRST_LABEL = { kpop: 'First K-pop quiz', anime: 'First anime quiz' } as const;

async function readForYou(userId: string | null): Promise<HomeForYou> {
  const [forYou, easy] = await Promise.all([userId ? getForYou({ userId }) : Promise.resolve(null), getStartEasy()]);
  const signedOut: HomeForYouCard[] = [];
  for (const site of ['kpop', 'anime'] as const) {
    const card = easy?.[site];
    if (card) signedOut.push({ site, label: FIRST_LABEL[site], title: card.title, meta: easyMeta(card), path: card.path });
  }
  return { signedIn: forYou ? forYou.cards.map(toForYouCard) : [], signedOut };
}

export async function loadHomeForYou(userId: string | null): Promise<HomeForYou> {
  return safeBlock('for-you', () => readForYou(userId), { signedIn: [], signedOut: [] });
}
