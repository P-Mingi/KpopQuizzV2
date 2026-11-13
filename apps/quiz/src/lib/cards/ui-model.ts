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
    part: c.part === 1 || c.part === 2 ? c.part : 0, pairN: c.part === 1 || c.part === 2 ? (c.pairN ?? null) : null,
    ...(c.endYear ? { endYear: c.endYear } : {}),
  };
}

/** The group line of a person without one (decision 18, review 1 finding 12): 101 gives a person a group line only when the idols row sits
 *  in another group, so none means a soloist. */
export const SOLOIST = 'Soloist';

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
    // Lot 2: a rarity holds one card, or for a group the two halves of a pair (part 1 then part 2, consecutive in the items).
    const have = new Map<Rarity, UiCard[]>();
    for (const c of byEntity.get(e.id) ?? []) {
      const l = have.get(c.rarity);
      if (l) l.push(c);
      else have.set(c.rarity, [c]);
    }
    for (const l of have.values()) l.sort((a, b) => (a.part ?? 0) - (b.part ?? 0) || a.n - b.n);
    const lk: Partial<Record<Rarity, LockReason | null>> = {};
    for (const r of ladderRarities(e.kind)) {
      const cs = have.get(r);
      if (cs) {
        for (const c of cs) {
          items.push({ i: items.length, sec, card: slimCard(c, e.eventType ?? null) });
          sections.find((x) => x.id === sec)!.ns.push(c.n);
        }
      }
      else {
        const reason = lockReasonOf(e.lockReasons, r);
        lk[r] = reason;
        const anchor = (byEntity.get(e.id) ?? [])[0]?.num ?? null;
        items.push({ i: items.length, sec, locked: true, entity: e.id, name: e.name, group: e.kind === 'idol' ? e.group : e.kind === 'group' ? e.name : null, rarity: r, reason, anchor });
      }
    }
    locks[e.id] = lk;
    // The ladder of editions points at the first card of a rarity (the left half of a pair).
    editions[e.id] = Object.fromEntries([...have].map(([r, cs]) => [r, cs[0]!.n]));
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

/**
 * Lot 2: the pockets as units. The two halves of a group pair (part 1 then part 2 of the same subject, linked by pairN) are ONE unit that is
 * never split: not by a filter, a sort, a row or a page. Every other pocket is a unit of its own.
 */
export function isPairStart(a: BinderItem | null | undefined, b: BinderItem | null | undefined): boolean {
  return !!a && !!b && !a.locked && !b.locked && a.card.part === 1 && b.card.part === 2 && b.card.entity === a.card.entity && a.card.pairN === b.card.n;
}

export function binderUnits(list: readonly BinderItem[]): BinderItem[][] {
  const out: BinderItem[][] = [];
  for (let k = 0; k < list.length; k++) {
    const a = list[k]!;
    const b = list[k + 1];
    if (isPairStart(a, b)) {
      out.push([a, b!]);
      k++;
    } else out.push([a]);
  }
  return out;
}

export function filterItems(items: readonly BinderItem[], f: Filters, owned: Map<number, OwnedEntry>): BinderItem[] {
  const q = f.q.trim().toLowerCase();
  const anyR = RARITIES.some((r) => f.rar[r]);
  const matches = (it: BinderItem): boolean => {
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
  };
  // A pair shows when either half matches, and then shows whole.
  return binderUnits(items).filter((u) => u.some(matches)).flat();
}

export type SortKey = 'rarity' | 'number' | 'newest';
export const SORTS: { key: SortKey; label: string; hint: string }[] = [
  { key: 'rarity', label: 'Rarity', hint: 'Legendary first, then by number' },
  { key: 'number', label: 'Number', hint: 'By card number' },
  { key: 'newest', label: 'Newest', hint: 'Last pulled first' },
];

/** The grid order. Rarity: owned first, Legendary down, then by number. Newest: last pulled first, then by number. A pair sorts as one unit
 *  (owned when either half is, newest by its latest half, by number from its first half) and stays together. */
export function sortItems(list: readonly BinderItem[], sort: SortKey, owned: Map<number, OwnedEntry>): BinderItem[] {
  const out = binderUnits(list);
  const rank = (u: BinderItem[]): number => { const it = u[0]!; return RARITIES.indexOf(it.locked ? it.rarity : it.card.rarity); };
  const own = (u: BinderItem[]): number => (u.some((it) => !it.locked && owned.has(it.card.n)) ? 1 : 0);
  const at = (u: BinderItem[]): number => Math.max(...u.map((it) => (it.locked ? -Infinity : Date.parse(owned.get(it.card.n)?.at ?? '') || -Infinity)));
  // The prototype's rule (owned first, then rarity, Legendary first), with the locked pockets after the issued cards: in a catalog where
  // every Era and Full Art is locked (amendment 1) the grid would otherwise open on pages of empty pockets (decision 31).
  const locked = (u: BinderItem[]): number => (u[0]!.locked ? 1 : 0);
  if (sort === 'rarity') out.sort((a, b) => own(b) - own(a) || locked(a) - locked(b) || rank(b) - rank(a) || a[0]!.i - b[0]!.i);
  else if (sort === 'newest') out.sort((a, b) => { const ta = at(a); const tb = at(b); return ta !== tb ? (tb > ta ? 1 : -1) : a[0]!.i - b[0]!.i; });
  return out.flat();
}

