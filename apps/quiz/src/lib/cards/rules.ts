// Bunnyverse Cards: the pure rules (plan v3 and prototype v4), shared by the server, the UI and the tests.
// No I/O here. The draw takes an injected rng; the server gives it crypto.randomInt (see draw.ts).
import type {
  CardKind,
  Edition,
  LockReason,
  PhotoCredit,
  PhotoSource,
  PoolCard,
  Rarity,
  Rng,
  CatalogOdds,
  WalletClock,
  WalletRow,
} from './types';

export const CAP = 5;
export const PERIOD_S = 600;
export const PERIOD_MS = PERIOD_S * 1000;
export const PACK_SIZE = 5;
export const SHARD_PACK_COST = 50;
export const ADS_PER_DAY_DEFAULT = 10;
export const BONUS_PER_DAY_DEFAULT = 3;
export const PARIS_TZ = 'Europe/Paris';

export const RARITIES: readonly Rarity[] = ['C', 'U', 'R', 'SR', 'UR', 'L'];

export const RARITY_NAMES: Record<Rarity, string> = {
  C: 'Common',
  U: 'Uncommon',
  R: 'Rare',
  SR: 'Super Rare',
  UR: 'Ultra Rare',
  L: 'Legendary',
};

/** The PLAN's odds in percent when all six rarities exist. The odds a page shows are computeOdds(pool): the real catalog's. */
export const ODDS: Record<Rarity, number> = { C: 60, U: 24, R: 10, SR: 4.5, UR: 1.2, L: 0.3 };

/** The PLAN's fifth card table (all six rarities): a Common becomes an Uncommon (prototype rollR(min)). */
export const FIFTH_ODDS: Record<Rarity, number> = { C: 0, U: 84, R: 10, SR: 4.5, UR: 1.2, L: 0.3 };

/** Odds in thousandths of a percent, so every table is an exact integer out of 100000. */
const ODDS_UNITS: Record<Rarity, number> = { C: 60000, U: 24000, R: 10000, SR: 4500, UR: 1200, L: 300 };

/** Shards a duplicate is worth in "Recycle extras". */
export const SHARDS: Record<Rarity, number> = { C: 1, U: 2, R: 5, SR: 12, UR: 30, L: 80 };

/** Lot 3 point B4: one name per rarity, everywhere a player reads it (the edition's name; RARITY_NAMES stays for code and tests only).
 *  The rarity order is told by the gem and the odds table, never by a second name. */
export const RARITY_LABEL: Record<Rarity, string> = {
  C: 'Standard',
  U: 'Stage',
  R: 'Holo',
  SR: 'Era',
  UR: 'Gold',
  L: 'Full Art',
};

/** Lot 3 point B10: an Ultra Rare at the latest in the 30th pack in a row without one (a pack holding an Ultra Rare or a Legendary
 *  resets the count). Only while the pool has an Ultra Rare card. */
export const PITY_UR = 30;

/** Lot 3 point B12: at most this many packs from the timer (source 'stock') a Paris day; CARDS_TIMER_PER_DAY overrides it on the server. */
export const TIMER_PACKS_PER_DAY = 40;

/** Lot 3 point B12: the quiet hours of any reminder the game may send (Paris time, from 22:00 to 08:00). The game sends none today. */
export const QUIET_HOURS = { from: 22, to: 8 } as const;

/** Lot 3 point C1: the shards a missing card costs to craft (SR and L only once such a card exists). A pack still costs SHARD_PACK_COST. */
export const CRAFT_COST: Record<Rarity, number> = { C: 10, U: 20, R: 50, SR: 120, UR: 300, L: 800 };

/** Kind weights, among the kinds that have at least one active card of the rolled rarity. Applied only once the catalog has the plan's
 *  form (hasPlanForm): owner decision 2026-11-13. */
export const KIND_WEIGHTS: Record<CardKind, number> = { idol: 75, group: 15, event: 10 };
const KINDS: readonly CardKind[] = ['idol', 'group', 'event'];

const PLAN_FORM = new WeakMap<Map<string, PoolCard[]>, boolean>();

/**
 * Lot 2 (owner decision 2026-11-13): the kind weights of the plan apply only while the pool has the plan's form, cards of the three kinds
 * (idol, group, event) and of the six rarities. Until then every subject of the rolled rarity has the same chance, whatever its kind, and a
 * group's two halves share its chance.
 */
