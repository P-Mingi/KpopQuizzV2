// KpopCards: the pure views of the contract. Given the catalog (World) and a player's rows (PlayerData) they build every read answer of
// contract.ts. The real server loads World and PlayerData from the database and calls these; the seeded mock keeps them in memory and calls
// the same functions, so a screen sees one behaviour. No I/O, no randomness. Midnight, the day and the week are Europe/Paris.
import { EDITIONS, LOCK_SENTENCES, PARIS_TZ, RARITIES, RARITY_LABEL, SHARDS, computeOdds, craftCost, nextParisMidnight, parisDayOf } from '../cards/rules';
import { goalSets } from '../cards/goals';
import { cardsOfRarity, tableOf } from '../cards/rules';
import { KC, LEVEL_TITLES, THEME_IDS, THEME_NAMES, levelOf, titleOf } from './contract';
import { indexPool } from './draw';

import type { PoolCard, Rarity } from '../cards/types';
import type { UiCard, UiEntity, UiPanorama } from '../cards/ui-types';
import type {
  AlmostItem, AlmostState, BellItem, CardMoment, IdolPage, CardRef, CollectionGroup, CollectionItem, CollectionQuery, CollectionState, DailyPack, GroupRef, LevelState,
  LobbyState, MissionSet, MissionsState, OddsPack, OddsRow, OddsState, PanoItem, PanoRef, PlayerPage, Prefs, RankRow, RecyclePreview, ThemeId, ThemeInfo, WeekItem, WeekMini,
} from './contract';

/* ------------------------------------------------------------------ the catalog */

export interface World {
  /** Cards in packs (the ones a player can pull, craft and see). */
  cards: UiCard[];
  entities: UiEntity[];
  /** The theme of each group and idol entity: 'girls', 'boys', or 'solo' for an idol with no group card. An entity missing here belongs to no themed pack (it is still in All idols). */
  themeOf: Map<string, ThemeId>;
  /** Lot 7: the panoramas of the catalog (one per group photo whose parts are in packs). Absent before file 118: then nothing below shows a panorama. */
  panoramas?: UiPanorama[];
  /** Owner decision 2026-11-18: the cards out of packs. A player who owns one keeps it (the binder, the card page, a showcase, the idol page); it is never drawn, counted or in the odds, so it is not in `cards`. */
  retired?: UiCard[];
}

export const slugify = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Stable slugs for entities: the name's slug, and for a repeated name the slug with the Wikidata id or the group appended. */
export function entitySlugs(entities: readonly UiEntity[]): Map<string, string> {
  const byBase = new Map<string, UiEntity[]>();
  for (const e of entities) {
    const b = slugify(e.name) || 'x';
    byBase.set(b, [...(byBase.get(b) ?? []), e]);
  }
  const out = new Map<string, string>();
  for (const [b, list] of byBase) {
    if (list.length === 1) { out.set(list[0]!.id, b); continue; }
    for (const e of list) out.set(e.id, e.kind === 'idol' && e.group ? `${b}-${slugify(e.group)}` : `${b}-${slugify(e.id.replace(/^[a-z]+:/, ''))}`);
  }
  return out;
}

export interface Section { id: string; slug: string; name: string; kind: 'group' | 'solo'; entity: string | null; ids: string[] }

/** The sections of the binder, in the order of the catalog: one per group (the group's idols and the group's own cards), then the soloists. */
export function sectionsOf(w: World): Section[] {
  const slugs = entitySlugs(w.entities);
  const byName = new Map<string, UiEntity>();
  for (const e of w.entities) if (e.kind === 'group') byName.set(e.name, e);
  const secs = new Map<string, Section>();
  const order = [...w.entities].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  for (const e of order) {
    // Lot 6: an age-locked subject is no entity of the binder here (no section, no pocket, no count); a locked group still names the section of its members.
    if (e.kind === 'event' || e.locked) continue;
    const g = e.kind === 'group' ? e : e.group ? byName.get(e.group) : undefined;
    const key = g ? g.id : 'soloists';
    let s = secs.get(key);
    if (!s) {
      s = g ? { id: g.id, slug: slugs.get(g.id) ?? slugify(g.name), name: g.name, kind: 'group', entity: g.id, ids: [] } : { id: 'soloists', slug: 'soloists', name: 'Soloists', kind: 'solo', entity: null, ids: [] };
      secs.set(key, s);
    }
    s.ids.push(e.id);
  }
  const list = [...secs.values()];
  list.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'solo' ? 1 : -1));
  return list;
}

export const cardRef = (c: UiCard): CardRef => ({ n: c.n, num: c.num, name: c.name, edition: c.edition, kind: c.kind, group: c.group, ...(c.part ? { part: c.part } : {}), ...(c.part && c.parts ? { parts: c.parts } : {}) });

/** Lot 7: a panorama as the contract's reference (its picture comes from the catalog). */
export const panoRef = (pn: UiPanorama): PanoRef => ({ p: pn.p, num: pn.num, name: pn.name, edition: pn.edition, parts: pn.parts, cards: [...pn.cards] });

/** Lot 7: the panorama a card completes for this player, when he holds every other part of its photo (and the card itself) and not the panorama yet. The server grants
 *  it in the same transaction as the open or the craft: the twin of what 118's cards_open and cards_craft do. Null otherwise. */