export interface BinderPage {
  sec: string;
  items: BinderItem[];
  cont: boolean;
  /** The cells of the page in reading order: a pocket, or null for a cell left empty so a pair starts in its row (a pair takes two cells
   *  of one row). Not padded to the page size. */
  cells: (BinderItem | null)[];
}
/** Pages of nine pockets (3 a row), one group per run of pages: a section never shares a page with the next one, and a pair is never cut:
 *  it takes two cells of one row (a cell is left empty when only one is free in the row) and never starts a page it cannot finish. */
export function paginate(list: readonly BinderItem[], perPage = 9, cols = 3): BinderPage[] {
  const out: BinderPage[] = [];
  let c: BinderPage | null = null;
  for (const u of binderUnits(list)) {
    const it = u[0]!;
    const pad = u.length === 2 && cols > 1 && c && c.cells.length % cols === cols - 1 ? 1 : 0;
    if (!c || c.sec !== it.sec || c.cells.length + pad + u.length > perPage) {
      c = { sec: it.sec, items: [], cells: [], cont: !!(c && c.sec === it.sec) };
      out.push(c);
    } else if (pad) c.cells.push(null);
    for (const x of u) { c.items.push(x); c.cells.push(x); }
  }
  return out;
}

/** The grid pages: `perPage` cells a page, a pair counting as 2 and never cut across two pages. */
export function gridPages(list: readonly BinderItem[], perPage = 36): BinderItem[][] {
  const out: BinderItem[][] = [];
  let used = 0;
  for (const u of binderUnits(list)) {
    if (!out.length || used + u.length > perPage) { out.push([]); used = 0; }
    out[out.length - 1]!.push(...u);
    used += u.length;
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
  /** Lot 2: the order of the draw in plain sentences, from the odds only. Empty when the odds hold no subject and card counts (older payloads). */
  drawSteps: string[];
  /** Lot 2: per rarity, the split between types (soloists and members, groups, events), from odds.kinds. */
  typeSplit: string[];
  /** Lot 2: the chance of one given card, per rarity and type: each[r] x kinds[r][k] / 100 / subjects[r][k] x subjects[r][k] / cards[r][k]. */
  cardChance: { r: Rarity; kind: CardKind; subjects: number; cards: number; pct: number; label: string }[];
}

const KIND_WORDS: Record<CardKind, string> = { idol: 'soloists and members', group: 'groups', event: 'events' };
const KIND_ORDER: readonly CardKind[] = ['idol', 'group', 'event'];

/** Lot 2: what the odds say about the type and the subject, never typed. Empty without subject and card counts. */
function drawView(odds: CatalogOdds, present: readonly Rarity[]): Pick<OddsView, 'drawSteps' | 'typeSplit' | 'cardChance'> {
  const none = { drawSteps: [], typeSplit: [], cardChance: [] };
  const subj = odds.subjects;
  const cards = odds.cards;
  if (!subj || !cards) return none;
  const typeSplit: string[] = [];
  const cardChance: OddsView['cardChance'] = [];
  let halves = false;
  for (const r of present) {
    const ks = KIND_ORDER.filter((k) => (odds.kinds[r]?.[k] ?? 0) > 0 && (subj[r]?.[k] ?? 0) > 0 && (cards[r]?.[k] ?? 0) > 0);
    if (ks.length === 0) continue;
    typeSplit.push(`${RARITY_NAMES[r]}: ${list(ks.map((k) => `${KIND_WORDS[k]} ${num(Number((odds.kinds[r][k] as number).toFixed(2)))}%`))}.`);
    for (const k of ks) {
      const s = subj[r][k] as number;
      const c = cards[r][k] as number;
      if (c > s) halves = true;
      const p = (odds.card[r] * (odds.kinds[r][k] as number) / 100 / s) * s / c;
      cardChance.push({ r, kind: k, subjects: s, cards: c, pct: p, label: `${RARITY_NAMES[r]}, ${KIND_WORDS[k]}: ${pct(p)} for each of the ${c} cards.` });
    }
  }
  if (typeSplit.length === 0) return none;
  const halfWords = 'For a group, then one of its two halves at random, so a pair never makes a group come out more often.';
  // Owner decision 2026-11-13: until the catalog has the plan's form, no kind weight: every subject of the rarity has the same chance.
  const drawSteps = odds.kindWeights === false
    ? [
        'A card is drawn in steps. First its rarity, from the table above.',
        'Then one subject at random among all those with a card of that rarity: a soloist, a member and a group have the same chance, so the split by type below follows the number of subjects.',
        ...(halves ? [halfWords] : []),
      ]
    : [
        'A card is drawn in steps. First its rarity, from the table above.',
        'Then its type, with the split of that rarity listed below.',
        halves ? `Then one subject of that type at random. ${halfWords}` : 'Then one subject of that type at random.',
      ];
  return { drawSteps, typeSplit, cardChance };
}

/** "left half" or "right half" of a group photo, '' for a whole card. */
export function partWord(c: Pick<SlimCard, 'part'>): string {
  return c.part === 1 ? 'left half' : c.part === 2 ? 'right half' : '';
}

const num = (v: number): string => String(Number(v.toFixed(4)));
const pct = (v: number): string => `${v.toFixed(2)}%`;
const list = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function oddsView(odds: CatalogOdds | null): OddsView {
  const present = odds ? RARITIES.filter((r) => odds.available.includes(r)) : [];
  const absent = RARITIES.filter((r) => !present.includes(r));
  if (!odds || present.length === 0) return { present: [], absent: [...RARITIES], each: {}, fifth: {}, eachWords: 'No card is in packs yet.', fifthWords: '', drawSteps: [], typeSplit: [], cardChance: [] };
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
  return { present, absent, each, fifth, eachWords, fifthWords, ...drawView(odds, present) };
}
