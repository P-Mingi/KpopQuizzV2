// KpopCards: the server side of the contract. Reads load the catalog and the player's rows and call the pure views of model.ts; every write is
// ONE database function (110-core.sql and friends) called with an idempotency key. The randomness is crypto.randomInt (server-rng.ts), the
// plan of each pack (plain five, golden fifth, Gold fifth) is drawn here and the database chooses among it under the wallet lock.
import { randomInt } from 'node:crypto';

import { loadCatalog } from '../cards/catalog';
import { adShards, adsPerDay, bonusPerDay, cardsAdsOn, cardsBridgesOn, timerPerDay } from '../cards/flags';
import { EDITIONS, SHARDS } from '../cards/rules';
import { ERROR_STATUS, KC, THEME_IDS, levelOf, titleOf } from './contract';
import { planKcPack, indexPool } from './draw';
import { helpData } from './help-data';
import {
  QUIZ_BASE, momentQuiz, almostState, badgesOf, cardRef, collectionState, dailyGroup, emptyPlayer, groupCards, groupRef, idolPage, lobbyState, missionsState, oddsState, pctOf,
  playerPage, poolCards, rankRows, recyclePreview, sectionsOf, showcaseOf, themeCards,
} from './model';

import type { createServiceRoleClient } from '@/lib/supabase/server';
import type { CatalogPayload } from '../cards/types';
import type { Rng } from '../cards/types';
import type { UiCard, UiEntity } from '../cards/ui-types';
import type {
  ApiError, ApiResult, CardMoment, CardRef, ClaimResponse, CollectionQuery, CraftResponse, ErrorCode, FinishedSetV, FriendRow, FriendsState, LobbyState, LockResponse,
  OpenRequest, OpenResponse, OpenedPack, PackKind, PlayerPage, PrefsRequest, RankingState, RecycleResponse, Edition, ThemeId,
} from './contract';
import type { OwnedRow, PlayerData, PlayerSummary, World } from './model';

type ServiceDb = ReturnType<typeof createServiceRoleClient>;

export const serverRng: Rng = (max) => randomInt(max);

/* ------------------------------------------------------------------ errors */

const WORDS: Record<string, ErrorCode> = {
  bonus: 'bonus', empty: 'empty', stack_short: 'stack_short', shards: 'shards', daily_used: 'daily_used', focus_used: 'focus_used', focus: 'focus', pack: 'pack', source: 'source',
  theme: 'bad_request', key: 'idem_missing', idem_conflict: 'idem_conflict', locked: 'locked', lastcopy: 'last_copy', nothing: 'nothing_to_recycle',
  notowned: 'not_owned', owned: 'owned', card: 'card', no_craft: 'no_craft', ad_limit: 'ad_limit', ticket: 'ticket', claimed: 'already_claimed', set: 'set_unknown',
  nickname: 'no_nickname', code: 'bad_request', user: 'bad_request', pref: 'pref', wish_limit: 'wish_limit', scope: 'bad_request', goal: 'set_not_done',
};

/** The error code of a database refusal ("cards: word"), or null when the message is not one of ours. */
export function errorOf(message: string | undefined): ErrorCode | null {
  const m = /cards: ([a-z_]+)/.exec(message ?? '');
  return m ? (WORDS[m[1]!] ?? null) : null;
}

export const fail = (error: ErrorCode, message?: string): ApiError => (message ? { error, message } : { error });
export const statusOf = (e: ApiError): number => ERROR_STATUS[e.error];

/* ------------------------------------------------------------------ the world */

const GENDER_THEME: Record<string, ThemeId | undefined> = { girl: 'girls', boy: 'boys' };

