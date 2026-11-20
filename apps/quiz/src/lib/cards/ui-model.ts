// Bunnyverse Cards, lane U: the pure model of the pages. From the catalog (cards and entities) it builds the slim cards, the pockets of
// the binder (a card, or an edition that cannot exist yet with its reason sentence), the sections, and the numbers the pages print.
// Nothing here invents a number: every count is taken from the catalog and from the player's state.
import { RARITIES, RARITY_LABEL, SHARDS, creditLine } from './rules';
import { paletteFor } from './ui-palette';

import type { CardKind, CatalogOdds, LockReason, OwnedEntry, Rarity } from './types';
import type { BinderItem, BinderSection, CardPicture, PanoPicture, SlimCard, SlimCatalog, SlimPano, UiCard, UiCatalog, UiEntity, UiPanorama, UiPhoto } from './ui-types';

/** The picture of a card (amendment 1, point 7): the cropped WebP while it was cut at the current focal point, else the source photo. */
export function photoPicture(photo: UiPhoto | null): CardPicture | null {
  if (!photo) return null;
  if (photo.src) return { src: photo.src, srcSet: null, cut: false };
  const fresh = photo.fileFocalX != null && photo.fileFocalY != null && photo.fileFocalX === (photo.focalX ?? 50) && photo.fileFocalY === (photo.focalY ?? 50);
  if (photo.url && fresh) return { src: photo.url, srcSet: photo.url2x ? `${photo.url} 1x, ${photo.url2x} 2x` : null, cut: true };
  if (photo.sourceUrl) return { src: photo.sourceUrl, srcSet: null, cut: false };
  return null;
}

/** Lot 3 point A5: a rate as the page prints it ("0.3%", "10%"): at most two decimals, none when it is a whole number. Computed from the odds. */
export function fmtRate(v: number): string {
  return `${Number(v.toFixed(2))}%`;
}

/** Lot 3 point A5: the chance of one card being of each rarity, as printed (only the rarities that exist in packs), from computeOdds. */
export function rateLabels(odds: CatalogOdds | null): Partial<Record<Rarity, string>> {
  const out: Partial<Record<Rarity, string>> = {};
  if (!odds) return out;
  for (const r of RARITIES) if (odds.available.includes(r) && odds.card[r] > 0) out[r] = fmtRate(odds.card[r]);
  return out;
}

/** The small label a Full Art card carries ("0.3%"): its rarity's rate from the odds the page shows. null when there is none. */
export function fullArtRate(odds: CatalogOdds | null): string | null {
  return rateLabels(odds).L ?? null;
}

export function slimCard(c: UiCard, entityType: string | null = null, rate: string | null = null): SlimCard {
  const img = photoPicture(c.photo);
  return {
    n: c.n, num: c.num, entity: c.entity, kind: c.kind, rarity: c.rarity, edition: c.edition, name: c.name, group: c.group, debutYear: c.debutYear,
    img, fx: c.photo?.focalX ?? 50, fy: c.photo?.focalY ?? 30, sub: entityType,
    // Owner decision 2026-11-18: out of packs with no picture now = the "New photo coming" frame; with a picture again it is an ordinary card.
    ...(c.retired && !img ? { soon: true as const } : {}),
    part: c.part === 1 || c.part === 2 || c.part === 3 ? c.part : 0, pairN: c.part === 1 || c.part === 2 ? (c.pairN ?? null) : null,
    // Lot 7: a part keeps the size of its set, the numbers of every part and the number of its panorama.
    ...(c.part && c.parts ? { parts: c.parts } : {}), ...(c.part && c.setNs ? { setNs: c.setNs } : {}), ...(c.part && c.pano !== undefined ? { pano: c.pano } : {}),
    ...(c.endYear ? { endYear: c.endYear } : {}),
    ...(rate && c.rarity === 'L' ? { rate } : {}),
  };
}

