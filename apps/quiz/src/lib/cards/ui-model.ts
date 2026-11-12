// Bunnyverse Cards, lane U: the pure model of the pages. From the catalog (cards and entities) it builds the slim cards, the pockets of
// the binder (a card, or an edition that cannot exist yet with its reason sentence), the sections, and the numbers the pages print.
// Nothing here invents a number: every count is taken from the catalog and from the player's state.
import { RARITIES, RARITY_NAMES, SHARDS } from './rules';
import { paletteFor } from './ui-palette';

import type { CardKind, CatalogOdds, LockReason, OwnedEntry, Rarity } from './types';
import type { BinderItem, BinderSection, CardPicture, SlimCard, SlimCatalog, UiCard, UiCatalog, UiPhoto } from './ui-types';

/** The picture of a card (amendment 1, point 7): the cropped WebP while it was cut at the current focal point, else the source photo. */
export function photoPicture(photo: UiPhoto | null): CardPicture | null {
  if (!photo) return null;
  if (photo.src) return { src: photo.src, srcSet: null, cut: false };
  const fresh = photo.fileFocalX != null && photo.fileFocalY != null && photo.fileFocalX === (photo.focalX ?? 50) && photo.fileFocalY === (photo.focalY ?? 50);
  if (photo.url && fresh) return { src: photo.url, srcSet: photo.url2x ? `${photo.url} 1x, ${photo.url2x} 2x` : null, cut: true };
  if (photo.sourceUrl) return { src: photo.sourceUrl, srcSet: null, cut: false };
  return null;
}

export function slimCard(c: UiCard, entityType: string | null = null): SlimCard {
  return {
    n: c.n, num: c.num, entity: c.entity, kind: c.kind, rarity: c.rarity, edition: c.edition, name: c.name, group: c.group, debutYear: c.debutYear,
    img: photoPicture(c.photo), fx: c.photo?.focalX ?? 50, fy: c.photo?.focalY ?? 30, sub: entityType,
  };
}

const slug = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const EVENTS_SECTION = 'events';

/**
 * The editions a subject has a pocket for. Amendment 1: a person or a group has all six pockets (C, U, R, UR exist, Era and Full Art are
 * locked while the subject has one free photo); an event, if the catalog ever has one, keeps C, U, R.
 */
export function ladderRarities(kind: CardKind): readonly Rarity[] {
  return kind === 'event' ? RARITIES.slice(0, 3) : RARITIES;
}

/** The reason an edition is missing: the catalog's, else the plan's "one free photo" for Era and Full Art. */
export function lockReasonOf(lockReasons: Partial<Record<Rarity, LockReason>>, r: Rarity): LockReason | null {
  return lockReasons[r] ?? (r === 'SR' || r === 'L' ? 'one' : null);
}

/** Builds the slim catalog: ordered pockets (idols, then the group cards, per group, then the events), the sections and the locks. Only the
 *  entities that have at least one card get pockets. */
export function buildSlim(cat: UiCatalog): SlimCatalog {
  const byEntity = new Map<string, UiCard[]>();
  for (const c of cat.cards) {
    const l = byEntity.get(c.entity);
    if (l) l.push(c);
    else byEntity.set(c.entity, [c]);
  }
  const typeOf = new Map(cat.entities.map((e) => [e.id, e.eventType ?? null]));
  const cards = cat.cards.map((c) => slimCard(c, typeOf.get(c.entity) ?? null));
  const firstN = (id: string): number => Math.min(...(byEntity.get(id) ?? []).map((c) => c.n), Number.MAX_SAFE_INTEGER);
  const entities = [...cat.entities].sort((a, b) => firstN(a.id) - firstN(b.id) || a.sortKey.localeCompare(b.sortKey));
  const sections: BinderSection[] = [];
  const items: BinderItem[] = [];
  const locks: SlimCatalog['locks'] = {};
  const editions: SlimCatalog['editions'] = {};
  const seen = new Set<string>();
  for (const e of entities) {
    // Review 1 finding 5: an entity with no card (the group line of a person, BLACKPINK for Jennie and Rose) has no pocket and no section
    // of its own; its name is only the group line of its people.
    if (!byEntity.has(e.id)) continue;
    const secName = e.kind === 'event' ? 'Events' : e.kind === 'group' ? e.name : (e.group ?? e.name);
    const sec = e.kind === 'event' ? EVENTS_SECTION : slug(secName);
    if (!seen.has(sec)) {
      seen.add(sec);
      sections.push({ id: sec, name: secName, color: e.kind === 'event' ? paletteFor('events').dot : paletteFor(`group:${secName}`).dot, ns: [] });
    }
    const have = new Map((byEntity.get(e.id) ?? []).map((c) => [c.rarity, c]));
    const lk: Partial<Record<Rarity, LockReason | null>> = {};
    for (const r of ladderRarities(e.kind)) {
      const c = have.get(r);
      if (c) {
        items.push({ i: items.length, sec, card: slimCard(c, e.eventType ?? null) });
        sections.find((x) => x.id === sec)!.ns.push(c.n);
      }
      else {
        const reason = lockReasonOf(e.lockReasons, r);
        lk[r] = reason;
        const anchor = (byEntity.get(e.id) ?? [])[0]?.num ?? null;
        items.push({ i: items.length, sec, locked: true, entity: e.id, name: e.name, group: e.kind === 'idol' ? e.group : e.kind === 'group' ? e.name : null, rarity: r, reason, anchor });
      }
    }
    locks[e.id] = lk;
    editions[e.id] = Object.fromEntries([...have].map(([r, c]) => [r, c.n]));
  }
  return { cards, items, sections, locks, editions };
}

