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

/** Kind weights, among the kinds that have at least one active card of the rolled rarity. */
export const KIND_WEIGHTS: Record<CardKind, number> = { idol: 75, group: 15, event: 10 };
const KINDS: readonly CardKind[] = ['idol', 'group', 'event'];

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

/** The rarities a kind exists in (idol: all six; group: C U R SR; event: C U R). */
export const KIND_RARITIES: Record<CardKind, readonly Rarity[]> = {
  idol: ['C', 'U', 'R', 'SR', 'UR', 'L'],
  group: ['C', 'U', 'R', 'SR'],
  event: ['C', 'U', 'R'],
};

/** The five sentences of a locked pocket, exactly as in the approved prototype (REASONS). */
export const LOCK_SENTENCES: Record<LockReason, string> = {
  one: 'Only one free photo of this idol exists so far.',
  sameday: "All free photos come from the same day, so they can't make different editions.",
  newg: "New group: free photographers haven't caught up yet.",
  hiatus: 'On a break, so no new public appearances to photograph.',
  crop: 'Only appears in group shots, too small to crop for Full Art.',
};

const SOURCE_NAMES: Record<PhotoSource, string> = {
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

/** One card of the pack: never a rarity without a card, kinds by weight among the kinds that have one. */
function drawOne(byKey: Map<string, PoolCard[]>, rng: Rng, fifth: boolean): PoolCard {
  const rarity = rollFrom(tableOf(byKey, fifth), rng);
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
  return list[rng(list.length)] as PoolCard;
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
  for (const r of RARITIES) {
    const ks = KINDS.filter((k) => (byKey.get(`${k}|${r}`)?.length ?? 0) > 0);
    const tot = ks.reduce((s, k) => s + KIND_WEIGHTS[k], 0);
    kinds[r] = {};
    for (const k of ks) kinds[r][k] = (KIND_WEIGHTS[k] / tot) * 100;
  }
  return {
    available,
    planWeights: { ...ODDS },
    availableWeightTotal: weightTotal,
    card: pct(card),
    fifth: pct(tableOf(byKey, true)),
    kinds,
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

export function drawPack(pool: readonly PoolCard[] | Map<string, PoolCard[]>, rng: Rng): number[] {
  const byKey = pool instanceof Map ? pool : indexPool(pool);
  const out: number[] = [];
  for (let i = 0; i < PACK_SIZE; i++) out.push(drawOne(byKey, rng, i === PACK_SIZE - 1).n);
  return out;
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