/** Lot 7: the picture of a panorama: its own file (the whole window), else the parts' files side by side, else the source photo that CSS crops. */
export function panoPicture(p: UiPanorama): PanoPicture | null {
  const i = p.image;
  if (!i) return null;
  if (i.url) return { kind: 'file', src: i.url, srcSet: i.url2x ? `${i.url} 1x, ${i.url2x} 2x` : null, parts: [] };
  if (i.partUrls && i.partUrls.length === p.parts) return { kind: 'parts', src: i.partUrls[0]!, srcSet: null, parts: [...i.partUrls] };
  if (i.sourceUrl) return { kind: 'source', src: i.sourceUrl, srcSet: null, parts: [] };
  return null;
}

/** Lot 7: a catalog panorama as the pages draw it. */
export function slimPano(p: UiPanorama, entity?: Pick<UiEntity, 'debutYear' | 'endYear'>): SlimPano {
  return {
    p: p.p, num: p.num, entity: p.entity, rarity: p.rarity, edition: p.edition, name: p.name, debutYear: entity?.debutYear ?? null,
    ...(entity?.endYear ? { endYear: entity.endYear } : {}), parts: p.parts, cards: [...p.cards], img: panoPicture(p),
    fx: p.image?.focalX ?? 50, fy: p.image?.focalY ?? 50, credit: p.photo ? creditLine(p.photo, p.photo.slot) : null,
  };
}

/** The id of the Panoramas section of the binder (/kpopcards/collection/panoramas). */
export const PANO_SECTION = 'panoramas';

/** The group line of a person without one (decision 18, review 1 finding 12): 101 gives a person a group line only when the idols row sits
 *  in another group, so none means a soloist. */
export const SOLOIST = 'Soloist';

const slug = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const EVENTS_SECTION = 'events';
/** The section of every person without a group line (the prototype's "Soloists" page of the binder). */
export const SOLOISTS_SECTION = 'Soloists';

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
/**
 * Lot 7 (integrator, 2026-11-17): the labels of the pockets of a group edition that cannot exist yet. Its photo does not exist, so its size
 * is not known: it follows the group's issued editions, 3 pockets ("1/3", "2/3", "3/3") when most of them are in 3 cards (a tie gives 3),
 * else 2 ("1/2", "2/2"), as before lot 7 for a group with no card in 3.
 */
export function lockedPartLabels(issued: ReadonlyArray<ReadonlyArray<Pick<UiCard, 'part'>>>): string[] {
  const sets = issued.filter((cs) => cs.length >= 2 && cs.every((c) => !!c.part));
  const three = sets.filter((cs) => cs.length === 3).length;
  const n = three > 0 && three * 2 >= sets.length ? 3 : 2;
  return Array.from({ length: n }, (_, k) => ` ${k + 1}/${n}`);
}