export function hasPlanForm(byKey: Map<string, PoolCard[]>): boolean {
  const hit = PLAN_FORM.get(byKey);
  if (hit !== undefined) return hit;
  const has = (k: CardKind, r: Rarity): boolean => (byKey.get(`${k}|${r}`)?.length ?? 0) > 0;
  const form = KINDS.every((k) => RARITIES.some((r) => has(k, r))) && RARITIES.every((r) => KINDS.some((k) => has(k, r)));
  PLAN_FORM.set(byKey, form);
  return form;
}

const OF_RARITY = new WeakMap<Map<string, PoolCard[]>, Map<Rarity, PoolCard[]>>();

/** Every card of a rarity, all kinds together (kind order, then pool order), one stable list per pool so its subjects are cached. */
function cardsOfRarity(byKey: Map<string, PoolCard[]>, r: Rarity): PoolCard[] {
  let m = OF_RARITY.get(byKey);
  if (!m) { m = new Map(); OF_RARITY.set(byKey, m); }
  let l = m.get(r);
  if (!l) { l = KINDS.flatMap((k) => byKey.get(`${k}|${r}`) ?? []); m.set(r, l); }
  return l;
}

export interface EditionInfo {
  edition: Edition;
  name: string;
  /** The idol photo number this edition uses (1, 2 or 3). */
  photoSlot: 1 | 2 | 3;
}

export const EDITIONS: Record<Rarity, EditionInfo> = {
  C: { edition: 'std', name: 'Standard', photoSlot: 1 },
  U: { edition: 'stage', name: 'Stage', photoSlot: 1 },
  R: { edition: 'holo', name: 'Holo', photoSlot: 1 },
  SR: { edition: 'era', name: 'Era', photoSlot: 2 },
  UR: { edition: 'gold', name: 'Gold', photoSlot: 1 },
  L: { edition: 'full', name: 'Full Art', photoSlot: 3 },
};

/** The rarities a kind can exist in (idol and group: all six, lot 3 owner decision "one edition, one photo": a group follows the same
 *  ladder, each edition with its own group photo; amendment 1 limited groups to C U R UR; event: C U R). The binder shows the locked pockets. */
export const KIND_RARITIES: Record<CardKind, readonly Rarity[]> = {
  idol: ['C', 'U', 'R', 'SR', 'UR', 'L'],
  group: ['C', 'U', 'R', 'SR', 'UR', 'L'],
  event: ['C', 'U', 'R'],
};

/** The five sentences of a locked pocket, exactly as in the approved prototype (REASONS). */
export const LOCK_SENTENCES: Record<LockReason, string> = {
  one: 'Only one free photo of this idol exists so far.',
  sameday: "All free photos come from the same day, so they can't make different editions.",
  newg: "New group: free photographers haven't caught up yet.",
  hiatus: 'On a break, so no new public appearances to photograph.',
  crop: 'Only appears in group shots, too small to crop for Full Art.',
  photo: 'Each edition needs its own free photo, and this one has none yet.',
  size: 'No free photo is large enough yet for a full art card.',
};

export const SOURCE_NAMES: Record<PhotoSource, string> = {
  commons: 'Wikimedia Commons',
  koreanet: 'Korea.net on Flickr',
  flickr: 'Flickr',
  dvids: 'DVIDS',
};

/**
 * The credit under the card and on its back:
 * "Photo 2 by <author>, <licence>, via <source>, cropped". A share-alike photo makes the card share-alike.
 */
export function creditLine(photo: PhotoCredit, idolPhotoNumber: number = photo.slot): string {
  const base = `Photo ${idolPhotoNumber} by ${photo.author}, ${photo.licence}, via ${SOURCE_NAMES[photo.source]}, cropped`;
  if (!photo.shareAlike) return base;
  const m = /^CC BY-SA(?: (\d(?:\.\d)?))?/.exec(photo.licence);
  const sa = m ? `CC BY-SA${m[1] ? ` ${m[1]}` : ''}` : 'the same licence';
  return `${base}. This card is shared under ${sa}.`;
}

/** The plan's weights (thousandths of a percent) of the rarities that have at least one card in the pool, in rarity order. */
function tableOf(byKey: Map<string, PoolCard[]>, fifth: boolean): Array<[Rarity, number]> {
  const has = (r: Rarity): boolean => KINDS.some((k) => (byKey.get(`${k}|${r}`)?.length ?? 0) > 0);
  const t: Array<[Rarity, number]> = RARITIES.filter(has).map((r) => [r, ODDS_UNITS[r]]);
  if (fifth) {
    // A Common becomes an Uncommon: its weight moves to the lowest available rarity above C (nothing moves when C is not in packs).
    const c = t.findIndex(([r]) => r === 'C');
    if (c >= 0) {
      const [, w] = t[c] as [Rarity, number];
      t.splice(c, 1);
      if (t.length === 0) return t;
      (t[0] as [Rarity, number])[1] += w;
    }
  }
  return t;
}