/** What the player owns, by card number. */
export function ownedMap(owned: readonly OwnedEntry[]): Map<number, OwnedEntry> {
  return new Map(owned.map((o) => [o.n, o]));
}

/** Cards owned that exist in this catalog (an old card number that left the pool is not counted). */
export function ownedCount(cards: readonly SlimCard[], owned: Map<number, OwnedEntry>): number {
  let n = 0;
  for (const c of cards) if (owned.has(c.n)) n++;
  return n;
}

export function countByKind(cards: readonly SlimCard[], owned: Map<number, OwnedEntry>): Record<CardKind, { own: number; all: number }> {
  const out: Record<CardKind, { own: number; all: number }> = { idol: { own: 0, all: 0 }, group: { own: 0, all: 0 }, event: { own: 0, all: 0 } };
  for (const c of cards) {
    out[c.kind].all++;
    if (owned.has(c.n)) out[c.kind].own++;
  }
  return out;
}

/** Extras: every copy above one, and the shards they are worth (the exact figure the Recycle button prints). */
export function extras(cards: readonly SlimCard[], owned: Map<number, OwnedEntry>): { n: number; shards: number } {
  let n = 0;
  let shards = 0;
  for (const c of cards) {
    const o = owned.get(c.n);
    if (o && o.copies > 1) {
      n += o.copies - 1;
      shards += (o.copies - 1) * SHARDS[c.rarity];
    }
  }
  return { n, shards };
}

export interface Filters { q: string; kind: 'all' | CardKind; rar: Partial<Record<Rarity, boolean>>; show: 'all' | 'owned' | 'missing' | 'fav' }
export const NO_FILTERS: Filters = { q: '', kind: 'all', rar: {}, show: 'all' };

