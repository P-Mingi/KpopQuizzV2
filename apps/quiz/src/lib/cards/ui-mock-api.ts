// Bunnyverse Cards, lane U: A TEST STAND-IN for /api/cards/* in the browser, with the fixture catalog. Loaded only by the pages when the
// server says the fixture is on (a development server with CARDS_UI_FIXTURE=1). It keeps one player in localStorage, applies the wallet
// rules of rules.ts and draws with Math.random: good enough to see the pages, never a source of truth.
// URL switches (read once at load): ?guest=1 answers as a signed-out visitor, ?empty=1 starts with an empty binder.
import { CAP, SHARD_PACK_COST, SHARDS, drawPack, indexPool, walletAt } from './rules';
import { fixtureCatalog } from './ui-fixture';

import { WEEK_GOALS, dueSets, goalSets } from './goals';

import type { FinishedSet, GoalsState } from './goals';
import type { CardsApi, RecycleResult, WeekClaim } from './ui-api';
import type { AdResult, OwnedEntry, OpenResult, PackSource, WalletState } from './types';

interface Saved {
  v: 1; stock: number; anchor: number; parisDay: string; adsToday: number; bonusToday: number; shards: number;
  owned: Record<number, { copies: number; fav: boolean; at: string }>;
  /** Lane GOALS: the sets claimed, the reward packs waiting and the week counters (all optional: a saved player from before has none). */
  claimed?: string[]; reward?: number; week?: { start: string; packs: number; fresh: number; claimed: boolean };
}
const KEY = 'bvc-ui-fixture-v1';
const ADS_PER_DAY = 10;

function fresh(example: boolean): Saved {
  const now = Date.now();
  const s: Saved = { v: 1, stock: 3, anchor: now - 3 * 60000, parisDay: walletAt({ stock: 3, anchor: now, parisDay: '', adsToday: 0, bonusToday: 0 }, now).parisDay, adsToday: 0, bonusToday: 0, shards: example ? 34 : 0, owned: {} };
  if (example) {
    const cards = fixtureCatalog().cards;
    let seed = 23;
    const rnd = (): number => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
    const want: Record<string, number> = { C: 14, U: 8, R: 4, UR: 1 };
    let i = 0;
    for (const [rar, count] of Object.entries(want)) {
      const list = cards.filter((c) => c.rarity === rar);
      if (list.length === 0) continue;
      let got = 0;
      let guard = 0;
      while (got < count && guard++ < 900) {
        const c = list[Math.floor(rnd() * list.length)]!;
        if (s.owned[c.n]) continue;
        s.owned[c.n] = { copies: 1 + (rnd() < 0.3 ? 1 : 0) + (rnd() < 0.08 ? 1 : 0), fav: false, at: new Date(now - 86400000 - i++ * 60000).toISOString() };
        got++;
      }
    }
  }
  return s;
}

function load(): Saved {
  const q = new URLSearchParams(location.search);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw && !q.has('empty')) { const s = JSON.parse(raw) as Saved; if (s.v === 1) return s; }
  } catch { /* private window: start fresh */ }
  return fresh(!q.has('empty'));
}
function save(s: Saved): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

/** The Paris Monday (ISO date) of a time and the time the week ends (the next Monday 00:00, Paris), found by minutes: a stand-in, never a source of truth. */
function parisWeek(t: number): { start: string; endsAt: number } {
  const day = (x: number): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(x));
  const d = day(t);
  const [y, m, dd] = d.split('-').map(Number) as [number, number, number];
  const dow = (new Date(Date.UTC(y, m - 1, dd)).getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(y, m - 1, dd - dow)).toISOString().slice(0, 10);
  const next = new Date(Date.UTC(y, m - 1, dd - dow + 7)).toISOString().slice(0, 10);
  let e = Date.UTC(y, m - 1, dd - dow + 7) - 3 * 3600000;
  while (day(e) !== next) e += 60000;
  return { start, endsAt: e };
}
const fixtureWins = (): number => Math.max(0, Math.min(99, Number(new URLSearchParams(location.search).get('wins') ?? 0) || 0));

