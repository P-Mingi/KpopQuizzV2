// KpopCards, development fixture only (reached through a dynamic import behind a NODE_ENV production check in cards-provider.tsx): the example player of the
// v6 prototype (fresh(true) of docs/design/cards/kpopcards-prototype-v6.html), rebuilt on the same catalog shape, so a screen of the app and the same
// screen of the prototype hold the same cards. Same seeded generator (rng(23)), same goals by edition, all of aespa, three Holo or better cards starred,
// three Holo cards of TWICE wished, the last four cards new, 14 of 40 timer packs used, 17 packs without a Gold.
import type { PlayerData } from '@/lib/kpopcards/model';
import type { Rarity } from '@/lib/cards/types';
import type { UiCard } from '@/lib/cards/ui-types';

function rng(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const RI: Record<Rarity, number> = { C: 0, U: 1, R: 2, SR: 3, UR: 4, L: 5 };

/** Returns false (and changes nothing) when the catalog is not the prototype's shape. */
export function applyProtoExample(p: PlayerData, cards: UiCard[], now: number): boolean {
  if (!cards.some((c) => c.name === 'BTS')) return false;
  const sec = (c: UiCard): string => (c.kind === 'group' ? c.name : c.group ?? 'Soloists');
  p.owned.clear(); p.wishlist.clear();
  const r = rng(23);
  const t0 = now - 86400000;
  let i = 0;
  const order: number[] = [];
  const own = (c: UiCard): void => {
    const copies = 1 + (r() < 0.3 ? 1 : 0) + (r() < 0.08 ? 1 : 0);
    r(); // the prototype draws the pack number of the card here
    p.owned.set(c.n, { copies, fav: false, locked: false, seen: true, firstAt: t0 - i * 60000, lastAt: t0 - i * 60000 });
    order.push(c.n); i++;
  };
  const goal: [Rarity, number][] = [['C', 44], ['U', 16], ['R', 6], ['SR', 2], ['UR', 1]];
  for (const [rar, want] of goal) {
    const list = cards.filter((c) => c.rarity === rar && sec(c) !== 'aespa');
    let n = 0, g = 0;
    while (n < want && g < 900) { g++; const c = list[Math.floor(r() * list.length)]!; if (p.owned.has(c.n)) continue; own(c); n++; }
  }
  cards.filter((c) => sec(c) === 'aespa').forEach(own);
  order.filter((n) => RI[cards.find((c) => c.n === n)!.rarity] >= 2).slice(0, 3).forEach((n) => { p.owned.get(n)!.fav = true; });
  cards.filter((c) => c.name === 'TWICE' || c.group === 'TWICE').filter((c) => c.rarity === 'R' && !p.owned.has(c.n)).slice(0, 3).forEach((c) => p.wishlist.add(c.n));
  order.slice(-4).forEach((n) => { p.owned.get(n)!.seen = false; });
  p.shards = 34; p.stock = 7; p.anchor = now - 3 * 60000; p.timerToday = 14; p.opened = 48; p.sinceGold = 17;
  p.week = { ...p.week, packs: 12, dle: 1, newc: 7, claimed: false };
  p.last = null;
  const bests: Rarity[] = ['R', 'C', 'U', 'SR', 'U', 'R'];
  const nw = [2, 1, 3, 2, 0, 4];
  p.recent = bests.map((best, k) => ({ at: now - (k * 2 + 1) * 3600000 - k * 600000, best, source: k === 2 ? ('bonus' as const) : k === 4 ? ('shards' as const) : ('stock' as const), newCount: nw[k]! }));
  return true;
}