/** Rarity roll for one card among the rarities that have a card (renormalised); `fifth` turns a Common into an Uncommon. */
function rollFrom(table: Array<[Rarity, number]>, rng: Rng): Rarity {
  const total = table.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) throw new Error('cards: the pool has no card for this draw');
  let x = rng(total);
  for (const [r, w] of table) {
    if (x < w) return r;
    x -= w;
  }
  return (table[table.length - 1] as [Rarity, number])[0];
}

/** What a per-player draw may add to the plain draw (lot 3). Everything is optional: without it the draw is exactly the lot 2 one. */
export interface DrawOpts {
  /** B10: draw this rarity instead of rolling one (the Ultra Rare of the 30th pack). */
  rarity?: Rarity;
  /** B11: the card numbers the player owns; the cards drawn so far in the pack are added by drawPack. A group edition of which he owns
   *  exactly one half gives him the other half. */
  owned?: ReadonlySet<number>;
  /** C4: a group (cards_entities.id of kind 'group'); the card comes from its subjects at the rolled rarity, else from the whole pool. */
  focus?: string | null;
}

/** The cards of a group for the focus pack: the group's own cards and those of the idols whose group_id is that group. */
export function focusCards(list: readonly PoolCard[], focus: string): PoolCard[] {
  return list.filter((c) => c.entity === focus || c.group === focus);
}

/** One of a subject's cards. With `owned`, a subject of which the player holds some but not all halves gives one he lacks (B11). */
function pickCard(cards: PoolCard[], rng: Rng, owned: ReadonlySet<number> | undefined): PoolCard {
  if (cards.length === 1) return cards[0] as PoolCard;
  if (owned) {
    const lacking = cards.filter((c) => !owned.has(c.n));
    if (lacking.length > 0 && lacking.length < cards.length) return lacking.length === 1 ? (lacking[0] as PoolCard) : (lacking[rng(lacking.length)] as PoolCard);
  }
  return cards[rng(cards.length)] as PoolCard;
}

/** A subject at random in a list, then one of its cards. */
function pickSubject(list: readonly PoolCard[], rng: Rng, owned: ReadonlySet<number> | undefined): PoolCard {
  const subjects = subjectsOf(list);
  return pickCard(subjects[rng(subjects.length)] as PoolCard[], rng, owned);
}

/** One card of the pack: never a rarity without a card, kinds by weight among the kinds that have one. Exported for the tests. */
export function drawOne(byKey: Map<string, PoolCard[]>, rng: Rng, fifth: boolean, opts: DrawOpts = {}): PoolCard {
  const rarity = opts.rarity ?? rollFrom(tableOf(byKey, fifth), rng);
  if (opts.focus) {
    // Lot 3 C4: a subject of the focus group at this rarity; a group with no card of the rarity falls back to the plain draw below.
    const mine = focusCards(cardsOfRarity(byKey, rarity), opts.focus);
    if (mine.length > 0) return pickSubject(mine, rng, opts.owned);
  }
  if (!hasPlanForm(byKey)) {
    // Owner decision 2026-11-13: no kind weight before the plan's form; one subject of the rarity at random, then one of its cards.
    return pickSubject(cardsOfRarity(byKey, rarity), rng, opts.owned);
  }
  const kinds = KINDS.filter((k) => (byKey.get(`${k}|${rarity}`)?.length ?? 0) > 0);
  const total = kinds.reduce((s, k) => s + KIND_WEIGHTS[k], 0);
  let x = rng(total);
  let kind = kinds[kinds.length - 1] as CardKind;
  for (const k of kinds) {
    if (x < KIND_WEIGHTS[k]) {
      kind = k;
      break;
    }
    x -= KIND_WEIGHTS[k];
  }
  const list = byKey.get(`${kind}|${rarity}`) as PoolCard[];
  // Lot 2: a subject first, then one of its cards of that rarity (a group's two halves), so a pair does not double a group's chance.
  // With one card per subject this is exactly the former uniform pick (same rng calls, same card).
  return pickSubject(list, rng, opts.owned);
}

const SUBJECTS = new WeakMap<readonly PoolCard[], PoolCard[][]>();

