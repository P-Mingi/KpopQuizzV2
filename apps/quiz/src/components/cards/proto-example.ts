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
    const packNo = 1 + Math.floor(r() * 47); // the prototype's pk: the pack the card came from ("Pulled on ..., pack N" in the card view)
    p.owned.set(c.n, { copies, fav: false, locked: false, seen: true, firstAt: t0 - i * 60000, lastAt: t0 - i * 60000, packNo, how: 'pack' });
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
  p.recent = bests.map((best, k) => ({ at: now - (k * 2 + 1) * 3600000 - k * 600000, best, source: k === 2 ? ('focus' as unknown as 'bonus') : k === 4 ? ('shards' as const) : ('stock' as const), newCount: nw[k]! }));
  return true;
}

/**
 * Lot 7, development fixture only (dead code in production, like the rest of this file): query controls of the dev server so the panorama screens can be
 * reached without luck. `kcset=NAME:RARITY:HAVE` gives the player the first HAVE parts (or `all`) of the group photo of NAME at that edition and takes the other parts away; `kcrar=RARITY:NAME/PART`
 * gives every card of that edition except that part, which it takes away (so a forced new card of the edition is exactly it); `kcpano=NAME:RARITY` gives the panorama; `kcshards=N`.
 * Entries are separated by commas.
 */
export function applyDevOwn(p: PlayerData, cards: UiCard[], search: string, now: number): void {
  const q = new URLSearchParams(search);
  const give = (c: UiCard): void => { if (!p.owned.has(c.n)) p.owned.set(c.n, { copies: 1, fav: false, locked: false, seen: true, firstAt: now - 86400000, lastAt: now - 86400000, packNo: 1, how: 'pack' }); };
  const parts = (name: string, r: string): UiCard[] => cards.filter((c) => c.kind === 'group' && c.name === name && c.rarity === r && c.part).sort((a, b) => (a.part ?? 0) - (b.part ?? 0));
  for (const e of (q.get('kcset') ?? '').split(',').filter(Boolean)) {
    const [name, r, have] = e.split(':');
    const list = parts(name ?? '', r ?? '');
    const k = have === 'all' ? list.length : Number(have);
    list.slice(0, k).forEach(give);
    list.slice(k).forEach((c) => { p.owned.delete(c.n); });
  }
  for (const e of (q.get('kcrar') ?? '').split(',').filter(Boolean)) {
    const [r, skip] = e.split(':');
    const [sn, sp] = (skip ?? '').split('/');
    for (const c of cards) { if (c.rarity !== r) continue; if (c.name === sn && c.part === Number(sp)) p.owned.delete(c.n); else give(c); }
  }
  for (const e of (q.get('kcpano') ?? '').split(',').filter(Boolean)) {
    const [name, r] = e.split(':');
    const pn = parts(name ?? '', r ?? '')[0]?.pano;
    if (pn !== undefined) (p.panos ??= new Map()).set(pn, { at: now - 3600000, source: 'pack', seen: true });
  }
  const sh = Number(q.get('kcshards'));
  if (Number.isFinite(sh) && sh > 0) p.shards = sh;
}
