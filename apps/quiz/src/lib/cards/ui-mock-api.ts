// Bunnyverse Cards, lane U: A TEST STAND-IN for /api/cards/* in the browser, with the fixture catalog. Loaded only by the pages when the
// server says the fixture is on (a development server with CARDS_UI_FIXTURE=1). It keeps one player in localStorage, applies the wallet
// rules of rules.ts and draws with Math.random: good enough to see the pages, never a source of truth.
// URL switches (read once at load): ?guest=1 answers as a signed-out visitor, ?empty=1 starts with an empty binder.
import { CAP, SHARD_PACK_COST, SHARDS, drawPack, indexPool, walletAt } from './rules';
import { fixtureCatalog } from './ui-fixture';

import type { CardsApi, RecycleResult } from './ui-api';
import type { OwnedEntry, OpenResult, PackSource, WalletState } from './types';

interface Saved {
  v: 1; stock: number; anchor: number; parisDay: string; adsToday: number; bonusToday: number; shards: number;
  owned: Record<number, { copies: number; fav: boolean; at: string }>;
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
  };
}
function pack(s: Saved, source: PackSource): OpenResult {
  const pool = indexPool(fixtureCatalog().cards);
  const ns = drawPack(pool, (m) => Math.floor(Math.random() * m));
  const now = Date.now();
  const seen = new Set<number>();
  const cards = ns.map((n, i) => {
    const o = s.owned[n];
    const isNew = !o && !seen.has(n);
    seen.add(n);
    s.owned[n] = { copies: (o?.copies ?? 0) + 1, fav: o?.fav ?? false, at: new Date(now + i).toISOString() };
    return { n, isNew };
  });
  save(s);
  return { pack: { id: `fx-${now}-${source}`, cards }, state: view(s) };
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
      } else return { error: 'bonus' };
      return pack(s, source);
    },
    async adTicket() { sync(s); if (s.adsToday >= ADS_PER_DAY) return { error: 'limit' }; ticket = `t${Date.now()}`; return { ticket }; },
    async adGrant(t) { if (!ticket || t !== ticket) return { error: 'conflict' }; ticket = null; sync(s); s.adsToday += 1; return pack(s, 'ad'); },
    async recycle(): Promise<RecycleResult | { error: string }> {
      const cards = fixtureCatalog().cards;
      let recycled = 0; let shards = 0;
      for (const c of cards) { const o = s.owned[c.n]; if (o && o.copies > 1) { recycled += o.copies - 1; shards += (o.copies - 1) * SHARDS[c.rarity]; o.copies = 1; } }
      s.shards += shards; save(s);
      return { recycled, shards, state: view(s) };
    },
    async favorite(n, on) { const o = s.owned[n]; if (!o) return false; o.fav = on; save(s); return true; },
  };
}
