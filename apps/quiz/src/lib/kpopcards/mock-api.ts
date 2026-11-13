// KpopCards: the SEEDED MOCK of the API contract (contract.ts), in memory, on the real fixture catalog (lib/cards/ui-fixture.ts). Same seed and
// same calls: same state and same draws. It uses the very pure views of the real server (model.ts) and the very pure draw (draw.ts), so
// a screen built against it sees what production answers. For the dev fixture mode (CARDS_UI_FIXTURE=1) and for the screen comparisons.
// The catalog is given by the caller (see MockOptions.world). Never a source of truth: nothing is stored outside the object, and the clock is injectable.
import { EDITIONS, SHARDS, craftCost } from '../cards/rules';
import { ERROR_STATUS, KC, THEME_IDS, isApiError, levelOf, titleOf } from './contract';
import { drawKcPack, indexPool } from './draw';
import { helpData } from './help-data';
import {
  badgesOf, cardRef, idolPage, momentQuiz, quizSlug, collectionState, dailyGroup, emptyPlayer, groupCards, lobbyState, missionsState, missionSets, oddsState, pctOf, playerPage, poolCards, rankRows,
  recyclePreview, almostState, sectionsOf, showcaseOf, themeCards, weekMini, walletNow, weekStartOf, slugify,
} from './model';

import type { UiCard, UiCatalog } from '../cards/ui-types';
import type { Rng, Rarity } from '../cards/types';
import type {
  ApiError, ClaimRequest, CraftRequest, DemoClaimRequest, FriendRedeemRequest, KpopCardsApi, OpenRequest, OpenedCardV, OpenedPack, PackKind, RecycleRequest, ThemeId,
} from './contract';
import type { PlayerData, PlayerSummary, World } from './model';