export function filterItems(items: readonly BinderItem[], f: Filters, owned: Map<number, OwnedEntry>): BinderItem[] {
  const q = f.q.trim().toLowerCase();
  const anyR = RARITIES.some((r) => f.rar[r]);
  return items.filter((it) => {
    const kind: CardKind = it.locked ? 'idol' : it.card.kind;
    const rar = it.locked ? it.rarity : it.card.rarity;
    const name = it.locked ? it.name : it.card.name;
    if (f.kind !== 'all' && kind !== f.kind) return false;
    if (anyR && !f.rar[rar]) return false;
    const own = it.locked ? undefined : owned.get(it.card.n);
    if (f.show === 'owned' && !own) return false;
    if (f.show === 'missing' && own) return false;
    if (f.show === 'fav' && !(own && own.fav)) return false;
    if (q) {
      const grp = (it.locked ? it.group : it.card.group) ?? '';
      if (!`${name} ${grp}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export type SortKey = 'rarity' | 'number' | 'newest';
export const SORTS: { key: SortKey; label: string; hint: string }[] = [
  { key: 'rarity', label: 'Rarity', hint: 'Legendary first, then by number' },
  { key: 'number', label: 'Number', hint: 'By card number' },
  { key: 'newest', label: 'Newest', hint: 'Last pulled first' },
];

/** The grid order. Rarity: owned first, Legendary down, then by number. Newest: last pulled first, then by number. */
export function sortItems(list: readonly BinderItem[], sort: SortKey, owned: Map<number, OwnedEntry>): BinderItem[] {
  const out = list.slice();
  const rank = (it: BinderItem): number => RARITIES.indexOf(it.locked ? it.rarity : it.card.rarity);
  const own = (it: BinderItem): number => (!it.locked && owned.has(it.card.n) ? 1 : 0);
  const at = (it: BinderItem): number => (it.locked ? -Infinity : Date.parse(owned.get(it.card.n)?.at ?? '') || -Infinity);
  if (sort === 'rarity') out.sort((a, b) => own(b) - own(a) || rank(b) - rank(a) || a.i - b.i);
  else if (sort === 'newest') out.sort((a, b) => { const ta = at(a); const tb = at(b); return ta !== tb ? (tb > ta ? 1 : -1) : a.i - b.i; });
  return out;
}

export interface BinderPage { sec: string; items: BinderItem[]; cont: boolean }
/** Pages of nine pockets, one group per run of pages: a section never shares a page with the next one. */
export function paginate(list: readonly BinderItem[], perPage = 9): BinderPage[] {
  const out: BinderPage[] = [];
  let c: BinderPage | null = null;
  for (const it of list) {
    if (!c || c.sec !== it.sec || c.items.length >= perPage) {
      c = { sec: it.sec, items: [], cont: !!(c && c.sec === it.sec) };
      out.push(c);
    }
    c.items.push(it);
  }
  return out;
}

export const rarityName = (r: Rarity): string => RARITY_NAMES[r];

/** mm:ss for the next-pack timer. */
export function fmtClock(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "3 h 04" until midnight. */
export function fmtHours(ms: number): string {
  const m = Math.floor(Math.max(0, ms) / 60000);
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

/** The accessible name of a card: name, edition, rarity. */
export function cardLabel(c: SlimCard, editionName: string): string {
  return `${c.name}, ${editionName}, ${RARITY_NAMES[c.rarity]}`;
}

/** What the Drop rates box prints, taken from the server's odds (rules.ts computeOdds over the real catalog). Nothing is typed here. */
export interface OddsView {
  /** Rarities with a card in packs, in the plan's order. */
  present: Rarity[];
  /** Rarities with no card yet: never drawable, never listed in the table. */
  absent: Rarity[];
  each: Partial<Record<Rarity, number>>;
  fifth: Partial<Record<Rarity, number>>;
  eachWords: string;
  fifthWords: string;
}

const num = (v: number): string => String(Number(v.toFixed(4)));
const pct = (v: number): string => `${v.toFixed(2)}%`;
const list = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function oddsView(odds: CatalogOdds | null): OddsView {
  const present = odds ? RARITIES.filter((r) => odds.available.includes(r)) : [];
  const absent = RARITIES.filter((r) => !present.includes(r));
  if (!odds || present.length === 0) return { present: [], absent: [...RARITIES], each: {}, fifth: {}, eachWords: 'No card is in packs yet.', fifthWords: '' };
  const w = odds.planWeights;
  const total = odds.availableWeightTotal;
  const each: OddsView['each'] = {};
  const fifth: OddsView['fifth'] = {};
  for (const r of present) { each[r] = odds.card[r]; if (odds.fifth[r] > 0) fifth[r] = odds.fifth[r]; }
  const hasC = present.includes('C');
  const lift = hasC ? present.find((r) => r !== 'C') : undefined;
  const eachWords = absent.length === 0
    ? `Every rarity has cards, so the plan's odds apply as they are: ${present.map((r) => `${RARITY_NAMES[r]} ${num(w[r])}`).join(', ')} (a total of ${num(total)}).`
    : `Only ${list(present.map((r) => RARITY_NAMES[r]))} cards exist so far, so their odds from the plan (${list(present.map((r) => num(w[r])))}) are scaled to 100: ${present.map((r) => `${num(w[r])} / ${num(total)} = ${pct(each[r] as number)}`).join(', ')}.`;
  const parts = present.filter((r) => fifth[r] !== undefined).map((r) => `${r === lift ? `(${num(w[r])} + ${num(w.C)})` : num(w[r])} / ${num(total)} = ${pct(fifth[r] as number)}`);
  const fifthWords = lift
    ? `The fifth card is drawn the same way, and a Common there becomes ${lift === 'U' ? 'an Uncommon' : `a ${RARITY_NAMES[lift]}`}: ${parts.join(', ')}.`
    : 'The fifth card is drawn the same way.';
  return { present, absent, each, fifth, eachWords, fifthWords };
}