/** The catalog as a World: the theme of each group and idol, the way cards_theme_of (110) decides it. Pure. */
export function worldFrom(cat: Pick<CatalogPayload, 'cards' | 'entities'>, types: ReadonlyMap<string, string>): World {
  const entities: UiEntity[] = cat.entities.map((e) => ({
    id: e.id, kind: e.kind, name: e.name, group: e.group, debutYear: e.debutYear, sortKey: e.sortKey, lockReasons: e.lockReasons, ...(e.endYear !== undefined ? { endYear: e.endYear } : {}),
  }));
  const cards = cat.cards as unknown as UiCard[];
  const groupHasCard = new Set<string>();
  for (const e of cat.entities) {
    if (!cat.cards.some((c) => c.entity === e.id)) continue;
    if (e.kind === 'group') groupHasCard.add(e.id);
  }
  const byId = new Map(cat.entities.map((e) => [e.id, e]));
  const themeOf = new Map<string, ThemeId>();
  for (const e of cat.entities) {
    if (e.kind === 'group') {
      const t = GENDER_THEME[types.get(e.id) ?? ''];
      if (t) themeOf.set(e.id, t);
    } else if (e.kind === 'idol') {
      const g = e.groupId ? byId.get(e.groupId) : undefined;
      if (!e.groupId || !g || g.kind !== 'group' || !groupHasCard.has(e.groupId)) themeOf.set(e.id, 'solo');
      else {
        const t = GENDER_THEME[types.get(e.groupId) ?? ''];
        if (t) themeOf.set(e.id, t);
      }
    }
  }
  return { cards, entities, themeOf };
}

let cachedWorld: { at: number; world: World } | null = null;
const WORLD_TTL_MS = 5 * 60 * 1000;

export async function loadWorld(db: ServiceDb, now: number = Date.now()): Promise<World> {
  if (cachedWorld && now - cachedWorld.at < WORLD_TTL_MS) return cachedWorld.world;
  const cat = await loadCatalog(now);
  const { data } = await db.from('cards_group_types').select('entity_id, gender').limit(1000);
  const types = new Map(((data ?? []) as { entity_id: string; gender: string }[]).map((r) => [r.entity_id, r.gender]));
  const world = worldFrom(cat, types);
  cachedWorld = { at: now, world };
  return world;
}

export function resetWorldCache(): void {
  cachedWorld = null;
}

/* ------------------------------------------------------------------ the player */

interface PlayerJson {
  wallet: { stock: number; anchor: string; paris_day: string; ads_today: number; timer_today: number; shards: number; packs_opened: number; seen_at: string; created_at: string };
  owned: { n: number; copies: number; fav: boolean; locked: boolean; seen: boolean; first: string; last: string; fpn: number | null }[];
  wishlist: number[];
  gold_count: number;
  bonus_earned: number;
  bonus_today: number;
  claimed: string[];
  week: { week_start: string; packs_opened: number; kpopdle_wins: number; new_cards: number; claimed: boolean };
  prefs: { sound: boolean; vibration: boolean; theme: ThemeId; focus: string | null };
  recent: { opened_at: string; best: PlayerData['recent'][number]['best'] | null; source: PlayerData['recent'][number]['source']; new_count: number | null }[];
  daily_used: boolean;
  focus_used: boolean;
  last: { at: string; pack_no: number; cards: number[] } | null;
}

/** The rows of cards_player as a PlayerData (pure). `today` is the Paris day, to read the daily and focus flags. */
export function playerFrom(j: PlayerJson, nickname: string | null, friends: string[], today: string): PlayerData {
  const t = (v: string): number => Date.parse(v);
  const owned = new Map<number, OwnedRow>(j.owned.map((o) => [o.n, { copies: o.copies, fav: o.fav, locked: o.locked, seen: o.seen, firstAt: t(o.first), lastAt: t(o.last) }]));
  const fpn = new Map(j.owned.map((o) => [o.n, o.fpn]));
  const w = j.wallet;
  const last = j.last ? (() => {
    const seenHere = new Set<number>();
    return {
      at: t(j.last!.at), packNo: j.last!.pack_no,
      cards: j.last!.cards.map((n) => {
        const isNew = fpn.get(n) === j.last!.pack_no && !seenHere.has(n);
        seenHere.add(n);
        return { n, isNew };
      }),
    };
  })() : null;
  return {
    nickname, createdAt: t(w.created_at), owned, wishlist: new Set(j.wishlist), shards: w.shards, stock: w.stock, anchor: t(w.anchor), timerToday: w.timer_today,
    parisDay: w.paris_day, adsToday: w.ads_today, opened: w.packs_opened, sinceGold: j.gold_count, bonusEarned: j.bonus_earned ?? 0, bonusUsed: j.bonus_today ?? 0, dailyDay: j.daily_used ? today : null, focusDay: j.focus_used ? today : null,
    claimedSets: new Set(j.claimed),
    week: { id: j.week.week_start, packs: j.week.packs_opened, dle: j.week.kpopdle_wins, newc: j.week.new_cards, claimed: j.week.claimed },
    prefs: j.prefs, lastSeen: t(w.seen_at),
    recent: j.recent.filter((r) => r.best).map((r) => ({ at: t(r.opened_at), best: r.best!, source: r.source, newCount: r.new_count === null ? null : Number(r.new_count) })),
    last, friends, code: null,
  };
}