function weekOf(s: Saved): NonNullable<Saved['week']> {
  const w = parisWeek(Date.now());
  if (!s.week || s.week.start !== w.start) s.week = { start: w.start, packs: 0, fresh: 0, claimed: false };
  return s.week;
}
function setsOf(s: Saved): ReturnType<typeof goalSets> {
  const cat = fixtureCatalog();
  return goalSets(cat.cards, cat.entities, new Set(Object.keys(s.owned).map(Number)), new Set(s.claimed ?? []));
}
/** Pays the sets that are complete and not claimed (a pack, a craft or opening Goals does it on the server). */
function settle(s: Saved): FinishedSet[] {
  const due = dueSets(setsOf(s));
  if (due.length === 0) return [];
  s.claimed = [...(s.claimed ?? []), ...due.map((d) => d.id)];
  s.reward = (s.reward ?? 0) + due.reduce((a, d) => a + d.packs, 0);
  return due.map((d) => ({ id: d.id, kind: d.kind, name: d.name, packs: d.packs }));
}
function goalsOf(s: Saved, finished: FinishedSet[] = []): GoalsState {
  const w = weekOf(s);
  const wins = fixtureWins();
  return {
    rewardPacks: s.reward ?? 0,
    week: {
      weekStart: w.start, endsAt: new Date(parisWeek(Date.now()).endsAt).toISOString(), packsOpened: w.packs, kpopdleWins: wins, newCards: w.fresh,
      goalPacks: WEEK_GOALS.packs, goalWins: WEEK_GOALS.wins, goalCards: WEEK_GOALS.cards, rewardPacks: WEEK_GOALS.rewardPacks, rewardShards: WEEK_GOALS.rewardShards,
      done: w.packs >= WEEK_GOALS.packs && wins >= WEEK_GOALS.wins && w.fresh >= WEEK_GOALS.cards, claimed: w.claimed,
    },
    sets: setsOf(s),
    finished,
  };
}

function sync(s: Saved): Saved {
  const w = walletAt(s, Date.now());
  s.stock = w.stock; s.anchor = w.anchor; s.parisDay = w.parisDay; s.adsToday = w.adsToday; s.bonusToday = w.bonusToday;
  return s;
}
function view(s: Saved): WalletState {
  const w = walletAt(s, Date.now());
  const owned: OwnedEntry[] = Object.entries(s.owned).map(([n, o]) => ({ n: +n, copies: o.copies, fav: o.fav, at: o.at }));
  return {
    stock: w.stock, cap: CAP, nextAt: w.nextAt === null ? null : new Date(w.nextAt).toISOString(), midnightAt: new Date(w.midnightAt).toISOString(),
    adsLeft: Math.max(0, ADS_PER_DAY - w.adsToday), adsEnabled: true, shards: s.shards, bonusLeft: 0, owned,
    ...((s.reward ?? 0) > 0 ? { rewardPacks: s.reward } : {}),
  };
}
function pack(s: Saved, source: PackSource): OpenResult {
  const pool = indexPool(fixtureCatalog().cards);
  // ?lucky=1 (fixture only): the pack holds the cards the player misses, lowest number first, so a screen can show a finished set.
  const lucky = new URLSearchParams(location.search).has('lucky');
  const missing = fixtureCatalog().cards.filter((c) => !s.owned[c.n]).map((c) => c.n);
  const ns = lucky && missing.length >= 5 ? missing.slice(0, 5) : drawPack(pool, (m) => Math.floor(Math.random() * m));
  const now = Date.now();
  const seen = new Set<number>();
  const wk = weekOf(s);
  wk.packs += 1;
  const cards = ns.map((n, i) => {
    const o = s.owned[n];
    const isNew = !o && !seen.has(n);
    seen.add(n);
    if (isNew) wk.fresh += 1;
    s.owned[n] = { copies: (o?.copies ?? 0) + 1, fav: o?.fav ?? false, at: new Date(now + i).toISOString() };
    return { n, isNew };
  });
  const finished = settle(s);
  save(s);
  return { pack: { id: `fx-${now}-${source}`, cards, ...(finished.length > 0 ? { finished } : {}) }, state: view(s) };
}