/** The cards of a list grouped by subject, in the order of each subject's first card (a card without an entity is its own subject). */
export function subjectsOf(list: readonly PoolCard[]): PoolCard[][] {
  const hit = SUBJECTS.get(list);
  if (hit) return hit;
  const by = new Map<string, PoolCard[]>();
  for (const c of list) {
    const k = c.entity ?? `#${c.n}`;
    const l = by.get(k);
    if (l) l.push(c);
    else by.set(k, [c]);
  }
  const out = [...by.values()];
  SUBJECTS.set(list, out);
  return out;
}

/**
 * The odds of the REAL catalog (amendment 1): the plan's weights of the rarities with at least one card in packs, renormalised to 100,
 * for a card and for the fifth card, with the inputs, so a page can write the calculation. Percentages are numbers, never typed.
 */
export function computeOdds(pool: readonly PoolCard[] | Map<string, PoolCard[]>): CatalogOdds {
  const byKey = pool instanceof Map ? pool : indexPool(pool);
  const pct = (table: Array<[Rarity, number]>): Record<Rarity, number> => {
    const total = table.reduce((s, [, w]) => s + w, 0);
    const out = { C: 0, U: 0, R: 0, SR: 0, UR: 0, L: 0 } as Record<Rarity, number>;
    for (const [r, w] of table) out[r] = total > 0 ? (w / total) * 100 : 0;
    return out;
  };
  const card = tableOf(byKey, false);
  const available = card.map(([r]) => r);
  const weightTotal = card.reduce((s, [, w]) => s + w, 0) / 1000;
  const kinds = {} as Record<Rarity, Partial<Record<CardKind, number>>>;
  const subjects = {} as Record<Rarity, Partial<Record<CardKind, number>>>;
  const cards = {} as Record<Rarity, Partial<Record<CardKind, number>>>;
  const weighted = hasPlanForm(byKey);
  for (const r of RARITIES) {
    const ks = KINDS.filter((k) => (byKey.get(`${k}|${r}`)?.length ?? 0) > 0);
    // The share of the rolled rarity that goes to each kind: the plan's weights in the plan's form, else the kind's share of the subjects.
    const tot = weighted ? ks.reduce((s, k) => s + KIND_WEIGHTS[k], 0) : subjectsOf(cardsOfRarity(byKey, r)).length;
    kinds[r] = {};
    subjects[r] = {};
    cards[r] = {};
    for (const k of ks) {
      const list = byKey.get(`${k}|${r}`) as PoolCard[];
      kinds[r][k] = ((weighted ? KIND_WEIGHTS[k] : subjectsOf(list).length) / tot) * 100;
      subjects[r][k] = subjectsOf(list).length;
      cards[r][k] = list.length;
    }
  }
  return {
    available,
    planWeights: { ...ODDS },
    availableWeightTotal: weightTotal,
    card: pct(card),
    fifth: pct(tableOf(byKey, true)),
    kinds,
    kindWeights: weighted,
    subjects,
    cards,
  };
}

/** A pack of PACK_SIZE cards (card numbers). The pool must only hold active, in-pack cards. */
/** Index a pool once; reuse it for many packs. */
export function indexPool(pool: readonly PoolCard[]): Map<string, PoolCard[]> {
  const byKey = new Map<string, PoolCard[]>();
  for (const c of pool) {
    const k = `${c.kind}|${c.rarity}`;
    const l = byKey.get(k);
    if (l) l.push(c);
    else byKey.set(k, [c]);
  }
  return byKey;
}

/** What the player's own state adds to a pack (lot 3). The server fills it; the plain draw is drawPack(pool, rng). */
export interface PackContext {
  /** B10: the player's last PITY_UR - 1 packs held no Ultra Rare and no Legendary, so this pack must hold one. */
  pity?: boolean;
  /** B11: the card numbers the player owns now. */
  owned?: ReadonlySet<number>;
  /** C4: the group of a focus pack (cards 1 and 2 come from it). */
  focus?: string | null;
}

/** True for the two rarities that end the Ultra Rare count. */
export const isPityHit = (r: Rarity): boolean => r === 'UR' || r === 'L';

export function drawPack(pool: readonly PoolCard[] | Map<string, PoolCard[]>, rng: Rng, ctx: PackContext = {}): number[] {
  const byKey = pool instanceof Map ? pool : indexPool(pool);
  const out: PoolCard[] = [];
  // The cards drawn so far count as owned, so the second draw of a group edition inside one pack gives its other half.
  const owned = ctx.owned ? new Set(ctx.owned) : undefined;
  // B10 holds only while the pool has an Ultra Rare card.
  const mustUr = ctx.pity === true && cardsOfRarity(byKey, 'UR').length > 0;
  for (let i = 0; i < PACK_SIZE; i++) {
    const last = i === PACK_SIZE - 1;
    const opts: DrawOpts = {};
    if (owned) opts.owned = owned;
    if (ctx.focus && i < 2) opts.focus = ctx.focus;
    if (last && mustUr && !out.some((c) => isPityHit(c.rarity))) opts.rarity = 'UR';
    const card = drawOne(byKey, rng, last, opts);
    owned?.add(card.n);
    out.push(card);
  }
  return out.map((c) => c.n);
}