export function panoCompletedBy(w: World, p: Pick<PlayerData, 'owned' | 'panos'>, n: number): UiPanorama | null {
  if (!w.panoramas) return null;
  const c = w.cards.find((x) => x.n === n);
  if (!c || c.pano === undefined || !c.setNs) return null;
  if (p.panos?.has(c.pano)) return null;
  if (!c.setNs.every((m) => m === n || p.owned.has(m))) return null;
  return w.panoramas.find((x) => x.p === c.pano) ?? null;
}
export const groupRef = (s: Section): GroupRef => ({ id: s.id, slug: s.slug, name: s.name, kind: s.kind });

/* ------------------------------------------------------------------ the player */

export interface OwnedRow { copies: number; fav: boolean; locked: boolean; seen: boolean; firstAt: number; lastAt: number; packNo?: number | null; how?: 'pack' | 'craft' | 'demo' }

/** Lot 7: a panorama the player holds (cards_panoramas_owned). */
export interface PanoOwned { at: number; source: 'pack' | 'craft'; seen: boolean }

export interface PlayerData {
  /** Lot 7: the panoramas the player holds by pano_no. Absent reads as none (a database without file 118). */
  panos?: Map<number, PanoOwned>;
  nickname: string | null;
  createdAt: number;
  owned: Map<number, OwnedRow>;
  wishlist: Set<number>;
  shards: number;
  stock: number;
  /** ms of the refill anchor. */
  anchor: number;
  timerToday: number;
  parisDay: string;
  adsToday: number;
  /** Packs opened in all (any source). */
  opened: number;
  /** Packs in a row with no Gold and no Full Art, newest first. */
  sinceGold: number;
  /** Bonus packs earned on the Paris day (cards_bonus_earned: the Kpopdle wins and, since 115, the quiz of the day) and already opened (cards_wallets.bonus_today). */
  bonusEarned: number;
  bonusUsed: number;
  /** Paris day the pack of the day / a focus pack was last opened. */
  dailyDay: string | null;
  focusDay: string | null;
  claimedSets: Set<string>;
  week: { id: string; packs: number; dle: number; newc: number; claimed: boolean };
  prefs: Prefs;
  /** ms of the player's last action: the timer is paused 2 hours after it until he acts or confirms "still there?". */
  lastSeen: number;
  recent: { at: number; best: Rarity; source: 'stock' | 'ad' | 'shards' | 'bonus' | 'reward'; newCount: number | null }[];
  last: { at: number; packNo: number; cards: { n: number; isNew: boolean }[] } | null;
  friends: string[];
  code: { code: string; expiresAt: number } | null;
}

export const STILL_THERE_AFTER_MS = 2 * 3600 * 1000;

export function emptyPlayer(now: number, nickname: string | null = null): PlayerData {
  return {
    nickname, createdAt: now, owned: new Map(), panos: new Map(), wishlist: new Set(), shards: 0, stock: KC.STACK_CAP, anchor: now, timerToday: 0, parisDay: parisDayOf(now), adsToday: 0,
    opened: 0, sinceGold: 0, bonusEarned: 0, bonusUsed: 0, dailyDay: null, focusDay: null, claimedSets: new Set(), week: { id: weekStartOf(now), packs: 0, dle: 0, newc: 0, claimed: false },
    prefs: { sound: true, vibration: true, theme: 'all', focus: null }, lastSeen: now, recent: [], last: null, friends: [], code: null,
  };
}

/* ------------------------------------------------------------------ time */

const MS_DAY = 86400000;

/** The Paris Monday of an instant, 'YYYY-MM-DD'. */
export function weekStartOf(t: number): string {
  const d = new Date(`${parisDayOf(t)}T12:00:00Z`);
  const wd = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wd);
  return d.toISOString().slice(0, 10);
}

/** The instant a Paris calendar day ('YYYY-MM-DD') starts. */
export function parisDayStart(day: string): number {
  const probe = Date.parse(`${day}T00:00:00Z`) - 3 * 3600 * 1000;
  return nextParisMidnight(probe);
}