/** Kpopdle bonus packs a Paris day: CARDS_BONUS_PER_DAY, and 0 while the bridges are off. */
export const bonusCap = (): number => (cardsBridgesOn() ? bonusPerDay() : 0);

export interface Ctx { db: ServiceDb; userId: string; now: number; rng?: Rng }

async function nicknameOf(db: ServiceDb, userId: string): Promise<string | null> {
  const { data } = await db.from('profiles').select('username').eq('id', userId).maybeSingle();
  return (data as { username?: string } | null)?.username ?? null;
}

export async function loadPlayer(c: Ctx): Promise<PlayerData> {
  const { data, error } = await c.db.rpc('cards_player', { p_user: c.userId, p_now: new Date(c.now).toISOString(), p_timer_cap: timerPerDay() });
  if (error || !data) throw new Error(`cards_player: ${error?.message ?? 'no data'}`);
  const day = (data as PlayerJson).wallet.paris_day;
  const nick = await nicknameOf(c.db, c.userId);
  const p = playerFrom(data as PlayerJson, nick, [], day);
  const today = new Date(c.now).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  if (p.dailyDay) p.dailyDay = today;
  if (p.focusDay) p.focusDay = today;
  return p;
}

async function lobbyOf(c: Ctx, w: World, p?: PlayerData): Promise<LobbyState> {
  const pd = p ?? (await loadPlayer(c));
  return lobbyState({ w, p: pd, now: c.now, timerCap: timerPerDay(), adsPerDay: adsPerDay(), adShards: adShards(), adsEnabled: cardsAdsOn(), bonusPerDay: bonusCap() });
}

/* ------------------------------------------------------------------ reads */

export async function state(c: Ctx): Promise<ApiResult<LobbyState>> {
  const w = await loadWorld(c.db, c.now);
  return lobbyOf(c, w);
}

export async function collection(c: Ctx, q: CollectionQuery) {
  const [w, p] = await Promise.all([loadWorld(c.db, c.now), loadPlayer(c)]);
  return collectionState(w, p, q);
}

export async function almost(c: Ctx, limit: number) {
  const [w, p] = await Promise.all([loadWorld(c.db, c.now), loadPlayer(c)]);
  return almostState(w, p, limit);
}

export async function missions(c: Ctx) {
  const [w, p] = await Promise.all([loadWorld(c.db, c.now), loadPlayer(c)]);
  return missionsState(w, p, c.now);
}

export async function level(c: Ctx) {
  const [w, p] = await Promise.all([loadWorld(c.db, c.now), loadPlayer(c)]);
  const l = lobbyState({ w, p, now: c.now, odds: false }).level;
  const n = l.cards;
  return { level: l, pct: pctOf(n, w.cards.length), owned: n, total: w.cards.length, badges: badgesOf(w, new Set(p.owned.keys()), p.createdAt) };
}

export async function odds(c: Ctx) {
  const w = await loadWorld(c.db, c.now);
  const day = new Date(c.now).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  return oddsState(w, c.now, dailyGroup(w, day));
}

export const help = () => helpData();

interface MomentJson {
  n: number;
  event: { name: string; date: string | null; precision: 'day' | 'month' | 'year' | null } | null;
  yours: { first_at: string; pack_no: number | null; how: 'pack' | 'craft' | 'demo'; copies: number } | null;
  quiz_slug: string | null;
}

