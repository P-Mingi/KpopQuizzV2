// Bunnyverse Cards, lane U: the pure model of the pages. From the catalog (cards and entities) it builds the slim cards, the pockets of
// the binder (a card, or an edition that cannot exist yet with its reason sentence), the sections, and the numbers the pages print.
// Nothing here invents a number: every count is taken from the catalog and from the player's state.
import { KIND_RARITIES, RARITIES, RARITY_NAMES, SHARDS } from './rules';
import { paletteFor } from './ui-palette';

import type { CardKind, LockReason, OwnedEntry, Rarity } from './types';
import type { BinderItem, BinderSection, SlimCard, SlimCatalog, UiCard, UiCatalog, UiPhoto } from './ui-types';

/** The address of a photo: the ready one (fixture) or the file in the public `cards` bucket. */
export function photoSrc(photo: UiPhoto | null, base: string | null = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null): string | null {
  if (!photo) return null;
  if (photo.src) return photo.src;
  if (photo.storagePath && base) return `${base.replace(/\/$/, '')}/storage/v1/object/public/cards/${photo.storagePath.replace(/^\//, '')}`;
  return null;
}

export function slimCard(c: UiCard, entityType: string | null = null): SlimCard {
  return {
    n: c.n, num: c.num, entity: c.entity, kind: c.kind, rarity: c.rarity, edition: c.edition, name: c.name, group: c.group, debutYear: c.debutYear,
    img: photoSrc(c.photo), fx: c.photo?.focalX ?? 50, fy: c.photo?.focalY ?? 25, sub: entityType,
  };
}

const slug = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const EVENTS_SECTION = 'events';

/** Builds the slim catalog: ordered pockets (idols, then the group cards, per group, then the events), the sections and the locks. */
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
    const secName = e.kind === 'event' ? 'Events' : e.kind === 'group' ? e.name : (e.group ?? e.name);
    const sec = e.kind === 'event' ? EVENTS_SECTION : slug(secName);
    if (!seen.has(sec)) {
      seen.add(sec);
      sections.push({ id: sec, name: secName, color: e.kind === 'event' ? paletteFor('events').dot : paletteFor(`group:${secName}`).dot, ns: [] });
    }
    const have = new Map((byEntity.get(e.id) ?? []).map((c) => [c.rarity, c]));
    const lk: Partial<Record<Rarity, LockReason | null>> = {};
    for (const r of KIND_RARITIES[e.kind]) {
      const c = have.get(r);
      if (c) {
        items.push({ i: items.length, sec, card: slimCard(c, e.eventType ?? null) });
        sections.find((x) => x.id === sec)!.ns.push(c.n);
      }
      else {
        const reason = e.lockReasons[r] ?? null;
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
