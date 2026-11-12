// Bunnyverse Cards, lane U: the words of a photo credit that the pages link (rules.ts creditLine gives the one-line text of the card
// back; this gives the parts, so the author, the source page and the licence can each be a link).
import { EDITIONS } from './rules';
import { photoSrc } from './ui-model';

import type { PhotoSource } from './types';
import type { UiCatalog, UiPhoto } from './ui-types';

export const SOURCE_NAMES: Record<PhotoSource, string> = {
  commons: 'Wikimedia Commons',
  koreanet: 'Korea.net on Flickr',
  flickr: 'Flickr',
  dvids: 'DVIDS',
};

/** 'CC BY-SA 4.0' from the licence string of a share-alike photo, else null. */
export function shareAlikeName(licence: string, shareAlike: boolean): string | null {
  if (!shareAlike) return null;
  const m = /^CC BY-SA(?: (\d(?:\.\d)?))?/.exec(licence);
  return m ? `CC BY-SA${m[1] ? ` ${m[1]}` : ''}` : licence;
}

/** Only an https address is ever linked (the credit comes from stored rows). */
export function safeHref(u: string | null | undefined): string | null {
  return u && /^https:\/\//i.test(u) ? u : null;
}

export const REPORT_PATH = '/cards/report';
export function reportHref(o: { num?: string; photoId?: number }): string {
  const q = new URLSearchParams();
  if (o.num) q.set('card', o.num);
  if (o.photoId !== undefined) q.set('photo', String(o.photoId));
  const s = q.toString();
  return s ? `${REPORT_PATH}?${s}` : REPORT_PATH;
}

// ---- the Cards section of /credits ----

export interface CardCreditRow {
  photo: UiPhoto;
  thumb: string | null;
  /** The cards that use this photo, with the idol's name. */
  cards: { num: string; name: string; edition: string }[];
}

/** Every photo used by a card, once, with the cards that carry it (card numbers ascending). */
export function cardCreditRows(cat: UiCatalog): CardCreditRow[] {
  const byId = new Map<number, CardCreditRow>();
  for (const c of cat.cards) {
    if (!c.photo) continue;
    let row = byId.get(c.photo.id);
    if (!row) {
      row = { photo: c.photo, thumb: photoSrc(c.photo), cards: [] };
      byId.set(c.photo.id, row);
    }
    row.cards.push({ num: c.num, name: c.name, edition: EDITIONS[c.rarity].name });
  }
  return [...byId.values()].sort((a, b) => (a.cards[0]?.num ?? '').localeCompare(b.cards[0]?.num ?? ''));
}
