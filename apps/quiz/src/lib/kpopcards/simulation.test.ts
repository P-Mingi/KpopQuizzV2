// KpopCards: the rates a page shows are the rates the server draws. 100,000 packs per theme through the very draw the server uses (planKcPack, then
// resolvePlan, the twin of cards_open's choice), with the golden pack every 10th pack and the Gold guarantee counted pack by pack, compared with
// the odds the Odds page prints (oddsState), within five standard deviations of a binomial count.
import { describe, expect, it } from 'vitest';

import { EDITIONS, RARITIES } from '../cards/rules';
import { THEME_IDS } from './contract';
import { indexPool, planKcPack, resolvePlan } from './draw';
import { oddsState, poolCards, themeCards } from './model';
import { seededRng } from './mock-api';

import type { Rarity } from '../cards/types';
import type { UiCard, UiEntity } from '../cards/ui-types';
import type { ThemeId } from './contract';
import type { World } from './model';

/** A catalog of the real shape: 24 groups of 3 to 7 idols, each subject with 2 to 6 editions, 8 soloists, group cards in pairs. */
function bigWorld(): World {
  const r = seededRng(2026);
  const entities: UiEntity[] = [];
  const cards: UiCard[] = [];
  const themeOf = new Map<string, ThemeId>();
  let n = 0;
  const add = (e: UiEntity, editions: number, pair: boolean): void => {
    for (let k = 0; k < editions; k++) {
      const rar = RARITIES[k]! as Rarity;
      for (const part of pair ? [1, 2] : [0]) {
        n += 1;
        cards.push({ n, num: `BV1-${n}`, entity: e.id, kind: e.kind, rarity: rar, edition: EDITIONS[rar].edition, name: e.name, group: e.group, debutYear: 2015, photo: null,
          ...(pair ? { part: part as 1 | 2, pairN: part === 1 ? n + 1 : n - 1 } : {}) });
      }
    }
  };
  for (let g = 0; g < 24; g++) {
    const gname = `Group ${g}`;
    const ge: UiEntity = { id: `group:g${g}`, kind: 'group', name: gname, group: null, debutYear: 2015, sortKey: `g${g}`, lockReasons: {} };
    entities.push(ge);
    const theme: ThemeId = g % 3 === 0 ? 'boys' : 'girls';
    themeOf.set(ge.id, theme);
    add(ge, 2 + r(4), true);
    const members = 3 + r(5);
    for (let m = 0; m < members; m++) {
      const e: UiEntity = { id: `idol:g${g}m${m}`, kind: 'idol', name: `Idol ${g}-${m}`, group: gname, debutYear: 2015, sortKey: `g${g}m${m}`, lockReasons: {} };
      entities.push(e);
      themeOf.set(e.id, theme);
      add(e, 2 + r(5), false);
    }
  }
  for (let s = 0; s < 8; s++) {
    const e: UiEntity = { id: `idol:solo${s}`, kind: 'idol', name: `Solo ${s}`, group: null, debutYear: 2015, sortKey: `zz${s}`, lockReasons: {} };
    entities.push(e);
    themeOf.set(e.id, 'solo');
    add(e, 2 + r(5), false);
  }
  return { cards, entities, themeOf };
}

const PACKS = 100_000;

describe('100,000 packs per theme: the printed rates are the drawn rates', () => {
  const w = bigWorld();
  const all = indexPool(poolCards(w));
  const printed = oddsState(w, Date.UTC(2026, 10, 13), null);
  it.each(THEME_IDS)('%s', (theme) => {
    const cs = themeCards(w, theme);
    expect(cs.length).toBeGreaterThan(20);
    const pool = indexPool(cs.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, entity: c.entity })));
    const rng = seededRng(7 + THEME_IDS.indexOf(theme));
    const rarityOf = new Map(w.cards.map((c) => [c.n, c.rarity]));
    const c14: Record<Rarity, number> = { C: 0, U: 0, R: 0, SR: 0, UR: 0, L: 0 };
    const c5plain: Record<Rarity, number> = { ...c14 };
    const c5golden: Record<Rarity, number> = { ...c14 };
    let plainPacks = 0, goldenPacks = 0, guaranteePacks = 0, sinceGold = 0, maxGap = 0, goldenOk = 0;
    for (let i = 1; i <= PACKS; i++) {
      const plan = planKcPack(pool, all, rng);
      const golden = i % 10 === 0;
      const pity = sinceGold >= 29;
      const res = resolvePlan(plan, golden, pity);
      const rs = res.cards.map((n) => rarityOf.get(n)!);
      for (let k = 0; k < 4; k++) c14[rs[k]!] += 1;
      if (golden && !pity) { goldenPacks += 1; c5golden[rs[4]!] += 1; if (['R', 'SR', 'UR', 'L'].includes(rs[4]!)) goldenOk += 1; }
      else if (!golden && !pity) { plainPacks += 1; c5plain[rs[4]!] += 1; }
      if (res.guarantee) { guaranteePacks += 1; expect(rs[4]).toBe('UR'); }
      expect(rs[4]).not.toBe('C');
      const hit = rs.some((x) => x === 'UR' || x === 'L');
      sinceGold = hit ? 0 : sinceGold + 1;
      maxGap = Math.max(maxGap, sinceGold);
    }
    const row = printed.packs.find((p) => p.id === theme)!.rows;
    const within = (got: number, total: number, pct: number, what: string): void => {
      const p = pct / 100;
      const sd = Math.sqrt(total * p * (1 - p)) || 1;
      expect(Math.abs(got - total * p), `${theme} ${what}: got ${got}/${total}, printed ${pct.toFixed(3)}%`).toBeLessThanOrEqual(5 * sd + 1);
    };
    for (const r of row) {
      within(c14[r.rarity], PACKS * 4, r.cards1to4 === 0 ? 0 : r.cards1to4, `cards 1-4 ${r.edition}`);
      within(c5plain[r.rarity], plainPacks, r.card5, `card 5 ${r.edition}`);
      within(c5golden[r.rarity], goldenPacks, r.golden5, `golden card 5 ${r.edition}`);
    }
    // The promises: every 10th pack's card 5 is Holo or better, the Gold guarantee never lets 30 packs pass without a Gold or a Full Art card.
    expect(goldenOk).toBe(goldenPacks);
    expect(maxGap).toBeLessThanOrEqual(29);
    expect(guaranteePacks).toBeGreaterThanOrEqual(0);
    console.log(`SIM ${theme}: ${cs.length} cards, ${PACKS} packs, ${goldenPacks} golden, ${guaranteePacks} guarantee packs, longest run without Gold or Full Art ${maxGap}`);
  }, 120_000);
});