/** "The moment" of the card view: the photo's event, the player's first copy of the card, the quiz link. */
export async function card(c: Ctx, n: number): Promise<ApiResult<CardMoment>> {
  const w = await loadWorld(c.db, c.now);
  const { data, error } = await c.db.rpc('cards_moment', { p_user: c.userId, p_card_no: n });
  if (error || !data) return fail(errorOf(error?.message) ?? 'server');
  const j = data as MomentJson;
  return {
    n: j.n, event: j.event ? { name: j.event.name, date: j.event.date, precision: j.event.date ? j.event.precision ?? 'day' : null } : null,
    yours: j.yours ? { firstAt: new Date(j.yours.first_at).toISOString(), packNo: j.yours.pack_no, how: j.yours.how, copies: j.yours.copies } : null,
    quiz: momentQuiz(w, n, j.quiz_slug),
  };
}

export async function recyclePreviewOf(c: Ctx) {
  const [w, p] = await Promise.all([loadWorld(c.db, c.now), loadPlayer(c)]);
  return recyclePreview(w, p);
}

export async function idol(c: Ctx, slug: string): Promise<ApiResult<ReturnType<typeof idolPage> & object>> {
  const [w, p] = await Promise.all([loadWorld(c.db, c.now), loadPlayer(c)]);
  return idolPage(w, p, slug) ?? fail('idol_unknown');
}

/* ------------------------------------------------------------------ people */

interface ProfileJson { nickname: string; owned: number; showcase: number[]; badges: string[]; friend: boolean; me: boolean; wishlist: number[] | null }

const refOf = (w: World, n: number): CardRef | null => {
  const card = w.cards.find((x) => x.n === n);
  return card ? cardRef(card) : null;
};
const refs = (w: World, ns: number[] | null): CardRef[] => (ns ?? []).map((n) => refOf(w, n)).filter((x): x is CardRef => x !== null);

const summaryOf = (w: World, j: ProfileJson): PlayerSummary => ({ nickname: j.nickname, owned: j.owned, showcase: refs(w, j.showcase), badges: j.badges, friend: j.friend, me: j.me });

export async function ranking(c: Ctx, scope: 'friends' | 'all'): Promise<ApiResult<RankingState>> {
  const w = await loadWorld(c.db, c.now);
  const { data, error } = await c.db.rpc('cards_ranking', { p_user: c.userId, p_scope: scope, p_limit: 50 });
  if (error) return fail(errorOf(error.message) ?? 'server');
  const list = ((data ?? []) as ProfileJson[]).map((j) => summaryOf(w, j));
  const rows = rankRows(list, w.cards.length);
  return { scope, rows, me: rows.find((r) => r.me) ?? null };
}

export async function player(c: Ctx, nickname: string): Promise<ApiResult<PlayerPage>> {
  const w = await loadWorld(c.db, c.now);
  const { data, error } = await c.db.rpc('cards_profile', { p_viewer: c.userId, p_nickname: nickname });
  if (error) return fail('server');
  if (!data) return fail('player_unknown');
  const j = data as ProfileJson;
  return playerPage(summaryOf(w, j), w.cards.length, j.wishlist === null ? null : refs(w, j.wishlist));
}

export async function friends(c: Ctx): Promise<ApiResult<FriendsState>> {
  const w = await loadWorld(c.db, c.now);
  const { data, error } = await c.db.rpc('cards_friends', { p_user: c.userId });
  if (error || !data) return fail('server');
  const d = data as { friends: ProfileJson[]; code: { code: string; expires_at: string } | null };
  const rows: FriendRow[] = d.friends.map((j) => {
    const lv = levelOf(j.owned);
    return { nickname: j.nickname, level: lv, title: titleOf(lv), pct: pctOf(j.owned, w.cards.length), wishlist: refs(w, j.wishlist) };
  });
  return { friends: rows, code: d.code ? { code: d.code.code, expiresAt: new Date(d.code.expires_at).toISOString() } : null, max: KC.FRIENDS_MAX };
}

const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function newFriendCode(rng: Rng = serverRng): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[rng(CODE_ALPHABET.length)]!;
  return s;
}

