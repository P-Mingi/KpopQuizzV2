// Site switcher (owner, 2026-11-22): one control in the top bar of kpopquiz.org and OtakuQuiz to hop between KpopQuiz, OtakuQuiz and Bunnyverse.
// Pure and server side. A destination is listed only while its site is open, under the SAME gate the site itself uses (lib/cards-bridge/flags.ts:
// kpopquiz.org sees the hub and OtakuQuiz, which share the hub's private launch gate, through NET_CARDS_BRIDGES; OtakuQuiz shows itself and the
// others only once its own private launch gate is off). With no open sister the answer is null and the shell's props carry no key: the HTML is
// today's. kpopquiz.org and the hub's other builds never draw a link to a closed page. This replaces the separate "Bunnyverse" button of the
// bridges (lib/cards-bridge/nav.ts keeps "KpopCards", a different destination).
import { cardsBridgesKpopOn, hubHomeLinkOn } from '@/lib/cards-bridge/flags';
import { cardsHref } from '@/lib/cards-bridge/links';
import { bridgeHref } from '@/lib/network/links';
import { REGISTRY, SITE_ID } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

export interface SwitchItem {
  readonly id: SiteId;
  /** The brand name of the site, shown as it is. */
  readonly label: string;
  /** Null for the current site (not a link). */
  readonly href: string | null;
}

export interface SiteSwitchModel {
  readonly current: SiteId;
  /** Always KpopQuiz, OtakuQuiz, Bunnyverse in that order, the current one included. */
  readonly items: readonly SwitchItem[];
}

const ORDER: readonly SiteId[] = ['kpop', 'anime', 'hub'];

function hrefTo(dst: SiteId): string {
  if (SITE_ID === 'kpop') return dst === 'hub' ? cardsHref('/') : bridgeHref(dst, '/', 'pp');
  // OtakuQuiz: the hub is on the same origin (one session, a plain address); kpopquiz.org takes the signed-in jump.
  return dst === 'hub' ? `${REGISTRY.hub.url}/` : bridgeHref(dst, '/', 'pp');
}

/** The sites the viewer may be sent to from this build, or none while every sister site is closed. */
function openSisters(): readonly SiteId[] {
  if (SITE_ID === 'kpop') return cardsBridgesKpopOn() ? ['anime', 'hub'] : [];
  if (SITE_ID === 'anime') return hubHomeLinkOn() ? ['kpop', 'hub'] : [];
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