export function buildSlim(cat: UiCatalog): SlimCatalog {
  const byEntity = new Map<string, UiCard[]>();
  for (const c of cat.cards) {
    const l = byEntity.get(c.entity);
    if (l) l.push(c);
    else byEntity.set(c.entity, [c]);
  }
  const typeOf = new Map(cat.entities.map((e) => [e.id, e.eventType ?? null]));
  const faRate = fullArtRate(cat.odds);
  const cards = cat.cards.map((c) => slimCard(c, typeOf.get(c.entity) ?? null, faRate));
  // Lot 7: the panorama of each group edition hangs under the last part of its photo.
  const entityOf = new Map(cat.entities.map((e) => [e.id, e] as const));
  const panos = (cat.panoramas ?? []).map((p) => slimPano(p, entityOf.get(p.entity)));
  const panoOf = new Map(panos.map((p) => [`${p.entity}|${p.rarity}`, p] as const));
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
    if (e.locked) continue; // never has a card; its pocket is added below
    const secName = e.kind === 'event' ? 'Events' : e.kind === 'group' ? e.name : (e.group ?? SOLOISTS_SECTION);
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
    const lockedHalves = e.kind === 'group' ? lockedPartLabels([...have.values()]) : [''];
    const lk: Partial<Record<Rarity, LockReason | null>> = {};
    for (const r of ladderRarities(e.kind)) {
      const cs = have.get(r);
      if (cs) {
        const hung = e.kind === 'group' && cs.length >= 2 && cs.every((c) => !!c.part) ? panoOf.get(`${e.id}|${r}`) : undefined;
        cs.forEach((c, k) => {
          items.push({ i: items.length, sec, card: slimCard(c, e.eventType ?? null, faRate), ...(hung && k === cs.length - 1 ? { pano: hung } : {}) });
          sections.find((x) => x.id === sec)!.ns.push(c.n);
        });
      }
      else {
        const reason = lockReasonOf(e.lockReasons, r);
        lk[r] = reason;
        const anchor = (byEntity.get(e.id) ?? [])[0]?.num ?? null;
        // A group edition that cannot exist yet shows its parts, as the prototype does ("TWICE 1/2", "TWICE 2/2"); lot 7: a group whose
        // issued editions are in 3 cards shows "1/3", "2/3", "3/3" (lockedPartLabels).
        for (const half of lockedHalves) {
          items.push({ i: items.length, sec, locked: true, entity: e.id, name: `${e.name}${half}`, group: e.kind === 'idol' ? e.group : e.kind === 'group' ? e.name : null, rarity: r, reason, anchor });
        }
      }
    }
    locks[e.id] = lk;
    // The ladder of editions points at the first card of a rarity (the left half of a pair).
    editions[e.id] = Object.fromEntries([...have].map(([r, cs]) => [r, cs[0]!.n]));
  }
  addSoonPockets(entities, items, sections, seen);
  // Lot 7: the Panoramas section has its own count (over the panoramas, never over the cards), after every group.
  if (panos.length) sections.push({ id: PANO_SECTION, name: 'Panoramas', color: paletteFor('panoramas').dot, ns: [], panos: panos.map((p) => p.p) });
  const typeOfEntity = new Map(cat.entities.map((e) => [e.id, e.eventType ?? null] as const));
  const retired = (cat.retired ?? []).map((c) => slimCard(c, typeOfEntity.get(c.entity) ?? null, faRate));
  return { cards, items, sections, locks, editions, panos, retired };
}

/** The section a card of a subject belongs to (the id buildSlim gives it). */
function sectionOf(c: Pick<SlimCard, 'kind' | 'name' | 'group'>): { id: string; name: string } {
  const name = c.kind === 'event' ? 'Events' : c.kind === 'group' ? c.name : (c.group ?? SOLOISTS_SECTION);
  return { id: c.kind === 'event' ? EVENTS_SECTION : slug(name), name };
}

/**
 * Owner decision 2026-11-18: the cards a player owns that are out of packs stay in the binder. Each one takes the pocket of its edition (the locked
 * pocket "Not issued" of its subject), or, when the subject has no pocket for it, a place at the end of its section (a section is made if the subject's
 * group has none). The card is a SlimCard with `soon` (the "New photo coming" frame) until a photo is live again. Pure; the same catalog comes
 * back when the player owns none. `cards` is left as it is (these cards are out of the pool and the odds), but they COUNT for their owner: each one
 * joins the numbers of its section (`ns`, so the progress of the group and its "complete" mark keep it) and countedCards() gives the cards a count reads.
 */
export function withOwnedRetired(cat: SlimCatalog, owned: ReadonlyMap<number, unknown>): SlimCatalog {
  const mine = cat.retired.filter((c) => owned.has(c.n)).sort((a, b) => a.n - b.n);
  if (mine.length === 0) return cat;
  const items: BinderItem[] = cat.items.slice();
  let sections: BinderSection[] = cat.sections.slice();
  const joined = new Map<string, number[]>();
  const join = (sec: string, n: number): void => { joined.set(sec, [...(joined.get(sec) ?? []), n]); };
  for (const c of mine) {
    const at = items.findIndex((it) => it.locked && !it.soon && it.entity === c.entity && it.rarity === c.rarity);
    if (at >= 0) {
      items[at] = { i: at, sec: items[at]!.sec, card: c };
      join(items[at]!.sec, c.n);
      continue;
    }
    const sec = sectionOf(c);
    const known = sections.findIndex((x) => x.id === sec.id);
    if (known < 0) {
      const color = c.kind === 'event' ? paletteFor('events').dot : paletteFor(`group:${sec.name}`).dot;
      const pano = sections.findIndex((x) => x.id === PANO_SECTION);
      sections = pano < 0 ? [...sections, { id: sec.id, name: sec.name, color, ns: [] }] : [...sections.slice(0, pano), { id: sec.id, name: sec.name, color, ns: [] }, ...sections.slice(pano)];
    } else if (sections[known]!.soon) {
      const { soon: _soon, ...rest } = sections[known]!;
      sections[known] = rest;
    }
    let last = -1;
    items.forEach((it, k) => { if (it.sec === sec.id) last = k; });
    items.splice(last < 0 ? items.length : last + 1, 0, { i: 0, sec: sec.id, card: c });
    join(sec.id, c.n);
  }
  sections = sections.map((x) => (joined.has(x.id) ? { ...x, ns: [...x.ns, ...joined.get(x.id)!] } : x));
  return { ...cat, items: items.map((it, k) => ({ ...it, i: k })), sections };
}