export async function friendCode(c: Ctx) {
  const code = newFriendCode(c.rng);
  const { data, error } = await c.db.rpc('cards_friend_code_new', { p_user: c.userId, p_code: code, p_now: new Date(c.now).toISOString() });
  if (error || !data) return fail(errorOf(error?.message) ?? 'server');
  const d = data as { code: string; expires_at: string };
  return { code: `${d.code.slice(0, 4)}-${d.code.slice(4)}`, expiresAt: new Date(d.expires_at).toISOString() };
}

const FRIEND_FAIL: Record<string, ErrorCode> = { code_invalid: 'code_invalid', code_used: 'code_used', code_expired: 'code_expired', self: 'self_friend', already: 'self_friend', friend_limit: 'friend_limit', rate: 'rate_limited' };

export async function friendRedeem(c: Ctx, key: string, code: string) {
  const { data, error } = await c.db.rpc('cards_friend_redeem', { p_user: c.userId, p_key: key, p_code: code, p_now: new Date(c.now).toISOString() });
  if (error || !data) return fail(errorOf(error?.message) ?? 'server');
  const d = data as { ok: boolean; error?: string; nickname?: string };
  if (!d.ok) return fail(FRIEND_FAIL[d.error ?? ''] ?? 'code_invalid');
  const list = await friends(c);
  if ('error' in list) return list;
  const friend = list.friends.find((f) => f.nickname === d.nickname) ?? list.friends[0];
  if (!friend) return fail('server');
  return { friend, friends: list };
}

export async function friendRemove(c: Ctx, nickname: string) {
  const { error } = await c.db.rpc('cards_friend_remove', { p_user: c.userId, p_nickname: nickname });
  if (error) return fail('server');
  return friends(c);
}

/* ------------------------------------------------------------------ writes */

interface OpenJson {
  replayed: boolean;
  packs: { id: string; pack_no: number; source: OpenRequest['source']; theme: PackKind | null; group: string | null; golden: boolean; guarantee: boolean; new_count: number;
    cards: { n: number; isNew: boolean; completesPair: boolean; golden: boolean; guarantee: boolean }[] }[];
  finished: FinishedSetV[];
  owned_before: number;
  owned_after: number;
}

const EDITION_ORDER: Edition[] = ['std', 'stage', 'holo', 'era', 'gold', 'full'];

/** The answer of POST /open from cards_open's answer (pure). */
export function openResponseFrom(w: World, j: OpenJson, state: LobbyState): OpenResponse {
  const sections = sectionsOf(w);
  const cardOf = new Map(w.cards.map((x) => [x.n, x]));
  const packs: OpenedPack[] = j.packs.map((p) => {
    const theme: PackKind = p.theme ?? 'all';
    const cards = p.cards.map((x) => ({ ...x, edition: cardOf.get(x.n)?.edition ?? 'std', theme }));
    const best = cards.reduce<Edition>((m, x) => (EDITION_ORDER.indexOf(x.edition) > EDITION_ORDER.indexOf(m) ? x.edition : m), 'std');
    const g = p.group ? sections.find((s) => s.id === p.group) : null;
    return { id: p.id, packNo: p.pack_no, source: p.source, theme, group: g ? groupRef(g) : null, golden: p.golden, guarantee: p.guarantee, cards, newCount: p.new_count, best };
  });
  const all = packs.flatMap((p) => p.cards);
  const newCards = all.filter((x) => x.isNew).length;
  const copies = all.length - newCards;
  const copiesShards = all.filter((x) => !x.isNew).reduce((s, x) => s + SHARDS[cardOf.get(x.n)!.rarity], 0);
  const best = packs.reduce<Edition>((m, p) => (EDITION_ORDER.indexOf(p.best) > EDITION_ORDER.indexOf(m) ? p.best : m), 'std');
  const before = levelOf(j.owned_before);
  const after = levelOf(j.owned_after);
  return {
    packs, replayed: j.replayed, state,
    summary: {
      newCards, copies, copiesShards, best, goldenPacks: packs.filter((p) => p.golden).length, guaranteePacks: packs.filter((p) => p.guarantee).length, finished: j.finished,
      levelUp: after > before ? { from: before, to: after, title: titleOf(after) } : null,
      headline: newCards > 0 ? `${newCards} new card${newCards === 1 ? '' : 's'} for your collection` : 'Only copies this time',
    },
  };
}