/** mulberry32: a small seeded generator. */
export function seededRng(seed: number): Rng {
  let s = seed >>> 0;
  return (max: number) => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

/** The themes of the fixture's invented groups: the groups alternate girls and boys, and the one-member group is a soloist. */
export function fixtureWorld(cat: UiCatalog): World {
  const themeOf = new Map<string, ThemeId>();
  const groups = cat.entities.filter((e) => e.kind === 'group').sort((a, b) => a.name.localeCompare(b.name));
  groups.forEach((g, i) => {
    const members = cat.entities.filter((e) => e.kind === 'idol' && e.group === g.name);
    if (members.length <= 1) { for (const m of members) themeOf.set(m.id, 'solo'); return; }
    const t: ThemeId = i % 2 === 0 ? 'girls' : 'boys';
    themeOf.set(g.id, t);
    for (const m of members) themeOf.set(m.id, t);
  });
  return { cards: cat.cards, entities: cat.entities, themeOf };
}

export interface ForcedCard { rarity: Rarity; isNew: boolean }

export interface MockOptions {
  seed?: number;
  /** Injected clock (ms since epoch). Default: Date.now. */
  now?: () => number;
  /** The player starts with the prototype's example binder (default) or an empty one. `start` wins over `example` (the dev fixture's `?kcstate=example`). */
  example?: boolean;
  start?: 'example' | 'empty';
  nickname?: string | null;
  /** The catalog the mock runs on. The caller gives it (fixtureWorld(fixtureCatalog()) in the dev fixture mode and in tests): this module never imports the dev fixture itself, so no production path can reach it (ui-fixture-guard.test.ts). */
  world: World;
}

export interface MockApi extends KpopCardsApi {
  /** For tests and the screen comparisons: the player's rows, the clock and the world. */
  readonly data: PlayerData;
  readonly world: World;
  setNow(ms: number): void;
  /** Force the next opened pack to be golden (the prototype control). */
  forceGolden(): void;
  /** Make the Gold guarantee fire in the next pack. */
  forceGuarantee(): void;
  /** The prototype controls: the third card of the next pack is a card of this rarity (UR: Gold, L: Full Art), when the catalog has one. */
  forceRarity(r: 'UR' | 'L'): void;
  /** Dev fixture control: the next pack is exactly this pattern (cards of these rarities picked from the catalog, new to the player or copies as asked; a copy of a
   *  card he does not own yet is given to him first). The totals, the shards of the copies and the summary follow from it. Used once. */
  forcePack(cards: ForcedCard[]): void;
  /** The prototype's "force Full Art" control: the third card of the next pack is a Full Art card. The fixture holds none unless CARDS_UI_FIXTURE_FULL=1; then the best card the catalog has is used. */
  forceFullArt(): void;
  /** The prototype's "39 timer packs used today": one more timer pack is left and the stack is below its cap. */
  useTimerUpTo(n: number): void;
  /** A Kpopdle win counted for this week. */
  addDleWin(): void;
  /** Start again with the example binder (true) or an empty one with 3 packs (false). */
  reset(example: boolean): void;
}

// The prototype's ranking rows (FRIENDS and EVERYONE), nicknames as written there.
const FRIENDS: readonly [string, number][] = [['dalgom_daisy', 61], ['seoul_spark', 47], ['neon.bunny', 34], ['kpop_mochi', 29], ['lightstick_lu', 22], ['haru_hearts', 15], ['minty_wave', 9]];
const EVERYONE: readonly [string, number][] = [['byeol_hunter', 92], ['photocard_pia', 88], ['star_seeker', 81], ['dalgom_daisy', 61], ['lumi.lumi', 58], ['seoul_spark', 47], ['neon.bunny', 34], ['kpop_mochi', 29], ['lightstick_lu', 22], ['haru_hearts', 15]];
const MOMENTS: readonly [string, string][] = [['Music Bank', 'KBS, Seoul'], ['Inkigayo', 'SBS, Seoul'], ['Melon Music Awards', 'Seoul'], ['Golden Disc Awards', 'Seoul'], ['KCON', 'Los Angeles'], ['Dream Concert', 'Seoul'], ['Airport arrival', 'Incheon'], ['Press conference', 'Seoul'], ['Fan sign', 'Seoul']];

const err = (error: ApiError['error'], message?: string): ApiError => (message ? { error, message } : { error });

export function createMockApi(opts: MockOptions): MockApi {
  const seed = opts.seed ?? 1;
  const rng = seededRng(seed);
  let nowMs = 0;
  const clock = opts.now;
  const now = (): number => (clock ? clock() : nowMs || Date.now());
  const w = opts.world;
  const p: PlayerData = emptyPlayer(now(), opts.nickname === undefined ? 'mingi' : opts.nickname);
  const idem = new Map<string, { op: string; res: unknown }>();
  let forceGoldenNext = false;
  let forceGuarantee = false;
  let forcedRarity: 'UR' | 'L' | null = null;
  let forcedPack: ForcedCard[] | null = null;
  const total = (): number => w.cards.length;
  const ownedNs = (): Set<number> => new Set(p.owned.keys());

  // The example player of the prototype v6 (its fresh(true) state), on the catalog it is given: 44 Standard, 16 Stage, 6 Holo, 2 Era and 1 Gold cards chosen by
  // the seed outside one group that is owned complete (the prototype's aespa: here the smallest group), copies 1 to 3, 3 starred cards of Holo or better, a
  // wishlist of 3 missing Holo cards of another group, the 4 newest cards flagged New, 7 packs in the stack, 34 shards, 14 timer packs used, 48 packs opened,
  // 6 packs of history, the week at 12 packs, 1 Kpopdle win and 7 new cards, the nickname mingi. A rarity the catalog does not have is skipped.
  const seedExample = (): void => {
    const r = seededRng(seed * 7919 + 23);
    const t0 = now() - 86400000;
    const groups = sectionsOf(w).filter((s2) => s2.kind === 'group' && w.cards.some((c) => s2.ids.includes(c.entity)));
    const size = (s2: (typeof groups)[number]): number => w.cards.filter((c) => s2.ids.includes(c.entity)).length;
    const complete = [...groups].sort((x, y) => size(x) - size(y) || x.name.localeCompare(y.name))[0];
    // A second group is left one card short of complete, its lowest-numbered Standard or Stage card, first in the list (the groups sort before the idols), so "Almost there" offers a Craft button the
    // 34 shards can pay (10 or 20), as the prototype's example does.
    const rest = [...groups].filter((g) => g !== complete).sort((x, y) => size(x) - size(y) || x.name.localeCompare(y.name));
    const almost = rest.find((g) => w.cards.filter((c) => g.ids.includes(c.entity) && (c.rarity === 'C' || c.rarity === 'U')).length >= 1);
    const inComplete = (n: number): boolean => {
      const e = w.cards.find((c) => c.n === n)!.entity;
      return (!!complete && complete.ids.includes(e)) || (!!almost && almost.ids.includes(e));
    };
    let i = 0;
    const own = (c: UiCard): void => {
      const copies = 1 + (r(100) < 30 ? 1 : 0) + (r(100) < 8 ? 1 : 0);
      p.owned.set(c.n, { copies, fav: false, locked: false, seen: true, firstAt: t0 - i * 60000, lastAt: t0 - i * 60000, packNo: 1 + r(47), how: 'pack' });
      i++;
    };
    const goal: Partial<Record<Rarity, number>> = { C: 44, U: 16, R: 6, SR: 2, UR: 1 };
    for (const [rar, count] of Object.entries(goal) as [Rarity, number][]) {
      const list = w.cards.filter((c) => c.rarity === rar && !inComplete(c.n));
      let got = 0, guard = 0;
      while (list.length && got < Math.min(count, list.length) && guard++ < 5000) {
        const c = list[r(list.length)]!;
        if (p.owned.has(c.n)) continue;
        own(c);
        got++;
      }
    }
    if (complete) for (const c of w.cards.filter((x) => complete.ids.includes(x.entity))) if (!p.owned.has(c.n)) own(c);
    if (almost) {
      const cs = w.cards.filter((x) => almost.ids.includes(x.entity)).sort((x, y) => x.n - y.n);
      const missing = new Set(cs.filter((c) => c.rarity === 'C' || c.rarity === 'U').slice(0, 1).map((c) => c.n));
      for (const c of cs) if (!missing.has(c.n) && !p.owned.has(c.n)) own(c);
    }
    const rank = (n: number): number => ['C', 'U', 'R', 'SR', 'UR', 'L'].indexOf(w.cards.find((c) => c.n === n)!.rarity);
    const owned = [...p.owned.keys()];
    for (const n of owned.filter((n2) => rank(n2) >= 2).slice(0, 3)) p.owned.get(n)!.fav = true;
    const other = rest.find((g) => g !== almost);
    if (other) for (const c of w.cards.filter((x) => x.rarity === 'R' && other.ids.includes(x.entity) && !p.owned.has(x.n)).slice(0, 3)) p.wishlist.add(c.n);
    for (const n of owned.slice(-4)) p.owned.get(n)!.seen = false;
    p.shards = 34; p.stock = 7; p.timerToday = 14; p.anchor = now() - 3 * 60000; p.opened = 48; p.sinceGold = 0;
    const bests: Rarity[] = ['R', 'C', 'U', 'SR', 'U', 'R'];
    const nws = [2, 1, 3, 2, 0, 4];
    p.recent = bests.map((best, k) => ({ at: now() - (k * 2 + 1) * 3600000 - k * 600000, best, source: k === 4 ? 'shards' as const : 'stock' as const, newCount: nws[k]! }));
    p.week = { id: weekStartOf(now()), packs: 12, dle: 1, newc: 7, claimed: false };
    p.nickname = opts.nickname === undefined ? 'mingi' : opts.nickname;
  };
  const example = opts.start ? opts.start === 'example' : opts.example !== false;
  if (example) seedExample();

  const sync = (): void => {
    const wal = walletNow(p, now());
    if (p.parisDay !== wal.parisDay) { p.bonusEarned = 0; p.bonusUsed = 0; }
    p.stock = wal.stock; p.anchor = wal.anchor; p.timerToday = wal.timerToday; p.adsToday = wal.adsToday; p.parisDay = wal.parisDay;
    const wk = weekStartOf(now());
    if (p.week.id !== wk) p.week = { id: wk, packs: 0, dle: 0, newc: 0, claimed: false };
  };
  const touch = (): void => { sync(); p.lastSeen = now(); if (!walletNow({ ...p, lastSeen: now() }, now()).paused) { /* timer runs */ } };
  const view = (): ReturnType<typeof lobbyState> => lobbyState({ w, p, now: now(), adsEnabled: true, bonusPerDay: KC.BONUS_PER_DAY });
  const key = (k: string | undefined, op: string): ApiError | { hit: unknown } | null => {
    if (!k || !/^[0-9a-f-]{8,64}$/i.test(k)) return err('idem_missing');
    const h = idem.get(k);
    if (!h) return null;
    return h.op === op ? { hit: h.res } : err('idem_conflict');
  };

  const sec = (c: UiCard): void => { void c; };
  void sec;

  function packOf(source: OpenRequest['source'], theme: ThemeId, focus: string | undefined, golden: boolean, pity: boolean, owned: Set<number>): { drawn: ReturnType<typeof drawKcPack>; kind: PackKind } {
    const all = indexPool(poolCards(w));
    if (source === 'daily') {
      const g = dailyGroup(w, p.parisDay)!;
      const pool = indexPool(poolCards(w).filter((c) => groupCards(w, g.id).some((x) => x.n === c.n)));
      return { drawn: drawKcPack(pool, all, rng, { pity, golden, owned }), kind: 'daily' };
    }
    if (source === 'focus') {
      return { drawn: drawKcPack(all, all, rng, { pity, golden, owned, focus: focus ?? null }), kind: 'focus' };
    }
    const cs = themeCards(w, theme);
    const pool = theme === 'all' ? all : indexPool(poolCards(w).filter((c) => cs.some((x) => x.n === c.n)));
    return { drawn: drawKcPack(pool, all, rng, { pity, golden, owned }), kind: theme };
  }

  function addCard(c: UiCard, packNo: number): { isNew: boolean; pair: boolean } {
    const o = p.owned.get(c.n);
    let pair = false;
    if (!o && c.pairN) pair = p.owned.has(c.pairN);
    if (o) { o.copies += 1; o.lastAt = now(); } else p.owned.set(c.n, { copies: 1, fav: false, locked: false, seen: false, firstAt: now(), lastAt: now(), packNo, how: 'pack' });
    return { isNew: !o, pair };
  }

  const api: MockApi = {
    get data() { return p; },
    get world() { return w; },
    setNow(ms: number) { nowMs = ms; },
    forceGolden() { forceGoldenNext = true; },
    forceGuarantee() { forceGuarantee = true; },
    forceRarity(r: 'UR' | 'L') { forcedRarity = r; },
    forceFullArt() { forcedRarity = 'L'; },
    forcePack(cards: ForcedCard[]) { forcedPack = cards.length === 5 ? cards : null; },
    useTimerUpTo(n: number) { sync(); p.timerToday = n; if (p.stock >= KC.STACK_CAP) p.stock = KC.STACK_CAP - 1; p.anchor = now(); },
    addDleWin() { sync(); p.week.dle += 1; p.bonusEarned += 1; },
    reset(example: boolean) {
      Object.assign(p, emptyPlayer(now(), p.nickname));
      idem.clear();
      if (example) seedExample(); else { p.stock = 3; }
    },

  } as unknown as MockApi;

  // The rest is attached below so `this` stays simple.
  const impl: KpopCardsApi = {
    async state() { sync(); return view(); },
    async open(req: OpenRequest) {
      const k = key(req.key, `open:${req.source}:${req.packs === 5 ? 5 : 1}`);
      if (k && 'error' in k) return k;
      if (k && 'hit' in k) return { ...(k.hit as object), replayed: true } as never;
      touch();
      const source = req.source;
      if (!['stock', 'daily', 'focus', 'shards', 'bonus'].includes(source)) return err('source');
      const n = req.packs === 5 ? 5 : 1;
      if (n === 5 && source !== 'stock') return err('bad_request');
      const theme: ThemeId = req.theme && THEME_IDS.includes(req.theme) ? req.theme : p.prefs.theme;
      const day = p.parisDay;
      if (source === 'daily' && p.dailyDay === day) return err('daily_used');
      if (source === 'focus') {
        if (!req.focus || !w.entities.some((e) => e.id === req.focus && e.kind === 'group')) return err('focus');
        if (p.focusDay === day) return err('focus_used');
        if (p.stock < 1) return err('empty');
      }
      if (source === 'stock') { if (p.stock < n) return err(n === 5 ? 'stack_short' : 'empty'); }
      if (source === 'shards' && p.shards < KC.SHARD_PACK) return err('shards');
      if (source === 'bonus') {
        if (n !== 1) return err('bad_request');
        if (Math.min(KC.BONUS_PER_DAY, p.bonusEarned) - p.bonusUsed < 1) return err('bonus');
      }
      const before = levelOf(ownedNs().size);
      const finishedBefore = new Set(missionSets(w, p).filter((s) => s.done).map((s) => s.id));
      if (source === 'stock' || source === 'focus') p.stock -= n;
      if (source === 'shards') p.shards -= KC.SHARD_PACK;
      if (source === 'bonus') p.bonusUsed += 1;
      if (source === 'daily') p.dailyDay = day;
      if (source === 'focus') p.focusDay = day;
      const packs: OpenedPack[] = [];
      let copiesShards = 0, copies = 0, newCards = 0, goldenPacks = 0, guaranteePacks = 0;
      let bestRank = 0;
      for (let i = 0; i < n; i++) {
        const packNo = p.opened + 1;
        const golden = forceGoldenNext || packNo % KC.GOLDEN_EVERY === 0;
        const pity = forceGuarantee || (p.sinceGold >= KC.GOLD_BY_PACK - 1 && w.cards.some((c) => c.rarity === 'UR'));
        forceGoldenNext = false; forceGuarantee = false;
        const { drawn, kind } = packOf(source, theme, req.focus, golden, pity, ownedNs());
        if (forcedPack) {
          // The pattern of the dev control: new cards are unowned cards of the rarity, copies are owned ones (given first when he has none).
          const used = new Set<number>();
          const chosen: number[] = [];
          for (const f of forcedPack) {
            const ofR = w.cards.filter((x) => x.rarity === f.rarity);
            if (ofR.length === 0) { chosen.push(drawn.cards[chosen.length]!); continue; }
            let pick: UiCard | undefined;
            if (f.isNew) pick = ofR.find((x) => !p.owned.has(x.n) && !used.has(x.n)) ?? ofR[0];
            else {
              pick = ofR.find((x) => p.owned.has(x.n)) ?? ofR.find((x) => !used.has(x.n)) ?? ofR[0];
              if (pick && !p.owned.has(pick.n)) p.owned.set(pick.n, { copies: 1, fav: false, locked: false, seen: true, firstAt: now() - 86400000, lastAt: now() - 86400000, packNo: 1, how: 'pack' });
            }
            used.add(pick!.n);
            chosen.push(pick!.n);
          }
          drawn.cards.splice(0, 5, ...chosen);
          forcedPack = null;
        }
        if (forcedRarity) {
          let pool = w.cards.filter((x) => x.rarity === forcedRarity);
          if (!pool.length) {
            const order = ['L', 'UR', 'SR', 'R', 'U', 'C'];
            const best = order.find((rr) => w.cards.some((x) => x.rarity === rr))!;
            pool = w.cards.filter((x) => x.rarity === best);
          }
          if (pool.length) drawn.cards[2] = pool[rng(pool.length)]!.n;
          forcedRarity = null;
        }
        const cards: OpenedCardV[] = [];
        let nw = 0;
        drawn.cards.forEach((cn, idx) => {
          const c = w.cards.find((x) => x.n === cn)!;
          const r = addCard(c, packNo);
          if (r.isNew) nw++; else { copies++; copiesShards += SHARDS[c.rarity]; }
          cards.push({ n: cn, edition: c.edition, isNew: r.isNew, completesPair: r.pair, golden: drawn.golden && idx === 4, guarantee: drawn.guarantee && idx === 4, theme: kind });
        });
        const best = drawn.cards.map((cn) => w.cards.find((x) => x.n === cn)!.rarity).reduce<Rarity>((m, r) => (['C', 'U', 'R', 'SR', 'UR', 'L'].indexOf(r) > ['C', 'U', 'R', 'SR', 'UR', 'L'].indexOf(m) ? r : m), 'C');
        bestRank = Math.max(bestRank, ['C', 'U', 'R', 'SR', 'UR', 'L'].indexOf(best));
        p.sinceGold = best === 'UR' || best === 'L' ? 0 : p.sinceGold + 1;
        p.opened = packNo;
        p.week.packs += 1; p.week.newc += nw;
        newCards += nw; if (drawn.golden) goldenPacks++; if (drawn.guarantee) guaranteePacks++;
        const grp = source === 'daily' ? dailyGroup(w, day) : source === 'focus' ? sectionsOf(w).find((s) => s.id === req.focus) ?? null : null;
        packs.push({ id: `mock-${seed}-${packNo}`, packNo, source, theme: kind, group: grp ? { id: grp.id, slug: grp.slug, name: grp.name, kind: grp.kind } : null, golden: drawn.golden, guarantee: drawn.guarantee, cards, newCount: nw, best: EDITIONS[best].edition });
        p.recent.unshift({ at: now(), best, source: source === 'shards' ? 'shards' : source === 'bonus' ? 'bonus' : 'stock', newCount: nw });
        p.recent = p.recent.slice(0, 10);
        p.last = { at: now(), packNo, cards: cards.map((x) => ({ n: x.n, isNew: x.isNew })) };
      }
      const after = levelOf(ownedNs().size);
      const finished = missionSets(w, p).filter((s) => s.done && !finishedBefore.has(s.id) && !s.claimed).map((s) => ({ id: s.id, name: s.name, packs: s.packs }));
      const best = packs.reduce((m, x) => (['std', 'stage', 'holo', 'era', 'gold', 'full'].indexOf(x.best) > ['std', 'stage', 'holo', 'era', 'gold', 'full'].indexOf(m) ? x.best : m), packs[0]!.best);
      const res = {
        packs, replayed: false,
        summary: { newCards, copies, copiesShards, best, goldenPacks, guaranteePacks, finished, levelUp: after > before ? { from: before, to: after, title: titleOf(after) } : null,
          headline: newCards > 0 ? `${newCards} new card${newCards > 1 ? 's' : ''} for your collection` : 'Only copies this time' },
        state: view(),
      };
      idem.set(req.key, { op: `open:${req.source}:${n}`, res });
      return res;
    },
    async collection(q) { sync(); return collectionState(w, p, q); },
    async almost(limit) { sync(); return almostState(w, p, limit); },
    async missions() { sync(); return missionsState(w, p, now()); },
    async claim(req: ClaimRequest) {
      const k = key(req.key, 'claim');
      if (k && 'error' in k) return k;
      if (k && 'hit' in k) return { ...(k.hit as object), replayed: true } as never;
      touch();
      let packs = 0, shards = 0;
      if (req.target === 'week') {
        const wk = weekMini(p, now());
        if (p.week.claimed) return err('already_claimed');
        if (!wk.done) return err('week_not_done');
        p.week.claimed = true; packs = 2; shards = 25;
      } else {
        const s = missionSets(w, p).find((x) => x.id === req.target);
        if (!s) return err('set_unknown');
        if (s.claimed) return err('already_claimed');
        if (!s.done) return err('set_not_done');
        p.claimedSets.add(s.id); packs = s.packs;
      }
      p.stock += packs; p.shards += shards;
      const res = { target: req.target, packs, shards, replayed: false, missions: missionsState(w, p, now()), state: view() };
      idem.set(req.key, { op: 'claim', res });
      return res;
    },
    async level() { sync(); const n = ownedNs().size; return { level: lobbyState({ w, p, now: now() }).level, pct: pctOf(n, total()), owned: n, total: total(), badges: badgesOf(w, ownedNs(), p.createdAt) }; },
    async ranking(scope = 'friends') {
      sync();
      const pool: PlayerSummary[] = [];
      const fake = (name: string, pct: number, friend: boolean): PlayerSummary => {
        const owned = Math.round((pct / 100) * total());
        const r = seededRng(slugify(name).length * 131 + name.charCodeAt(0));
        const top = [...w.cards].sort((a, b) => ['C', 'U', 'R', 'SR', 'UR', 'L'].indexOf(b.rarity) - ['C', 'U', 'R', 'SR', 'UR', 'L'].indexOf(a.rarity)).slice(0, 6);
        const show = [0, 1, 2].map(() => cardRef(top[r(top.length)]!));
        return { nickname: name, owned, showcase: show, badges: ['Founder'], friend, me: false };
      };
      for (const [n, pc] of scope === 'all' ? EVERYONE : FRIENDS) pool.push(fake(n, pc, p.friends.includes(n) || FRIENDS.some((f) => f[0] === n)));
      const meName = p.nickname ?? 'you';
      pool.push({ nickname: meName, owned: ownedNs().size, showcase: showcaseOf(w, p.owned), badges: badgesOf(w, ownedNs(), p.createdAt), friend: false, me: true });
      const rows = rankRows(pool, total());
      return { scope, rows, me: rows.find((r) => r.me) ?? null };
    },
    async player(nickname: string) {
      const rk = await impl.ranking('all');
      if (isApiError(rk)) return rk;
      const row = rk.rows.find((r) => r.nickname === nickname);
      if (!row) return err('player_unknown');
      const owned = Math.round((row.pct / 100) * total());
      const wish = row.me ? [...p.wishlist].map((n) => cardRef(w.cards.find((c) => c.n === n)!)) : [];
      return playerPage({ nickname, owned, showcase: row.showcase, badges: row.badges, friend: row.friend, me: row.me }, total(), wish);
    },
    async friends() {
      return { friends: FRIENDS.map(([n, pc]) => { const o = Math.round((pc / 100) * total()); return { nickname: n, level: levelOf(o), title: titleOf(levelOf(o)), pct: pctOf(o, total()), wishlist: [] }; }), code: p.code && p.code.expiresAt > now() ? { code: p.code.code, expiresAt: new Date(p.code.expiresAt).toISOString() } : null, max: KC.FRIENDS_MAX };
    },
    async friendCode() {
      touch();
      const A = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      let c = '';
      for (let i = 0; i < 8; i++) c += A[rng(A.length)];
      p.code = { code: `${c.slice(0, 4)}-${c.slice(4)}`, expiresAt: now() + KC.CODE_TTL_HOURS * 3600000 };
      return { code: p.code.code, expiresAt: new Date(p.code.expiresAt).toISOString() };
    },
    async friendRedeem(req: FriendRedeemRequest) {
      if (!/^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(req.code.toUpperCase())) return err('code_invalid');
      return err('code_invalid');
    },
    async friendRemove() { return impl.friends(); },
    async idol(slug: string) { sync(); return idolPage(w, p, slug) ?? err('idol_unknown'); },
    async card(n: number) {
      sync();
      const c = w.cards.find((x) => x.n === n);
      if (!c) return err('card');
      const o = p.owned.get(n);
      const h = Array.from(c.entity).reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, n);
      const m = MOMENTS[h % MOMENTS.length]!;
      const date = new Date(Date.UTC(2016 + (h >>> 4) % 9, (h >>> 8) % 12, 1 + (h >>> 12) % 27, 12)).toISOString().slice(0, 10);
      const e = w.entities.find((x) => x.id === c.entity);
      const slug = e ? quizSlug(e) : null;
      return {
        n, event: { name: `${m[0]}, ${m[1]}`, date, precision: 'day' as const },
        yours: o ? { firstAt: new Date(o.firstAt).toISOString(), packNo: o.how === 'craft' ? null : (o.packNo ?? null), how: o.how ?? 'pack', copies: o.copies } : null,
        quiz: momentQuiz(w, n, slug),
      };
    },
    async odds() { sync(); return oddsState(w, now(), dailyGroup(w, p.parisDay)); },
    async prefs(req) {
      touch();
      if (req.sound !== undefined) p.prefs.sound = !!req.sound;
      if (req.vibration !== undefined) p.prefs.vibration = !!req.vibration;
      if (req.theme !== undefined) { if (!THEME_IDS.includes(req.theme)) return err('pref'); p.prefs.theme = req.theme; }
      if (req.focus !== undefined) { if (req.focus !== null && !w.entities.some((e) => e.id === req.focus && e.kind === 'group')) return err('pref'); p.prefs.focus = req.focus; }
      return { prefs: { ...p.prefs } };
    },
    async lock(req) {
      touch();
      const o = p.owned.get(req.n);
      if (!o) return err('not_owned');
      o.locked = !!req.on;
      return { n: req.n, locked: o.locked, locks: [...p.owned.values()].filter((x) => x.locked).length };
    },
    async wish(req) {
      touch();
      if (!w.cards.some((c) => c.n === req.n)) return err('card');
      if (req.on) { if (p.owned.has(req.n)) return err('owned'); if (!p.wishlist.has(req.n) && p.wishlist.size >= KC.WISHLIST_MAX) return err('wish_limit'); p.wishlist.add(req.n); } else p.wishlist.delete(req.n);
      return { n: req.n, on: p.wishlist.has(req.n), count: p.wishlist.size };
    },
    async favorite(req) { touch(); const o = p.owned.get(req.n); if (!o) return err('not_owned'); o.fav = !!req.on; return { n: req.n, fav: o.fav }; },
    async seen(req) { for (const n of req.ns) { const o = p.owned.get(n); if (o) o.seen = true; } return { newCards: [...p.owned.values()].filter((o) => !o.seen).length }; },
    async recyclePreview() { sync(); return recyclePreview(w, p); },
    async recycle(req: RecycleRequest) {
      const k = key(req.key, 'recycle');
      if (k && 'error' in k) return k;
      if (k && 'hit' in k) return { ...(k.hit as object), replayed: true } as never;
      if (req.confirm !== true) return err('confirm_required');
      touch();
      const pre = recyclePreview(w, p);
      let recycled = 0, shards = 0;
      if (req.n !== undefined) {
        const c = w.cards.find((x) => x.n === req.n);
        const o = p.owned.get(req.n);
        if (!c || !o) return err('not_owned');
        if (o.locked) return err('locked');
        if (o.copies < 2) return err('last_copy');
        o.copies -= 1; recycled = 1; shards = SHARDS[c.rarity];
      } else {
        if (!pre.canRecycle) return err('nothing_to_recycle');
        for (const c of w.cards) {
          const o = p.owned.get(c.n);
          if (!o || o.copies < 2 || o.locked || c.rarity === 'UR' || c.rarity === 'L') continue;
          recycled += o.copies - 1; shards += (o.copies - 1) * SHARDS[c.rarity]; o.copies = 1;
        }
      }
      p.shards += shards;
      const res = { recycled, shards, skipped: pre.skipped, replayed: false, state: view() };
      idem.set(req.key, { op: 'recycle', res });
      return res;
    },
    async craft(req: CraftRequest) {
      const k = key(req.key, 'craft');
      if (k && 'error' in k) return k;
      if (k && 'hit' in k) return { ...(k.hit as object), replayed: true } as never;
      touch();
      const c = w.cards.find((x) => x.n === req.n);
      if (!c) return err('card');
      const cost = craftCost(c.rarity);
      if (cost === null) return err('no_craft');
      if (p.owned.has(c.n)) return err('owned');
      if (p.shards < cost) return err('shards');
      const done0 = new Set(missionSets(w, p).filter((s) => s.done).map((s) => s.id));
      p.shards -= cost;
      p.owned.set(c.n, { copies: 1, fav: false, locked: false, seen: false, firstAt: now(), lastAt: now(), packNo: p.opened, how: 'craft' });
      p.wishlist.delete(c.n); p.week.newc += 1;
      const finished = missionSets(w, p).filter((s) => s.done && !done0.has(s.id) && !s.claimed).map((s) => ({ id: s.id, name: s.name, packs: s.packs }));
      const res = { n: c.n, cost, finished, replayed: false, state: view() };
      idem.set(req.key, { op: 'craft', res });
      return res;
    },
    async adTicket() { touch(); return { ticket: `00000000-0000-4000-8000-${String(rng(1e9)).padStart(12, '0')}` }; },
    async adGrant(req) {
      const k = key(req.key, 'ad');
      if (k && 'error' in k) return k;
      if (k && 'hit' in k) return { ...(k.hit as object), replayed: true } as never;
      touch();
      if (p.adsToday >= KC.ADS_PER_DAY) return err('ad_limit');
      p.adsToday += 1; p.shards += KC.AD_SHARDS;
      const res = { gained: KC.AD_SHARDS, shards: p.shards, replayed: false, state: view() };
      idem.set(req.key, { op: 'ad', res });
      return res;
    },
    async demoDraw() {
      const all = indexPool(poolCards(w));
      const d = drawKcPack(all, all, rng, { pity: false, golden: false });
      return { token: `demo-${seed}`, cards: d.cards.map((n) => ({ n, isNew: true })) };
    },
    async demoClaim(req: DemoClaimRequest) {
      if (!req.token.startsWith('demo-')) return err('bad_request');
      return { added: [], state: view() };
    },
    async stillThere() { p.lastSeen = now(); sync(); p.anchor = now(); return { ok: true as const, state: view() }; },
    async help() { return helpData(); },
  };
  Object.assign(api, impl);
  void ERROR_STATUS;
  return api;
}