/** The Monday 00:00 Paris that ends the week starting on `weekStart`. */
export function weekEnd(weekStart: string): number {
  const d = new Date(`${weekStart}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return parisDayStart(d.toISOString().slice(0, 10));
}

export { PARIS_TZ };

/** The pack of the day: one group a day, the same for everyone, by the Paris day number. */
export function dailyGroup(w: World, day: string): Section | null {
  const groups = sectionsOf(w).filter((s) => s.kind === 'group' && s.entity && w.cards.some((c) => c.entity === s.entity));
  if (groups.length === 0) return null;
  groups.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const n = Math.floor(Date.parse(`${day}T12:00:00Z`) / MS_DAY);
  return groups[((n % groups.length) + groups.length) % groups.length] ?? null;
}

/** The wallet after the refill and the Paris midnight at `now` (read only). The stack holds KC.STACK_CAP; the midnight top-up fills it to the cap (a stack above the cap is kept) and is not counted as timer packs. The timer pauses 2 hours after the player's last action. */
export function walletNow(p: Pick<PlayerData, 'stock' | 'anchor' | 'timerToday' | 'parisDay' | 'adsToday' | 'lastSeen'>, now: number, timerCap: number = KC.TIMER_PER_DAY, cap: number = KC.STACK_CAP) {
  let { stock, anchor, timerToday, adsToday } = p;
  const today = parisDayOf(now);
  if (p.parisDay !== today) {
    adsToday = 0;
    timerToday = 0;
    if (stock < cap) { stock = cap; anchor = now; }
  }
  const pausedAt = p.lastSeen + STILL_THERE_AFTER_MS;
  const clock = Math.min(now, pausedAt);
  if (stock >= cap) anchor = now;
  else {
    const k = Math.floor((clock - anchor) / (KC.PERIOD_MIN * 60000));
    const room = Math.max(0, timerCap - timerToday);
    if (k > 0 && room > 0) {
      const g = Math.min(k, cap - stock, room);
      stock += g;
      timerToday += g;
      if (stock >= cap) anchor = now;
      else if (g === room) anchor += g * KC.PERIOD_MIN * 60000;
      else anchor += k * KC.PERIOD_MIN * 60000;
    }
  }
  const paused = now > pausedAt && stock < cap && timerToday < timerCap;
  return {
    stock, anchor, timerToday, adsToday, parisDay: today,
    nextAt: stock >= cap || timerToday >= timerCap || paused ? null : anchor + KC.PERIOD_MIN * 60000,
    midnightAt: nextParisMidnight(now), paused,
  };
}

/* ------------------------------------------------------------------ themes and pools */

export function poolCards(w: World): PoolCard[] {
  return w.cards.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, entity: c.entity, group: groupIdOf(w, c) }));
}

function groupIdOf(w: World, c: UiCard): string | null {
  if (c.kind === 'group') return c.entity;
  if (!c.group) return null;
  return w.entities.find((e) => e.kind === 'group' && e.name === c.group)?.id ?? null;
}

/** The cards of a theme: 'all' is the whole pool; a themed pack holds the cards whose subject belongs to the theme. */
export function themeCards(w: World, t: ThemeId): UiCard[] {
  if (t === 'all') return w.cards;
  return w.cards.filter((c) => w.themeOf.get(c.entity) === t);
}

export function groupCards(w: World, groupId: string): UiCard[] {
  return w.cards.filter((c) => c.entity === groupId || groupIdOf(w, c) === groupId);
}

export function themeInfos(w: World): ThemeInfo[] {
  return THEME_IDS.map((id) => ({ id, name: THEME_NAMES[id], cards: themeCards(w, id).length }));
}

/* ------------------------------------------------------------------ level, badges, completion */

export function levelState(owned: number): LevelState {
  const level = levelOf(owned);
  return { level, title: titleOf(level), cards: owned, toNext: KC.CARDS_PER_LEVEL - (owned % KC.CARDS_PER_LEVEL), progress: owned % KC.CARDS_PER_LEVEL, nextLevel: level + 1, titles: LEVEL_TITLES };
}

/** A progress never shows more than 100 %. */
export const pctOf = (owned: number, total: number): number => (total > 0 ? Math.min(100, Math.round((owned / total) * 1000) / 10) : 0);

/**
 * Owner decision 2026-11-18: a card the player owns that is out of packs (no live photo now) keeps counting everywhere it counted: the number of cards, the level,
 * the progress of the collection and of its group, the sets, the badges. For THIS player it is one of the cards of the collection, so his owned never goes over
 * his total. A card out of packs that he does not own is counted for nobody. Nothing here is drawn: the pool, the odds and the packs read `w.cards`.
 */
export function ownedRetired(w: World, p: Pick<PlayerData, 'owned'>): UiCard[] {
  return (w.retired ?? []).filter((c) => p.owned.has(c.n));
}

/** The world the COUNTS of one player read: the cards in packs and the cards he owns that are out of packs. Never used for a draw. */
export function countWorld(w: World, p: Pick<PlayerData, 'owned'>): World {
  const extra = ownedRetired(w, p);
  return extra.length === 0 ? w : { ...w, cards: [...w.cards, ...extra] };
}

export const FOUNDER_UNTIL = Date.parse('2027-03-01T00:00:00Z');

export function badgesOf(w: World, ownedNs: ReadonlySet<number>, createdAt: number): string[] {
  const out: string[] = [];
  if (createdAt < FOUNDER_UNTIL) out.push('Founder');
  // The cards the player owns that are out of packs count as his cards (owner decision 2026-11-18); `ownedNs` holds only cards he owns.
  const cards = [...w.cards, ...(w.retired ?? []).filter((c) => ownedNs.has(c.n))];
  for (const s of sectionsOf(w)) {
    const cs = cards.filter((c) => s.ids.includes(c.entity));
    if (s.kind === 'group' && cs.length > 0 && cs.every((c) => ownedNs.has(c.n))) out.push(`${s.name} complete`);
  }
  if (cards.some((c) => c.rarity === 'UR' && ownedNs.has(c.n))) out.push('First Gold');
  if (cards.some((c) => c.rarity === 'L' && ownedNs.has(c.n))) out.push('First Full Art');
  if (ownedNs.size >= 100) out.push('100 cards');
  return out;
}

/** Up to 3 starred cards, then the best owned cards to fill (prototype myShowcase). */
export function showcaseOf(w: World, owned: ReadonlyMap<number, OwnedRow>): CardRef[] {
  const rank = (c: UiCard): number => RARITIES.indexOf(c.rarity);
  const mine = w.cards.filter((c) => owned.has(c.n));
  const starred = mine.filter((c) => owned.get(c.n)!.fav).sort((a, b) => rank(b) - rank(a) || a.n - b.n);
  const rest = mine.filter((c) => !owned.get(c.n)!.fav).sort((a, b) => rank(b) - rank(a) || a.n - b.n);
  return [...starred, ...rest].slice(0, KC.SHOWCASE).map(cardRef);
}

/* ------------------------------------------------------------------ week and missions */

export function weekMini(p: PlayerData, now: number, goals = { packs: 20, dle: 3, newc: 10 }): WeekMini {
  const id = weekStartOf(now);
  const wk = p.week.id === id ? p.week : { id, packs: 0, dle: 0, newc: 0, claimed: false };
  const items: WeekItem[] = [
    { key: 'packs', label: `Open ${goals.packs} packs`, value: Math.min(wk.packs, goals.packs), goal: goals.packs, done: wk.packs >= goals.packs },
    { key: 'dle', label: `Win ${goals.dle} Kpopdle games`, value: Math.min(wk.dle, goals.dle), goal: goals.dle, done: wk.dle >= goals.dle },
    { key: 'newc', label: `Add ${goals.newc} new cards to your binder`, value: Math.min(wk.newc, goals.newc), goal: goals.newc, done: wk.newc >= goals.newc },
  ];
  return { weekStart: id, endsAt: new Date(weekEnd(id)).toISOString(), items, done: items.every((i) => i.done), claimed: wk.claimed };
}

export function missionSets(w: World, p: PlayerData): MissionSet[] {
  const ownedNs = new Set(p.owned.keys());
  const sets = goalSets(countWorld(w, p).cards, w.entities, ownedNs, p.claimedSets);
  const list: MissionSet[] = sets.map((s) => {
    const done = s.total > 0 && s.owned >= s.total;
    const type = s.kind === 'group' ? 'Group' : s.kind === 'solo' ? 'Soloists' : s.kind === 'year' ? 'Debut' : 'Edition';
    const name = s.kind === 'group' ? (s.name ?? 'Group') : s.kind === 'solo' ? 'Soloists' : s.kind === 'holo' ? 'Every Holo card' : s.kind === 'gold' ? 'Every Gold card' : `Debut ${s.name ?? ''}`.trim();
    return { id: s.id, name, type, kind: s.kind, owned: s.owned, total: s.total, done, claimed: s.claimed, packs: s.packs, ready: done && !s.claimed };
  });
  list.sort((a, b) => Number(b.ready) - Number(a.ready) || b.owned / Math.max(1, b.total) - a.owned / Math.max(1, a.total) || a.id.localeCompare(b.id));
  return list;
}

export function missionsState(w: World, p: PlayerData, now: number): MissionsState {
  const sets = missionSets(w, p);
  const week = weekMini(p, now);
  return {
    week: { ...week, rewardPacks: 2, rewardShards: 25 }, sets, setsDone: sets.filter((s) => s.done).length, setsTotal: sets.length,
    claimable: sets.filter((s) => s.ready).length + (week.done && !week.claimed ? 1 : 0),
  };
}

/* ------------------------------------------------------------------ lobby */

export interface LobbyInput { w: World; p: PlayerData; now: number; bonusPerDay?: number; /** The quiz of the day's pack is among the bonus packs earned today (cards_bonus_sync). */ quizDone?: boolean; timerCap?: number; adsPerDay?: number; adsEnabled?: boolean; odds?: boolean }

export function lobbyState(i: LobbyInput): LobbyState {
  const { w, p, now } = i;
  const timerCap = i.timerCap ?? KC.TIMER_PER_DAY;
  const wal = walletNow(p, now, timerCap);
  // The level counts every card the player owns that the catalog knows, the ones out of packs too (owner decision 2026-11-18).
  const known = new Set([...w.cards, ...(w.retired ?? [])].map((c) => c.n));
  const ownedCount = [...p.owned.keys()].filter((n) => known.has(n)).length;
  const day = parisDayOf(now);
  const dg = dailyGroup(w, day);
  const daily: DailyPack = { group: dg ? groupRef(dg) : { id: '', slug: '', name: '', kind: 'group' }, used: p.dailyDay === day, endsAt: new Date(wal.midnightAt).toISOString() };
  const untilGolden = KC.GOLDEN_EVERY - (p.opened % KC.GOLDEN_EVERY);
  const golden = { next: untilGolden === 1, packsUntil: untilGolden, opened: p.opened };
  const hasGold = w.cards.some((c) => c.rarity === 'UR');
  const guarantee = { streak: p.sinceGold, left: hasGold ? Math.max(1, KC.GOLD_BY_PACK - p.sinceGold) : null, by: KC.GOLD_BY_PACK };
  const week = weekMini(p, now);
  const ms = missionsState(w, p, now);
  const newCards = [...p.owned.values()].filter((o) => !o.seen).length;
  const bell: BellItem[] = [];
  if (wal.stock >= KC.STACK_CAP) bell.push({ id: 'stack_full', href: '/kpopcards', title: `Your ${KC.STACK_CAP} free packs are ready`, text: 'Open one so the timer runs again' });
  if (!daily.used && dg) bell.push({ id: 'daily', href: '/kpopcards', title: `Pack of the day: ${dg.name}`, text: 'Free once today' });
  if (golden.next) bell.push({ id: 'golden', href: '/kpopcards', title: 'Your next pack is golden', text: 'Its fifth card is Holo or better' });
  // One line per finished set, named, as the prototype's bell does ("aespa is complete", "Claim +1 pack in Missions").
  for (const s of ms.sets) if (s.ready) bell.push({ id: 'set_ready', href: '/kpopcards/missions', title: `${s.name} is complete`, text: `Claim +${s.packs} pack${s.packs > 1 ? 's' : ''} in Missions` });
  if (week.done && !week.claimed) bell.push({ id: 'week_ready', href: '/kpopcards/missions', title: 'Weekly reward ready', text: '+2 packs and 25 shards' });
  const paused = wal.paused;
  if (paused) bell.push({ id: 'still_there', href: '/kpopcards', title: 'Still there?', text: 'Tap to restart your pack timer' });
  const last = p.last;
  const bonusCap = i.bonusPerDay ?? 0;
  const bonusLeft = Math.max(0, Math.min(bonusCap, p.bonusEarned) - p.bonusUsed);
  // The quiz of the day's pack is one of the earned bonus packs (shared cap): Kpopdle's own count leaves it out.
  const quizDone = bonusCap > 0 && i.quizDone === true;
  const canBuy = wal.stock < 1 && p.shards >= KC.SHARD_PACK;
  const adsPer = i.adsPerDay ?? KC.ADS_PER_DAY;
  return {
    stock: wal.stock, cap: KC.STACK_CAP, nextAt: wal.nextAt === null ? null : new Date(wal.nextAt).toISOString(), midnightAt: new Date(wal.midnightAt).toISOString(),
    adsLeft: Math.max(0, adsPer - wal.adsToday), adsEnabled: i.adsEnabled ?? true, shards: p.shards, bonusLeft, owned: [...p.owned].map(([n, o]) => ({ n, copies: o.copies, fav: o.fav, at: new Date(o.lastAt).toISOString() })),
    timerCap, timerUsed: wal.timerToday, timerLeft: Math.max(0, timerCap - wal.timerToday), pityLeft: guarantee.left, focusUsed: p.focusDay === day, wishlist: [...p.wishlist].sort((a, b) => a - b),
    recent: p.recent.slice(0, 10).map((r) => ({ at: new Date(r.at).toISOString(), best: EDITIONS[r.best].edition, source: r.source, newCount: r.newCount })),
    odds: i.odds === false ? null : computeOdds(poolCards(w)),
    theme: p.prefs.theme, themes: themeInfos(w), daily, golden, guarantee, level: levelState(ownedCount), prefs: p.prefs, bell, week, claimable: ms.claimable, newCards,
    last: last ? { at: new Date(last.at).toISOString(), packNo: last.packNo, cards: last.cards } : null,
    canBuyPack: canBuy, stillThere: { due: paused, since: paused ? new Date(p.lastSeen + STILL_THERE_AFTER_MS).toISOString() : null },
    bridges: {
      kpopdle: { enabled: bonusCap > 0, earnedToday: Math.max(0, p.bonusEarned - (quizDone ? 1 : 0)), left: bonusLeft, perDay: bonusCap },
      quizOfDay: { enabled: bonusCap > 0, done: quizDone },
    },
    nickname: p.nickname, serverNow: new Date(now).toISOString(),
    ...(w.panoramas ? { panoramas: [...(p.panos?.keys() ?? [])].filter((x) => w.panoramas!.some((q) => q.p === x)).sort((a, b) => a - b) } : {}),
  };
}

/* ------------------------------------------------------------------ collection */

interface Pocket { i: number; section: string; item: CollectionItem; entityName: string; groupName: string; kind: string }

function pockets(w: World, p: PlayerData, secs: Section[]): Pocket[] {
  const byEnt = new Map<string, UiCard[]>();
  for (const c of w.cards) byEnt.set(c.entity, [...(byEnt.get(c.entity) ?? []), c]);
  const entById = new Map(w.entities.map((e) => [e.id, e]));
  const out: Pocket[] = [];
  let i = 0;
  const paired = w.cards.some((c) => c.part === 1 || c.part === 2 || c.part === 3);
  for (const s of secs) {
    // The group's idols first, then the group card, as the prototype's binder.
    const ids = [...s.ids].sort((a, b) => (entById.get(a)!.kind === 'group' ? 1 : 0) - (entById.get(b)!.kind === 'group' ? 1 : 0));
    for (const id of ids) {
      const e = entById.get(id)!;
      const cs = byEnt.get(id) ?? [];
      for (const r of RARITIES) {
        const here = cs.filter((c) => c.rarity === r).sort((a, b) => a.n - b.n);
        if (here.length > 0) {
          for (const c of here) {
            const o = p.owned.get(c.n);
            out.push({ i: i++, section: s.slug, entityName: c.name, groupName: c.group ?? '', kind: c.kind, item: {
              type: 'card', n: c.n, num: c.num, name: c.name, edition: c.edition, kind: c.kind, group: c.group, section: s.slug, ...(c.part ? { part: c.part } : {}), ...(c.part && c.parts ? { parts: c.parts } : {}), ...(c.part && c.pano !== undefined ? { pano: c.pano } : {}),
              owned: !!o, copies: o?.copies ?? 0, silhouette: !o, fav: !!o?.fav, wished: p.wishlist.has(c.n), locked: !!o?.locked, isNew: !!o && !o.seen, pairN: c.pairN ?? null,
            } });
          }
        } else {
          const reason = e.lockReasons[r] ?? null;
          const times = e.kind === 'group' && paired ? 2 : 1;
          for (let k = 0; k < times; k++) out.push({ i: i++, section: s.slug, entityName: e.name, groupName: e.group ?? '', kind: e.kind, item: { type: 'not_issued', entity: e.id, name: e.name, edition: EDITIONS[r].edition, section: s.slug, reason: reason ? LOCK_SENTENCES[reason] : null } });
        }
      }
    }
  }
  return out;
}

/** Lot 7: the Panoramas section of the binder: every panorama of a section the binder shows, owned or not, with its own completion (never in `totals`). */
export function panoramasOf(w: World, p: PlayerData, secs: Section[] = sectionsOf(w), group?: string): { owned: number; total: number; pct: number; items: PanoItem[] } | undefined {
  if (!w.panoramas) return undefined;
  const all: PanoItem[] = [];
  for (const pn of [...w.panoramas].sort((a, b) => a.p - b.p)) {
    const s = secs.find((x) => x.entity === pn.entity || x.ids.includes(pn.entity));
    if (!s) continue;
    const o = p.panos?.get(pn.p);
    all.push({ ...panoRef(pn), owned: !!o, section: s.slug, grantedAt: o ? new Date(o.at).toISOString() : null });
  }
  const owned = all.filter((x) => x.owned).length;
  return { owned, total: all.length, pct: pctOf(owned, all.length), items: group ? all.filter((x) => x.section === group) : all };
}

export function collectionState(world: World, p: PlayerData, q: CollectionQuery = {}): CollectionState {
  // Owner decision 2026-11-18: the cards the player owns that are out of packs are in his collection and in its counts.
  const w = countWorld(world, p);
  const secs = sectionsOf(w);
  const all = pockets(w, p, secs);
  const groups: CollectionGroup[] = secs.map((s) => {
    const cs = w.cards.filter((c) => s.ids.includes(c.entity));
    const own = cs.filter((c) => p.owned.has(c.n)).length;
    return { ...groupRef(s), total: cs.length, owned: own, pct: pctOf(own, cs.length), complete: cs.length > 0 && own === cs.length, notIssued: all.filter((x) => x.section === s.slug && x.item.type === 'not_issued').length };
  });
  const text = (q.q ?? '').trim().toLowerCase();
  const rar = q.rar && q.rar.length > 0 ? new Set(q.rar) : null;
  const show = q.show ?? 'all';
  const kind = q.kind ?? 'all';
  const rank = (it: CollectionItem): number => RARITIES.indexOf((Object.keys(EDITIONS) as Rarity[]).find((r) => EDITIONS[r].edition === it.edition) ?? 'C');
  let list = all.filter((x) => {
    const it = x.item;
    if (q.group && x.section !== q.group) return false;
    if (kind !== 'all' && x.kind !== kind) return false;
    if (rar && !rar.has(it.edition)) return false;
    if (show === 'owned' && !(it.type === 'card' && it.owned)) return false;
    if (show === 'missing' && !(it.type === 'card' && !it.owned)) return false;
    if (show === 'fav' && !(it.type === 'card' && it.owned && it.fav)) return false;
    if (show === 'want' && !(it.type === 'card' && it.wished)) return false;
    if (text && !`${x.entityName} ${x.groupName}`.toLowerCase().includes(text) && !(it.type === 'card' && it.num.toLowerCase().includes(text))) return false;
    return true;
  });
  const sort = q.sort ?? 'number';
  if (sort === 'rarity') list = [...list].sort((a, b) => Number(b.item.type === 'card' && b.item.owned) - Number(a.item.type === 'card' && a.item.owned) || rank(b.item) - rank(a.item) || a.i - b.i);
  else if (sort === 'newest') list = [...list].sort((a, b) => (p.owned.get(b.item.type === 'card' ? b.item.n : -1)?.lastAt ?? -1) - (p.owned.get(a.item.type === 'card' ? a.item.n : -1)?.lastAt ?? -1) || a.i - b.i);
  const per = Math.max(1, Math.min(120, q.per ?? 36));
  const pages = Math.max(1, Math.ceil(list.length / per));
  const page = Math.max(1, Math.min(pages, q.page ?? 1));
  const own = w.cards.filter((c) => p.owned.has(c.n)).length;
  const of = (k: 'idol' | 'group'): { owned: number; total: number } => {
    const cs = w.cards.filter((c) => c.kind === k);
    return { owned: cs.filter((c) => p.owned.has(c.n)).length, total: cs.length };
  };
  return {
    groups, items: list.slice((page - 1) * per, page * per).map((x) => x.item), page, pages, matches: list.length,
    totals: { owned: own, total: w.cards.length, pct: pctOf(own, w.cards.length), idols: of('idol'), groups: of('group'), notIssued: all.filter((x) => x.item.type === 'not_issued').length },
    ...(w.panoramas ? { panoramas: panoramasOf(w, p, secs, q.group)! } : {}),
  };
}

/* ------------------------------------------------------------------ almost there */

export function almostState(world: World, p: PlayerData, limit = 4): AlmostState {
  const w = countWorld(world, p);
  const secs = sectionsOf(w);
  const items: (AlmostItem & { left: number })[] = [];
  const mk = (c: UiCard): AlmostItem['craft'] => {
    const cost = craftCost(c.rarity);
    return cost === null ? null : { cost, canAfford: p.shards >= cost };
  };
  for (const s of secs) {
    const cs = w.cards.filter((c) => s.ids.includes(c.entity));
    const miss = cs.filter((c) => !p.owned.has(c.n));
    if (miss.length > 0 && miss.length <= 4 && cs.length > 0) {
      const next = miss.sort((a, b) => a.n - b.n)[0]!;
      items.push({ type: 'group', id: s.id, slug: s.slug, name: s.name, owned: cs.length - miss.length, total: cs.length, next: cardRef(next), missing: miss.length, rewardPacks: 1, craft: mk(next), wished: p.wishlist.has(next.n), left: miss.length });
    }
  }
  const slugs = entitySlugs(w.entities);
  for (const e of w.entities) {
    if (e.kind !== 'idol' || e.locked) continue;
    const cs = w.cards.filter((c) => c.entity === e.id);
    if (cs.length < 3) continue;
    const miss = cs.filter((c) => !p.owned.has(c.n));
    if (miss.length === 1) {
      const next = miss[0]!;
      items.push({ type: 'idol', id: e.id, slug: slugs.get(e.id) ?? slugify(e.name), name: e.name, owned: cs.length - 1, total: cs.length, next: cardRef(next), missing: 1, rewardPacks: 0, craft: mk(next), wished: p.wishlist.has(next.n), left: 1 });
    }
  }
  // The prototype's order: fewest missing first, a group before an idol, then the catalog's own order (its renderAlmost keeps the order of the sections and idols).
  items.sort((a, b) => a.left - b.left || (a.type === 'group' ? -1 : 1) - (b.type === 'group' ? -1 : 1) || a.next.n - b.next.n);
  return { items: items.slice(0, Math.max(1, limit)).map(({ left: _l, ...rest }) => rest) };
}

/* ------------------------------------------------------------------ recycle */

export function recyclePreview(w: World, p: PlayerData): RecyclePreview {
  let extras = 0, shards = 0, locked = 0, gold = 0;
  // The database recycles the extras of every card the player holds, a card out of packs too (owner decision 2026-11-18: it stays in the binder): the figure counts them.
  for (const c of [...w.cards, ...(w.retired ?? [])]) {
    const o = p.owned.get(c.n);
    if (!o || o.copies < 2) continue;
    const x = o.copies - 1;
    if (c.rarity === 'UR' || c.rarity === 'L') gold += x;
    else if (o.locked) locked += x;
    else { extras += x; shards += x * SHARDS[c.rarity]; }
  }
  return {
    extras, shards, skipped: { locked, goldAndFullArt: gold }, canRecycle: extras > 0,
    confirm: extras > 0 ? `Recycle ${extras} extra${extras === 1 ? '' : 's'} for ${shards} shard${shards === 1 ? '' : 's'}? One copy of each card stays. Locked cards and ${RARITY_LABEL.UR} and ${RARITY_LABEL.L} extras are never recycled in bulk.` : 'No extras to recycle.',
  };
}

/* ------------------------------------------------------------------ odds */

function rows(byKey: Map<string, PoolCard[]>): OddsRow[] {
  const pct = (t: Array<[Rarity, number]>): Record<Rarity, number> => {
    const tot = t.reduce((s, [, x]) => s + x, 0);
    const o: Record<Rarity, number> = { C: 0, U: 0, R: 0, SR: 0, UR: 0, L: 0 };
    for (const [r, x] of t) o[r] = tot > 0 ? (x / tot) * 100 : 0;
    return o;
  };
  const c14 = pct(tableOf(byKey, false));
  const c5 = pct(tableOf(byKey, true));
  const g5: Record<Rarity, number> = { ...c5 };
  const up = RARITIES.filter((r) => r === 'R' || r === 'SR' || r === 'UR' || r === 'L').find((r) => cardsOfRarity(byKey, r).length > 0);
  if (up) { g5[up] += g5.C + g5.U; }
  g5.C = 0; g5.U = 0;
  if (!up) { /* nothing above Standard and Stage: the golden rule has no card to lift to */ }
  return RARITIES.map((r) => ({ edition: EDITIONS[r].edition, rarity: r, cards1to4: c14[r], card5: c5[r], golden5: g5[r] }));
}

export function oddsState(w: World, now: number, dailyOfDay?: Section | null): OddsState {
  const packs: OddsPack[] = [];
  for (const t of THEME_IDS) {
    const cs = themeCards(w, t);
    if (cs.length === 0) continue;
    packs.push({ id: t, name: THEME_NAMES[t], cards: cs.length, rows: rows(indexPool(cs.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, entity: c.entity })))) });
  }
  if (dailyOfDay) {
    const cs = groupCards(w, dailyOfDay.id);
    if (cs.length > 0) packs.push({ id: 'daily', name: `Pack of the day`, cards: cs.length, rows: rows(indexPool(cs.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, entity: c.entity })))) });
  }
  const all = themeCards(w, 'all');
  if (all.length > 0) {
    const r = rows(indexPool(all.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, entity: c.entity }))));
    packs.push({ id: 'focus', name: 'Focus pack', cards: all.length, rows: r });
    packs.push({ id: 'golden', name: 'Golden pack', cards: all.length, rows: r });
  }
  return {
    packs, generatedAt: new Date(now).toISOString(),
    guarantees: [
      { id: 'five', text: 'The fifth card of every pack is never Standard: a Standard roll becomes Stage.' },
      { id: 'gold', text: `After ${KC.GOLD_BY_PACK - 1} packs in a row without a ${RARITY_LABEL.UR} or a ${RARITY_LABEL.L} card, the last card of the next pack is ${RARITY_LABEL.UR}.` },
      { id: 'golden', text: `Every ${KC.GOLDEN_EVERY}th pack is golden: its fifth card is ${RARITY_LABEL.R} or better.` },
      { id: 'pair', text: 'If you own one half of a group card, drawing that group edition gives you the other half.' },
      { id: 'focus', text: 'Once a day you can pick a group for one pack from your stack: its 2nd and 4th cards come from that group, at the same odds for each edition.' },
      { id: 'daily', text: 'The pack of the day is free once a day and holds one group, chosen by the date (Paris time).' },
    ],
  };
}

/* ------------------------------------------------------------------ ranking and players */

/** `retired`: how many of the cards he owns are out of packs; they are part of HIS total (owner decision 2026-11-18), so his percentage never goes over 100. */
export interface PlayerSummary { nickname: string; owned: number; showcase: CardRef[]; badges: string[]; friend: boolean; me: boolean; retired?: number }

/** The total a player's percentage is read against: the cards in packs and his own cards that are out of packs. */
export const totalOf = (total: number, retired: number | undefined): number => total + Math.max(0, retired ?? 0);

export function rankRows(players: readonly PlayerSummary[], total: number): RankRow[] {
  const sorted = [...players].sort((a, b) => b.owned - a.owned || a.nickname.localeCompare(b.nickname));
  return sorted.map((x, i) => {
    // A real count is a whole number; the mock's example players carry the prototype's whole percentages, so their count is rounded as the prototype's lvFor does.
    const lv = levelOf(Math.round(x.owned));
    return { pos: i + 1, nickname: x.nickname, level: lv, title: titleOf(lv), pct: pctOf(x.owned, totalOf(total, x.retired)), me: x.me, friend: x.friend, showcase: x.showcase, badges: x.badges };
  });
}

export function playerPage(s: PlayerSummary, total: number, wishlist: CardRef[] | null): PlayerPage {
  const lv = levelOf(Math.round(s.owned));
  const mine = totalOf(total, s.retired);
  return { nickname: s.nickname, level: lv, title: titleOf(lv), pct: pctOf(s.owned, mine), owned: s.owned, total: mine, showcase: s.showcase, badges: s.badges, me: s.me, friend: s.friend, wishlist: s.me || s.friend ? wishlist : null };
}

/* ------------------------------------------------------------------ idol pages */

/** The slug of an entity on kpopquiz.org (the groups table slug is the entity id after the colon). */
export function quizSlug(e: UiEntity): string {
  const id = e.id.replace(/^[a-z]+:/, '');
  return /^[a-z0-9-]+$/.test(id) ? id : slugify(e.name);
}

export const QUIZ_BASE = 'https://kpopquiz.org';

/** The idol page: locked until the player owns a card of the idol; then the editions and the idol's quizzes on kpopquiz.org. */
export function idolPage(w: World, p: PlayerData, slug: string): IdolPage | null {
  const slugs = entitySlugs(w.entities);
  const e = w.entities.find((x) => x.kind === 'idol' && !x.locked && slugs.get(x.id) === slug);
  if (!e) return null;
  // Owner decision 2026-11-18: a card the player owns that is out of packs still opens the idol's page and is one of its editions.
  const cs = [...w.cards.filter((c) => c.entity === e.id), ...(w.retired ?? []).filter((c) => c.entity === e.id && p.owned.has(c.n))];
  const unlocked = cs.some((c) => p.owned.has(c.n));
  const gs = e.group ? sectionsOf(w).find((s) => s.name === e.group) : null;
  const quizzes = [{ title: `${e.name} quizzes on kpopquiz.org`, url: `${QUIZ_BASE}/${quizSlug(e)}` }];
  if (gs && gs.entity) {
    const ge = w.entities.find((x) => x.id === gs.entity);
    if (ge) quizzes.push({ title: `${gs.name} quizzes on kpopquiz.org`, url: `${QUIZ_BASE}/${quizSlug(ge)}` });
  }
  return {
    slug, name: e.name, kind: 'idol', group: gs ? groupRef(gs) : null, debutYear: e.debutYear, unlocked,
    editions: unlocked ? cs.map((c) => ({ edition: c.edition, n: c.n, owned: p.owned.has(c.n), copies: p.owned.get(c.n)?.copies ?? 0 })) : [],
    quizzes: unlocked ? quizzes : [],
  };
}

/* ------------------------------------------------------------------ the moment of a card */

/** The quiz link of a card: the idol's own page, else its group's, from the slug the database found (cards_moment) or, in the mock, from the entity. */
export function momentQuiz(w: World, n: number, slug: string | null): CardMoment['quiz'] {
  if (!slug) return null;
  const card = w.cards.find((c) => c.n === n) ?? w.retired?.find((c) => c.n === n);
  const e = card ? w.entities.find((x) => x.id === card.entity) : undefined;
  const bySlug = w.entities.find((x) => x.id.replace(/^[a-z]+:/, '') === slug);
  const name = bySlug?.name ?? e?.name ?? slug;
  return { title: `${name} quizzes on kpopquiz.org`, url: `${QUIZ_BASE}/${slug}` };
}