/** The plans of the packs of one request: the pool of the pack kind, drawn with the rng. Needs the daily group for 'daily' and the group for 'focus'. */
export function plansFor(w: World, req: Pick<OpenRequest, 'source' | 'theme' | 'focus'>, dailyGroupId: string | null, n: number, rng: Rng, theme: ThemeId) {
  const all = indexPool(poolCards(w));
  let pool = all;
  let focus: string | null = null;
  if (req.source === 'daily') {
    if (!dailyGroupId) return null;
    const cs = groupCards(w, dailyGroupId);
    if (cs.length === 0) return null;
    pool = indexPool(cs.map((x) => ({ n: x.n, kind: x.kind, rarity: x.rarity, entity: x.entity })));
  } else if (req.source === 'focus') {
    focus = req.focus ?? null;
  } else if (theme !== 'all') {
    const cs = themeCards(w, theme);
    if (cs.length === 0) return null;
    pool = indexPool(cs.map((x) => ({ n: x.n, kind: x.kind, rarity: x.rarity, entity: x.entity })));
  }
  const out = [];
  for (let i = 0; i < n; i++) out.push(planKcPack(pool, all, rng, focus));
  return out;
}

export async function open(c: Ctx, req: OpenRequest): Promise<ApiResult<OpenResponse>> {
  const n = req.packs === 5 ? 5 : 1;
  if (!['stock', 'daily', 'focus', 'shards', 'bonus'].includes(req.source) || (req.packs !== undefined && req.packs !== 1 && req.packs !== 5)) return fail('bad_request');
  if (n === 5 && req.source !== 'stock') return fail('bad_request');
  if (req.theme !== undefined && !THEME_IDS.includes(req.theme)) return fail('bad_request');
  if (req.source === 'focus' && (typeof req.focus !== 'string' || !/^group:[A-Za-z0-9_.-]{1,80}$/.test(req.focus))) return fail('focus');
  const w = await loadWorld(c.db, c.now);
  const day = new Date(c.now).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  let theme: ThemeId = req.theme ?? 'all';
  if (req.theme === undefined && (req.source === 'stock' || req.source === 'shards' || req.source === 'bonus')) {
    const { data } = await c.db.rpc('cards_prefs_get', { p_user: c.userId });
    const t = (data as { theme?: ThemeId } | null)?.theme;
    if (t && THEME_IDS.includes(t)) theme = t;
  }
  let dailyId: string | null = null;
  if (req.source === 'daily') {
    const { data } = await c.db.rpc('cards_daily_group', { p_day: day });
    dailyId = typeof data === 'string' ? data : null;
  }
  if (req.source === 'bonus') {
    if (n !== 1) return fail('bad_request');
    // The wins are read again by the database before the pack opens (a win whose line never posted still counts, once per play).
    await c.db.rpc('cards_bonus_record', { p_user: c.userId, p_now: new Date(c.now).toISOString() });
  }
  const rng = c.rng ?? serverRng;
  const plans = plansFor(w, req, dailyId, n, rng, theme);
  if (!plans) return fail('pack');
  const lim = { ads: adsPerDay(), timer: timerPerDay() };
  const { data, error } = await c.db.rpc('cards_open', {
    p_user: c.userId, p_key: req.key, p_source: req.source, p_theme: req.source === 'stock' || req.source === 'shards' || req.source === 'bonus' ? theme : null,
    p_focus: req.source === 'focus' ? req.focus : null, p_draws: plans, p_now: new Date(c.now).toISOString(), p_ads_limit: lim.ads, p_bonus_cap: bonusCap(), p_timer_cap: lim.timer,
  });
  if (error || !data) return fail(errorOf(error?.message) ?? 'server');
  const p = await loadPlayer(c);
  return openResponseFrom(w, data as OpenJson, lobbyState({ w, p, now: c.now, timerCap: lim.timer, adsPerDay: lim.ads, adShards: adShards(), adsEnabled: cardsAdsOn(), bonusPerDay: bonusCap() }));
}