export function createMockApi(): CardsApi {
  const guest = new URLSearchParams(location.search).has('guest');
  const s = load();
  sync(s);
  let ticket: string | null = null;
  return {
    async state() { if (guest) return null; sync(s); save(s); return view(s); },
    async open(source) {
      if (guest) return { error: 'signin' };
      sync(s);
      if (source === 'stock') {
        if (s.stock < 1) return { error: 'empty' };
        const wasFull = s.stock >= CAP;
        s.stock -= 1;
        if (wasFull) s.anchor = Date.now();
      } else if (source === 'shards') {
        if (s.shards < SHARD_PACK_COST) return { error: 'shards' };
        s.shards -= SHARD_PACK_COST;
      } else if (source === 'reward') {
        if ((s.reward ?? 0) < 1) return { error: 'reward' };
        s.reward = (s.reward ?? 0) - 1;
      } else return { error: 'bonus' };
      return pack(s, source);
    },
    async adTicket() { sync(s); if (s.adsToday >= ADS_PER_DAY) return { error: 'limit' }; ticket = `t${Date.now()}`; return { ticket }; },
    async adGrant(t): Promise<AdResult | { error: string }> { if (!ticket || t !== ticket) return { error: 'conflict' }; ticket = null; sync(s); s.adsToday += 1; s.shards += 25; save(s); return { gained: 25, shards: s.shards, state: view(s) }; },
    async recycle(): Promise<RecycleResult | { error: string }> {
      const cards = fixtureCatalog().cards;
      let recycled = 0; let shards = 0;
      for (const c of cards) { const o = s.owned[c.n]; if (o && o.copies > 1) { recycled += o.copies - 1; shards += (o.copies - 1) * SHARDS[c.rarity]; o.copies = 1; } }
      s.shards += shards; save(s);
      return { recycled, shards, state: view(s) };
    },
    async goals(): Promise<GoalsState | { error: string }> {
      if (guest) return { error: 'signin' };
      sync(s);
      const f = settle(s);
      save(s);
      return goalsOf(s, f);
    },
    async claimWeek(): Promise<WeekClaim | { error: string }> {
      sync(s);
      const g = goalsOf(s);
      if (g.week.claimed) return { error: 'claimed' };
      if (!g.week.done) return { error: 'goal' };
      weekOf(s).claimed = true;
      s.reward = (s.reward ?? 0) + WEEK_GOALS.rewardPacks;
      s.shards += WEEK_GOALS.rewardShards;
      save(s);
      return { packs: WEEK_GOALS.rewardPacks, shards: WEEK_GOALS.rewardShards, goals: goalsOf(s) };
    },
    async favorite(n, on) { const o = s.owned[n]; if (!o) return false; o.fav = on; save(s); return true; },
    // Point A18 (test stand-in): the demo pack is drawn here and its token is 'fixture-demo:<five numbers>'; the claim adds the cards.
    async demoDraw() {
      if (!guest) return { error: 'signed_in' };
      const ns = drawPack(indexPool(fixtureCatalog().cards), (m) => Math.floor(Math.random() * m));
      return { token: `fixture-demo:${ns.join(',')}`, cards: ns.map((n) => ({ n, isNew: false })) };
    },
    async demoClaim(token) {
      if (guest) return { error: 'signin' };
      const ns = token.startsWith('fixture-demo:') ? token.slice(13).split(',').map(Number).filter((n) => Number.isInteger(n)) : [];
      if (ns.length !== 5) return { error: 'token' };
      const now = Date.now();
      const added = ns.map((n, i) => {
        const o = s.owned[n];
        s.owned[n] = { copies: (o?.copies ?? 0) + 1, fav: o?.fav ?? false, at: new Date(now + i).toISOString() };
        return { n, isNew: !o };
      });
      save(s);
      return { added, state: view(s) };
    },
  };
}