/** "R:n,C:c,U:c,SR:n,C:c" -> the pattern of forcePack (n a new card, c a copy); null when it is not five valid entries. For the dev fixture's `?kcpack=` query. */
export function parseForcePack(text: string | null | undefined): ForcedCard[] | null {
  if (!text) return null;
  const out: ForcedCard[] = [];
  for (const part of text.split(',')) {
    const m = /^(C|U|R|SR|UR|L):([nc])$/.exec(part.trim());
    if (!m) return null;
    out.push({ rarity: m[1] as Rarity, isNew: m[2] === 'n' });
  }
  return out.length === 5 ? out : null;
}

/** For the page of the dev fixture only: puts the prototype controls on `target.__kcMock` (the harness of agent D calls them) and reads `?kcpack=` once. */
export function installDevHooks(api: MockApi, target: Record<string, unknown>, search = ''): void {
  target.__kcMock = {
    forcePack: (c: ForcedCard[]) => api.forcePack(c), forceGolden: () => api.forceGolden(), forceGuarantee: () => api.forceGuarantee(), forceRarity: (r: 'UR' | 'L') => api.forceRarity(r),
    forceFullArt: () => api.forceFullArt(), useTimerUpTo: (n: number) => api.useTimerUpTo(n), addDleWin: () => api.addDleWin(), reset: (e: boolean) => api.reset(e),
  };
  const f = parseForcePack(new URLSearchParams(search).get('kcpack'));
  if (f) api.forcePack(f);
}