export async function claim(c: Ctx, key: string, target: string): Promise<ApiResult<ClaimResponse>> {
  const { data, error } = await c.db.rpc('cards_claim', { p_user: c.userId, p_key: key, p_target: target, p_now: new Date(c.now).toISOString(), p_timer_cap: timerPerDay() });
  if (error || !data) {
    const e = errorOf(error?.message);
    return fail(e === 'set_not_done' && target === 'week' ? 'week_not_done' : (e ?? 'server'));
  }
  const d = data as { replayed: boolean; target: string; packs: number; shards: number };
  const [w, p] = await Promise.all([loadWorld(c.db, c.now), loadPlayer(c)]);
  return { target: d.target, packs: d.packs, shards: d.shards, replayed: d.replayed, missions: missionsState(w, p, c.now), state: lobbyState({ w, p, now: c.now, timerCap: timerPerDay(), adsPerDay: adsPerDay(), adShards: adShards(), adsEnabled: cardsAdsOn(), bonusPerDay: bonusCap() }) };
}

export async function craft(c: Ctx, key: string, n: number): Promise<ApiResult<CraftResponse>> {
  const { data, error } = await c.db.rpc('cards_craft', { p_user: c.userId, p_key: key, p_card_no: n, p_now: new Date(c.now).toISOString(), p_timer_cap: timerPerDay() });
  if (error || !data) return fail(errorOf(error?.message) ?? 'server');
  const d = data as { replayed: boolean; card_no: number; cost: number; finished: FinishedSetV[] };
  return { n: d.card_no, cost: d.cost, finished: d.finished ?? [], replayed: d.replayed, state: await lobbyOf(c, await loadWorld(c.db, c.now)) };
}

export async function recycle(c: Ctx, key: string, confirm: boolean, n?: number): Promise<ApiResult<RecycleResponse>> {
  if (confirm !== true) return fail('confirm_required');
  const { data, error } = await c.db.rpc('cards_recycle', { p_user: c.userId, p_key: key, p_n: n ?? null, p_now: new Date(c.now).toISOString(), p_timer_cap: timerPerDay() });
  if (error || !data) return fail(errorOf(error?.message) ?? 'server');
  const d = data as { replayed: boolean; recycled: number; shards: number; skipped: { locked: number; goldAndFullArt: number } };
  return { recycled: d.recycled, shards: d.shards, skipped: d.skipped, replayed: d.replayed, state: await lobbyOf(c, await loadWorld(c.db, c.now)) };
}

export async function lock(c: Ctx, n: number, on: boolean): Promise<ApiResult<LockResponse>> {
  const { data, error } = await c.db.rpc('cards_lock', { p_user: c.userId, p_card_no: n, p_on: on, p_now: new Date(c.now).toISOString() });
  if (error || !data) return fail(errorOf(error?.message) ?? 'server');
  const d = data as { n: number; locked: boolean; locks: number };
  return { n: d.n, locked: d.locked, locks: d.locks };
}

export async function prefs(c: Ctx, req: PrefsRequest) {
  const patch: Record<string, unknown> = {};
  if (req.sound !== undefined) patch.sound = req.sound;
  if (req.vibration !== undefined) patch.vibration = req.vibration;
  if (req.theme !== undefined) patch.theme = req.theme;
  if (req.focus !== undefined) patch.focus = req.focus;
  const { data, error } = await c.db.rpc('cards_prefs_set', { p_user: c.userId, p_patch: patch, p_now: new Date(c.now).toISOString() });
  if (error || !data) return fail(errorOf(error?.message) ?? 'server');
  return { prefs: data as LobbyState['prefs'] };
}

export async function seen(c: Ctx, ns: number[]) {
  const { data, error } = await c.db.rpc('cards_seen', { p_user: c.userId, p_cards: ns.slice(0, 500) });
  if (error) return fail('server');
  return { newCards: Number(data) };
}

export async function stillThere(c: Ctx) {
  const { error } = await c.db.rpc('cards_still_there', { p_user: c.userId, p_now: new Date(c.now).toISOString(), p_timer_cap: timerPerDay() });
  if (error) return fail('server');
  return { ok: true as const, state: await lobbyOf(c, await loadWorld(c.db, c.now)) };
}

export { QUIZ_BASE, emptyPlayer, showcaseOf, EDITIONS };
