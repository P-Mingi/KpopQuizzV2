// Site switcher (owner, 2026-11-22; the hub too, 2026-11-23): one control in the top bar of kpopquiz.org, OtakuQuiz and Bunnyverse to hop between KpopQuiz, OtakuQuiz and Bunnyverse.
// Pure and server side. A destination is listed only while its site is open, under the SAME gate the site itself uses (lib/cards-bridge/flags.ts:
// kpopquiz.org sees the hub and OtakuQuiz, which share the hub's private launch gate, through NET_CARDS_BRIDGES; OtakuQuiz shows itself and the
// others: see openSisters; the hub lists KpopQuiz and OtakuQuiz, see openSisters). With no open sister the answer is null and the shell's props carry no key: the HTML is
// today's. kpopquiz.org and the hub's other builds never draw a link to a closed page. This replaces the separate "Bunnyverse" button of the
// bridges (lib/cards-bridge/nav.ts keeps "KpopCards", a different destination).
import { cardsBridgesKpopOn, hubHomeLinkOn } from '@/lib/cards-bridge/flags';
import { cardsHref } from '@/lib/cards-bridge/links';
import { readPrivateLaunch } from '@/lib/private-launch/config';
import { bridgeHref } from '@/lib/network/links';
import { REGISTRY, SITE_ID } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

/** The three sites, plus KpopCards: a site inside Bunnyverse that only its own bar lists (siteSwitchCards). */
export type SwitchId = SiteId | 'cards';

export interface SwitchItem {
  readonly id: SwitchId;
  /** The brand name of the site, shown as it is. */
  readonly label: string;
  /** Null for the current site (not a link). */
  readonly href: string | null;
}

export interface SiteSwitchModel {
  readonly current: SwitchId;
  /** Always KpopQuiz, OtakuQuiz, Bunnyverse in that order, the current one included (the KpopCards bar adds KpopCards, its current row, last). */
  readonly items: readonly SwitchItem[];
}

const ORDER: readonly SiteId[] = ['kpop', 'anime', 'hub'];

function hrefTo(dst: SiteId): string {
  if (SITE_ID === 'kpop') return dst === 'hub' ? cardsHref('/') : bridgeHref(dst, '/', 'pp');
  // Bunnyverse: OtakuQuiz is on the same origin (one session, a plain address); kpopquiz.org takes the signed-in jump, the one OtakuQuiz uses.
  if (SITE_ID === 'hub') return dst === 'anime' ? `${REGISTRY.anime.url}/` : bridgeHref(dst, '/', 'pp');
  // OtakuQuiz: the hub is on the same origin (one session, a plain address); kpopquiz.org takes the signed-in jump.
  return dst === 'hub' ? `${REGISTRY.hub.url}/` : bridgeHref(dst, '/', 'pp');
}

/** The sites the viewer may be sent to from this build, or none while every sister site is closed. */
function openSisters(): readonly SiteId[] {
  if (SITE_ID === 'kpop') return cardsBridgesKpopOn() ? ['anime', 'hub'] : [];
  if (SITE_ID === 'anime') {
    // Owner, 2026-11-22 ("where is the toggle I asked for?"): OtakuQuiz always shows the switcher. kpopquiz.org is public. The hub sits
    // behind the same private launch gate as OtakuQuiz (one cookie, one allow list): while that gate is on, whoever sees an OtakuQuiz page
    // may also see the hub. Once OtakuQuiz is public, the hub is listed only with NET_CARDS_BRIDGES on (the owner opens the hub last).
    const hubOpen = readPrivateLaunch('anime', process.env).on || hubHomeLinkOn();
    return hubOpen ? ['kpop', 'hub'] : ['kpop'];
  }
  // Owner, 2026-11-23: the hub has the switcher too, with KpopQuiz and OtakuQuiz. kpopquiz.org is public; OtakuQuiz and the hub share ONE private
  // launch gate (one cookie, one allow list), so whoever sees a hub page may see OtakuQuiz: both are always listed, the current row is Bunnyverse.
  if (SITE_ID === 'hub') return ['kpop', 'anime'];
  return [];
}

export function siteSwitch(): SiteSwitchModel | null {
  const open = openSisters();
  if (open.length === 0) return null;
  return {
    current: SITE_ID,
    items: ORDER.filter((id) => id === SITE_ID || open.includes(id)).map((id) => ({
      id,
      label: REGISTRY[id].brand.name,
      href: id === SITE_ID ? null : hrefTo(id),
    })),
  };
}

/**
 * The switcher of the KpopCards bar (owner, 2026-11-23: "from kpopcard on the nav a button to go back to kpopquiz or bunnyverse"). KpopCards is served by the
 * hub build, so the destinations are those of the hub's own bar: KpopQuiz through the signed-in jump, OtakuQuiz a plain link (same origin), and
 * Bunnyverse a link to the hub home (the player is in KpopCards, not on the home). KpopCards is the current row (no link). Null on the other builds.
 */
export function siteSwitchCards(): SiteSwitchModel | null {
  if (SITE_ID !== 'hub') return null;
  return {
    current: 'cards',
    items: [
      { id: 'kpop', label: REGISTRY.kpop.brand.name, href: hrefTo('kpop') },
      { id: 'anime', label: REGISTRY.anime.brand.name, href: hrefTo('anime') },
      { id: 'hub', label: REGISTRY.hub.brand.name, href: '/' },
      { id: 'cards', label: 'KpopCards', href: null },
    ],
  };
}