/* ---------- time (Europe/Paris) ---------- */

let fmt: Intl.DateTimeFormat | null = null;
function parisFmt(): Intl.DateTimeFormat {
  fmt ??= new Intl.DateTimeFormat('en-GB', {
    timeZone: PARIS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt;
}

/** The Paris calendar day of an instant, 'YYYY-MM-DD'. */
export function parisDayOf(t: number | Date): string {
  const o: Record<string, string> = {};
  for (const p of parisFmt().formatToParts(new Date(t))) o[p.type] = p.value;
  return `${o.year}-${o.month}-${o.day}`;
}

let hourFmt: Intl.DateTimeFormat | null = null;

/** The Paris hour of an instant, 0 to 23. */
export function parisHourOf(t: number | Date): number {
  hourFmt ??= new Intl.DateTimeFormat('en-GB', { timeZone: PARIS_TZ, hour: '2-digit', hourCycle: 'h23' });
  const h = hourFmt.formatToParts(new Date(t)).find((p) => p.type === 'hour');
  return Number(h?.value ?? 0) % 24;
}

/**
 * Lot 3 B12: true during the quiet hours (Paris time, QUIET_HOURS: 22:00 to 08:00, the start included and the end excluded).
 * The game sends no reminder today (no push, no email, no title or icon counter). ANY FUTURE REMINDER, in the page or outside it, MUST
 * call this helper and stay silent when it returns true.
 */
export function inQuietHours(now: number | Date = Date.now()): boolean {
  const h = parisHourOf(now);
  const { from, to } = QUIET_HOURS;
  return from > to ? h >= from || h < to : h >= from && h < to;
}

/**
 * The next 00:00 Europe/Paris strictly after `now` (ms since epoch). Exact on the 23 h and 25 h days of the
 * clock changes: it searches the first instant whose Paris day differs, to the millisecond.
 */
export function nextParisMidnight(now: number | Date): number {
  const t = +now;
  const day = parisDayOf(t);
  let lo = t; // Paris day == day
  let hi = t + 26 * 3600 * 1000; // Paris day != day (a day is at most 25 h)
  while (hi - lo > 1) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (parisDayOf(mid) === day) lo = mid;
    else hi = mid;
  }
  return hi;
}

function toMs(v: number | string | Date): number {
  return typeof v === 'number' ? v : +new Date(v);
}

/**
 * The TS twin of the SQL cards_wallet (and of the prototype sync()): the stored row after the refill and the
 * Paris midnight, at `now`. Read only: nothing is written.
 *  - a new Paris day resets ads_today and bonus_today, and tops the stack up to CAP when it is under CAP;
 *  - a full stack keeps its anchor at `now` (the next pack starts counting when a pack is spent);
 *  - otherwise one pack per full PERIOD since the anchor, the anchor advancing by whole periods.
 */
export function walletAt(row: WalletRow, now: number | Date): WalletClock {
  const t = +now;
  let stock = row.stock;
  let anchor = toMs(row.anchor);
  let adsToday = row.adsToday;
  let bonusToday = row.bonusToday;
  const today = parisDayOf(t);
  if (row.parisDay !== today) {
    adsToday = 0;
    bonusToday = 0;
    if (stock < CAP) {
      stock = CAP;
      anchor = t;
    }
  }
  if (stock >= CAP) {
    anchor = t;
  } else {
    const k = Math.floor((t - anchor) / PERIOD_MS);
    if (k > 0) {
      stock = Math.min(CAP, stock + k);
      anchor += k * PERIOD_MS;
      if (stock >= CAP) anchor = t;
    }
  }
  return {
    stock,
    anchor,
    parisDay: today,
    adsToday,
    bonusToday,
    nextAt: stock >= CAP ? null : anchor + PERIOD_MS,
    midnightAt: nextParisMidnight(t),
  };
}

/** The shards of an extras batch: sum of (copies - 1) * SHARDS[rarity]. */
export function extrasValue(copies: number, rarity: Rarity): number {
  return Math.max(0, copies - 1) * SHARDS[rarity];
}