/** The cards a count reads for one player: the cards in packs and the ones he owns that are out of packs (owner decision 2026-11-18). Never the pool of a draw. */
export function countedCards(cat: Pick<SlimCatalog, 'cards' | 'retired'>, owned: ReadonlyMap<number, unknown>): SlimCard[] {
  const mine = (cat.retired ?? []).filter((c) => owned.has(c.n));
  return mine.length === 0 ? cat.cards : [...cat.cards, ...mine];
}

/**
 * Lot 6: the pockets of the age-locked subjects. Each one has its name and no more ("Card coming"): no rarity, no number, no date, no link.
 * A person gets one pocket, a group its pair (1/2 and 2/2). They go into the section of the group (the person's group line, the group's own
 * name), after its last pocket; a section with nothing else is marked `soon` so no pack and no lobby box is made from it. They add nothing
 * to `cards`, `locks`, `editions` or a section's card numbers: nothing counts them.
 */
function addSoonPockets(entities: readonly UiEntity[], items: BinderItem[], sections: BinderSection[], seen: Set<string>): void {
  for (const e of entities) {
    if (!e.locked || e.kind === 'event') continue;
    const secName = e.kind === 'group' ? e.name : (e.group ?? SOLOISTS_SECTION);
    const sec = slug(secName);
    if (!seen.has(sec)) {
      seen.add(sec);
      sections.push({ id: sec, name: secName, color: paletteFor(`group:${secName}`).dot, ns: [], soon: true });
    }
    let at = -1;
    items.forEach((it, k) => { if (it.sec === sec) at = k; });
    const pockets: BinderItem[] = (e.kind === 'group' ? [' 1/2', ' 2/2'] : ['']).map((half) => ({
      i: 0, sec, locked: true as const, soon: true as const, entity: e.id, name: `${e.name}${half}`, group: e.kind === 'idol' ? e.group : e.name, rarity: 'C' as Rarity,
      reason: null, anchor: null,
    }));
    items.splice(at < 0 ? items.length : at + 1, 0, ...pockets);
  }
  items.forEach((it, k) => { it.i = k; });
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
export function extras(cards: readonly SlimCard[], owned: Map<number, OwnedEntry>, recyclable = false): { n: number; shards: number } {
  let n = 0;
  let shards = 0;
  for (const c of cards) {
    const o = owned.get(c.n);
    // `recyclable`: Gold and Full Art extras are never recycled (the prototype's extras(), and the server's recycle since 110).
    if (o && o.copies > 1 && !(recyclable && (c.rarity === 'UR' || c.rarity === 'L'))) {
      n += o.copies - 1;
      shards += (o.copies - 1) * SHARDS[c.rarity];
    }
  }
  return { n, shards };
}

export interface Filters { q: string; kind: 'all' | CardKind; rar: Partial<Record<Rarity, boolean>>; show: 'all' | 'owned' | 'missing' | 'fav' }
export const NO_FILTERS: Filters = { q: '', kind: 'all', rar: {}, show: 'all' };

/**
 * Lot 2: the pockets as units. The parts of a group photo (part 1, then 2, then 3 for a photo in 3 cards) of one subject and edition are ONE
 * unit that is never split: not by a filter, a sort, a row or a page. Every other pocket is a unit of its own. Lot 7: a pair may now be a run of 3.
 */
export function isPairStart(a: BinderItem | null | undefined, b: BinderItem | null | undefined): boolean {
  return !!a && !!b && !a.locked && !b.locked && a.card.part === 1 && b.card.part === 2 && b.card.entity === a.card.entity && a.card.pairN === b.card.n;
}

/** Lot 7: `b` is the part after `a` in the same set (same subject and edition, the next part number, and listed in the set's numbers). */
export function isNextPart(a: BinderItem | null | undefined, b: BinderItem | null | undefined): boolean {
  if (!a || !b || a.locked || b.locked) return false;
  const x = a.card;
  const y = b.card;
  if (!x.part || y.part !== x.part + 1 || y.entity !== x.entity || y.rarity !== x.rarity) return false;
  return x.setNs ? x.setNs.includes(y.n) : x.pairN === y.n;
}

export function binderUnits(list: readonly BinderItem[]): BinderItem[][] {
  const out: BinderItem[][] = [];
  for (let k = 0; k < list.length; k++) {
    const a = list[k]!;
    if (!a.locked && a.card.part === 1 && isNextPart(a, list[k + 1])) {
      const u: BinderItem[] = [a, list[k + 1]!];
      const size = a.card.parts ?? 2;
      while (u.length < size && isNextPart(u[u.length - 1], list[k + u.length])) u.push(list[k + u.length]!);
      out.push(u);
      k += u.length - 1;
    } else out.push([a]);
  }
  return out;
}

export function filterItems(items: readonly BinderItem[], f: Filters, owned: Map<number, OwnedEntry>): BinderItem[] {
  const q = f.q.trim().toLowerCase();
  const anyR = RARITIES.some((r) => f.rar[r]);
  const matches = (it: BinderItem): boolean => {
    // Lot 6: a "Card coming" pocket is never a search result and never a "missing", "owned" or "favourite" card: it shows only with no filter at all.
    if (it.locked && it.soon) return f.show === 'all' && !q && !anyR && f.kind === 'all';
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
  { key: 'rarity', label: 'Edition', hint: 'Full Art first, then by number' },
  { key: 'number', label: 'Number', hint: 'By card number' },
  { key: 'newest', label: 'Newest', hint: 'Last pulled first' },
];

/** The grid order. Rarity: owned first, the highest rarity down, then by number. Newest: last pulled first, then by number. A pair sorts as one unit
 *  (owned when either half is, newest by its latest half, by number from its first half) and stays together. */
export function sortItems(list: readonly BinderItem[], sort: SortKey, owned: Map<number, OwnedEntry>): BinderItem[] {
  // The prototype sorts pockets one by one: the two halves of a pair are two items and part when one is owned and the other is not (the grid still draws a half beside its mate when both sort together).
  const out: BinderItem[][] = list.map((it) => [it]);
  const rank = (u: BinderItem[]): number => { const it = u[0]!; return RARITIES.indexOf(it.locked ? it.rarity : it.card.rarity); };
  const own = (u: BinderItem[]): number => (u.some((it) => !it.locked && owned.has(it.card.n)) ? 1 : 0);
  const at = (u: BinderItem[]): number => Math.max(...u.map((it) => (it.locked ? -Infinity : Date.parse(owned.get(it.card.n)?.at ?? '') || -Infinity)));
  // The prototype's rule (owned first, then rarity, highest first), with the locked pockets after the issued cards: in a catalog where
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
  /** The cells of the page in reading order: a pocket, or null for a cell left empty so a set starts in its row (a pair takes two cells of
   *  one row, a photo in 3 cards a whole row). Not padded to the page size. */
  cells: (BinderItem | null)[];
  /** Lot 7: the cells the page uses, a panorama row counting for a full row (it is not in `cells`). Equal to cells.length without one. */
  used: number;
  /** Lot 7: the panoramas of the page, each in a row of its own: `at` is the index in `cells` it is drawn before (always at a row start). */
  hung: { at: number; pano: SlimPano }[];
}
/** The empty cells needed so a unit of `len` cells does not cross the end of a row (a unit of the row's width starts the row). */
function rowPad(used: number, len: number, cols: number): number {
  if (cols <= 1 || len < 2) return 0;
  const left = (cols - (used % cols)) % cols;
  return left !== 0 && left < len ? left : 0;
}
/** Pages of nine pockets (3 a row), one group per run of pages: a section never shares a page with the next one, and a set is never cut:
 *  a pair takes two cells of one row, a photo in 3 cards a whole row (a cell is left empty when the row cannot hold it), and never starts a
 *  page it cannot finish. Lot 7: the panorama of a set takes the row under its parts, on the same page. `panos` (the Panoramas section) are
 *  paged after every group, one a row. */
export function paginate(list: readonly BinderItem[], perPage = 9, cols = 3, panos: readonly SlimPano[] = []): BinderPage[] {
  const out: BinderPage[] = [];
  let c: BinderPage | null = null;
  for (const u of binderUnits(list)) {
    const it = u[0]!;
    const pano = u[u.length - 1]!.locked ? undefined : (u[u.length - 1] as { pano?: SlimPano }).pano;
    const need = (pano ? Math.ceil(u.length / cols) * cols + cols : u.length);
    const pad = c && c.sec === it.sec ? rowPad(c.used, u.length, cols) : 0;
    if (!c || c.sec !== it.sec || c.used + pad + need > perPage) {
      c = { sec: it.sec, items: [], cells: [], cont: !!(c && c.sec === it.sec), used: 0, hung: [] };
      out.push(c);
    } else for (let k = 0; k < pad; k++) { c.cells.push(null); c.used++; }
    for (const x of u) { c.items.push(x); c.cells.push(x); c.used++; }
    if (pano) {
      // The parts' row is closed with empty pockets, then the panorama takes the row under it.
      while (c.used % cols !== 0) { c.cells.push(null); c.used++; }
      c.hung.push({ at: c.cells.length, pano });
      c.used += cols;
    }
  }
  let pg: BinderPage | null = null;
  for (const p of panos) {
    if (!pg || pg.used + cols > perPage) {
      pg = { sec: PANO_SECTION, items: [], cells: [], cont: !!pg, used: 0, hung: [] };
      out.push(pg);
    }
    pg.hung.push({ at: 0, pano: p });
    pg.used += cols;
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

/** The cells a grid page draws: a page that is not the last one always has its `perPage` cells. A pair is never cut across two pages, so a page
 *  one cell short ends on a plain empty pocket (null: no card, no number, no silhouette). */
export function gridCells(page: readonly BinderItem[], more: boolean, perPage = 36): (BinderItem | null)[] {
  return more && page.length < perPage ? [...page, ...Array.from({ length: perPage - page.length }, () => null)] : [...page];
}

export const rarityName = (r: Rarity): string => RARITY_LABEL[r];

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

/** The accessible name of a card: name and its one rarity name (lot 3 point B4: the edition's name is the rarity's name). */
export function cardLabel(c: SlimCard): string {
  return `${c.name}, ${RARITY_LABEL[c.rarity]}`;
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
  /** The lowest rarity the fifth card can be (the floor of its table), null with no odds. */
  fifthFloor: Rarity | null;
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
    typeSplit.push(`${RARITY_LABEL[r]}: ${list(ks.map((k) => `${KIND_WORDS[k]} ${num(Number((odds.kinds[r][k] as number).toFixed(2)))}%`))}.`);
    for (const k of ks) {
      const s = subj[r][k] as number;
      const c = cards[r][k] as number;
      if (c > s) halves = true;
      const p = (odds.card[r] * (odds.kinds[r][k] as number) / 100 / s) * s / c;
      cardChance.push({ r, kind: k, subjects: s, cards: c, pct: p, label: `${RARITY_LABEL[r]}, ${KIND_WORDS[k]}: ${pct(p)} for each of the ${c} cards.` });
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

/** "left half" or "right half" of a pair, "left third", "middle third" or "right third" of a photo in 3 cards, '' for a whole card. */
export function partWord(c: Pick<SlimCard, 'part'> & { parts?: SlimCard['parts'] }): string {
  if (c.parts === 3) return c.part === 1 ? 'left third' : c.part === 2 ? 'middle third' : c.part === 3 ? 'right third' : '';
  return c.part === 1 ? 'left half' : c.part === 2 ? 'right half' : '';
}

/** Lot 7: "1/3" for the first card of a photo in 3, "2/2" for the second of a pair; '' for a whole card. */
export function partLabel(c: Pick<SlimCard, 'part'> & { parts?: SlimCard['parts'] }): string {
  return c.part ? `${c.part}/${c.parts ?? 2}` : '';
}

/** Lot 7: the panoramas the Panoramas section shows under the binder's filters. A panorama is a group edition: the type filter keeps it for
 *  All and Group photos, the edition filter reads its rarity, "Owned" and "Missing" read the player's panoramas, and no panorama is a favorite
 *  or on the wishlist (those two are about one card). */
export function filterPanos(panos: readonly SlimPano[], f: Filters, owned: ReadonlySet<number>): SlimPano[] {
  const q = f.q.trim().toLowerCase();
  const anyR = RARITIES.some((r) => f.rar[r]);
  return panos.filter((p) => {
    if (f.kind !== 'all' && f.kind !== 'group') return false;
    if (anyR && !f.rar[p.rarity]) return false;
    if (f.show === 'owned' && !owned.has(p.p)) return false;
    if (f.show === 'missing' && owned.has(p.p)) return false;
    if (f.show === 'fav') return false;
    return !q || p.name.toLowerCase().includes(q);
  });
}

/** Lot 7: the owned and the total of the Panoramas section (its own completion, never added to the cards'). */
export function panoCount(panos: readonly SlimPano[], owned: ReadonlySet<number>): { own: number; total: number } {
  return { own: panos.filter((p) => owned.has(p.p)).length, total: panos.length };
}

const num = (v: number): string => String(Number(v.toFixed(4)));
const pct = (v: number): string => `${v.toFixed(2)}%`;
const list = (xs: string[]): string => (xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function oddsView(odds: CatalogOdds | null): OddsView {
  const present = odds ? RARITIES.filter((r) => odds.available.includes(r)) : [];
  const absent = RARITIES.filter((r) => !present.includes(r));
  if (!odds || present.length === 0) return { present: [], absent: [...RARITIES], each: {}, fifth: {}, eachWords: 'No card is in packs yet.', fifthWords: '', fifthFloor: null, drawSteps: [], typeSplit: [], cardChance: [] };
  const w = odds.planWeights;
  const total = odds.availableWeightTotal;
  const each: OddsView['each'] = {};
  const fifth: OddsView['fifth'] = {};
  for (const r of present) { each[r] = odds.card[r]; if (odds.fifth[r] > 0) fifth[r] = odds.fifth[r]; }
  const hasC = present.includes('C');
  const lift = hasC ? present.find((r) => r !== 'C') : undefined;
  const eachWords = absent.length === 0
    ? `Every rarity has cards, so the plan's odds apply as they are: ${present.map((r) => `${RARITY_LABEL[r]} ${num(w[r])}`).join(', ')} (a total of ${num(total)}).`
    : `Only ${list(present.map((r) => RARITY_LABEL[r]))} cards exist so far, so their odds from the plan (${list(present.map((r) => num(w[r])))}) are scaled to 100: ${present.map((r) => `${num(w[r])} / ${num(total)} = ${pct(each[r] as number)}`).join(', ')}.`;
  const parts = present.filter((r) => fifth[r] !== undefined).map((r) => `${r === lift ? `(${num(w[r])} + ${num(w.C)})` : num(w[r])} / ${num(total)} = ${pct(fifth[r] as number)}`);
  const fifthWords = lift
    ? `The fifth card is drawn the same way, and a ${RARITY_LABEL.C} there becomes a ${RARITY_LABEL[lift]}: ${parts.join(', ')}.`
    : 'The fifth card is drawn the same way.';
  const fifthFloor = present.find((r) => fifth[r] !== undefined) ?? null;
  return { present, absent, each, fifth, eachWords, fifthWords, fifthFloor, ...drawView(odds, present) };
}

/** Lot 3 point A3: "Page 3 of 9" for one page, "Pages 37 and 38 of 54" for a spread (the last spread of an odd count shows one page). `at` is
 *  the 0-based first page. */
export function pageWords(at: number, count: number, single: boolean): string {
  return single || at + 2 > count ? `Page ${at + 1} of ${count}` : `Pages ${at + 1} and ${at + 2} of ${count}`;
}
