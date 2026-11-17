// Bunnyverse Cards lot 7: cards_open and cards_craft of 118 on PGlite (state of production, 118 applied, the catalog rebuilt with group:zz whose
// photos are in 2 and 3 parts). The missing part rule, completesPair on the last part only, the panorama given once (same pack, later pack,
// replay of the key), craft grants it, recycle of a part leaves it, a pair (2 parts) works as before.
import { describe, expect, it, vi } from 'vitest';

import { PLAIN, key, newUser, openSql, own, setWallet, tryOpen, T0 } from '../kpopcards/sql-fixture';

import { ZZ, addGroup, build, prodDb, run } from './parts-fixture';
import { one, rows } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

type Card = { n: number; isNew: boolean; completesPair: boolean; pano?: number };
type Res = { replayed: boolean; packs: Array<{ id: string; cards: Card[]; panoramas: number[]; new_count: number }> };

async function world(): Promise<{ db: PGlite; set3: number[]; set3b: number[]; set2: number[]; fifth: number }> {
  const db = await prodDb();
  await run(db, build([]).sql);
  await addGroup(db, 'group:zz', ZZ, 'zz');
  for (const [i, p] of ZZ.entries()) await db.query('update cards_photos set parts = $1 where entity_id = $2 and slot = $3', [p.parts, 'group:zz', i + 1]);
  await db.exec('select public.cards_build_catalog()');
  const cs = await rows<{ card_no: number; rarity: string; part: number; entity_id: string }>(db, `select card_no, rarity, part, entity_id from cards_catalog where entity_id = 'group:zz' order by card_no`);
  const sets = new Map<string, number[]>();
  for (const c of cs) sets.set(c.rarity, [...(sets.get(c.rarity) ?? []), c.card_no]);
  const all = [...sets.entries()].filter(([r]) => r !== 'L' && r !== 'C');
  const three = all.filter(([, v]) => v.length === 3).map(([, v]) => v);
  const two = all.filter(([, v]) => v.length === 2).map(([, v]) => v);
  expect(three.length).toBeGreaterThanOrEqual(2);
  expect(two.length).toBeGreaterThanOrEqual(1);
  return { db, set3: three[0]!, set3b: three[1]!, set2: two[0]!, fifth: three[1]![0]! };
}
const panos = (db: PGlite, u: string) => rows<{ pano_no: number; source: string; pack_id: string | null }>(db, 'select pano_no, source, pack_id from cards_panoramas_owned where user_id = $1 order by pano_no', [u]);
const panoOf = (db: PGlite, first: number) => one<number>(db, 'select pano_no from cards_panoramas where first_card = $1', [first]);

describe('cards_open of 118', () => {
  it('swaps a part the player owns for the lowest missing part, completes the set on the last part only, gives the panorama once, and replays the same answer', async () => {
    const { db, set3, set3b } = await world();
    const [a, b, c] = set3 as [number, number, number];
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10 });
    const k = key();
    const r = await openSql(db, u, { key: k, draws: [{ c: [a, a, b, c, set3b[0]!] }] });
    const cards = r.packs[0]!.cards as unknown as Card[];
    // a new; a again becomes b (lowest missing); b again becomes c (the only missing); c drawn again is a duplicate; the fifth card is another set
    expect(cards.map((x) => x.n)).toEqual([a, b, c, c, set3b[0]]);
    expect(cards.map((x) => x.isNew)).toEqual([true, true, true, false, true]);
    expect(cards.map((x) => x.completesPair)).toEqual([false, false, true, false, false]);
    const pano = await panoOf(db, a);
    expect(cards.map((x) => x.pano)).toEqual([undefined, undefined, pano, undefined, undefined]);
    expect((r.packs[0] as unknown as { panoramas: number[] }).panoramas).toEqual([pano]);
    const held = await panos(db, u);
    expect(held).toEqual([{ pano_no: pano, source: 'pack', pack_id: r.packs[0]!.id }]);
    // the replay of the same key answers the same, and grants nothing more
    const again = (await openSql(db, u, { key: k, draws: [{ c: [a, a, b, c, set3b[0]!] }] })) as unknown as Res;
    expect(again.replayed).toBe(true);
    expect(again.packs).toEqual(r.packs);
    expect(await panos(db, u)).toEqual(held);
    // a later pack with the same parts: duplicates, no panorama, an empty array
    const r2 = (await openSql(db, u, { draws: [{ c: [a, b, c, a, set3b[1]!] }] })) as unknown as Res;
    expect(r2.packs[0]!.cards.map((x) => x.isNew)).toEqual([false, false, false, false, true]);
    expect(r2.packs[0]!.cards.some((x) => x.pano !== undefined || x.completesPair)).toBe(false);
    expect(r2.packs[0]!.panoramas).toEqual([]);
    expect(await panos(db, u)).toEqual(held);
    // the other set completes in a later pack: its own panorama, once
    const r3 = (await openSql(db, u, { draws: [{ c: [set3b[2]!, set3b[2]!, set3b[2]!, set3b[2]!, set3b[2]!] }] })) as unknown as Res;
    expect(r3.packs[0]!.cards.map((x) => x.n)).toEqual([set3b[2], set3b[2], set3b[2], set3b[2], set3b[2]]);
    expect(await panos(db, u)).toHaveLength(held.length + (r3.packs[0]!.panoramas.length));
    // recycling a part afterwards leaves the panorama; the last copy of a part is never recycled
    await db.query('update cards_owned set copies = 3 where user_id = $1 and card_no = $2', [u, a]);
    await one(db, `select public.cards_recycle($1::uuid, $2, $3::int, $4::timestamptz)`, [u, key(), a, T0]);
    expect(await one(db, 'select copies from cards_owned where user_id = $1 and card_no = $2', [u, a])).toBe(2);
    expect(await panos(db, u)).toHaveLength(r3.packs[0]!.panoramas.length + 1);
    expect(await one(db, 'select count(*) from cards_owned where user_id = $1 and card_no = $2', [u, c])).toBe(1);
  });

  it('completesPair is only the last part; a second player gets their own panorama; two sets completed in one Open 5 give two', async () => {
    const { db, set3, set3b } = await world();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10 });
    // the player holds parts 1 and 3 of the set: a pack of part 1 swaps it for part 2, which completes
    await own(db, u, [set3[0]!, set3[2]!]);
    const r = (await openSql(db, u, { draws: [{ c: [set3[0]!, set3[0]!, set3[0]!, set3[0]!, set3[0]!] }] })) as unknown as Res;
    expect(r.packs[0]!.cards.map((x) => x.n)).toEqual([set3[1], set3[0], set3[0], set3[0], set3[0]]);
    expect(r.packs[0]!.cards.map((x) => x.isNew)).toEqual([true, false, false, false, false]);
    expect(r.packs[0]!.cards.map((x) => x.completesPair)).toEqual([true, false, false, false, false]);
    expect(r.packs[0]!.panoramas).toEqual([await panoOf(db, set3[0]!)]);
    // Open 5 on another player: two sets completed, one in pack 2 and one in pack 4: two panoramas, each once, in the order of the cards
    const v = await newUser(db);
    await setWallet(db, v, { stock: 10 });
    await own(db, v, [set3[0]!, set3[1]!, set3b[0]!, set3b[1]!]);
    const draws = [{ c: [set3[2]!, 1, 1, 1, 1] }, { c: [1, 1, 1, 1, 1] }, { c: [set3b[2]!, 1, 1, 1, 1] }, { c: [1, 1, 1, 1, 1] }, { c: [1, 1, 1, 1, 1] }];
    const five = (await openSql(db, v, { draws: draws.map((d) => ({ c: d.c.map((n) => (n === 1 ? set3[2]! : n)) })) })) as unknown as Res;
    expect(five.packs.map((p) => p.panoramas.length)).toEqual([1, 0, 1, 0, 0]);
    expect((await panos(db, v)).map((x) => x.pack_id).sort()).toEqual([five.packs[0]!.id, five.packs[2]!.id].sort());
  });

  it('a pair (2 parts) works as before: the swap, completesPair on the second part, the panorama on 2/2', async () => {
    const { db, set2, fifth } = await world();
    const [a, b] = set2 as [number, number];
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10 });
    const r = (await openSql(db, u, { draws: [{ c: [a, a, a, a, fifth] }] })) as unknown as Res;
    expect(r.packs[0]!.cards.map((x) => x.n)).toEqual([a, b, a, a, fifth]);
    expect(r.packs[0]!.cards.map((x) => x.completesPair)).toEqual([false, true, false, false, false]);
    expect(r.packs[0]!.panoramas).toEqual([await panoOf(db, a)]);
    expect(await one(db, 'select parts from cards_panoramas where first_card = $1', [a])).toBe(2);
  });

  it('refuses a draw outside the catalog as before, and a null key', async () => {
    const { db } = await world();
    const u = await newUser(db);
    expect(await tryOpen(db, u, { draws: [{ c: [1, 2, 3, 4, 999999] }] })).toMatch(/cards: pack/);
    expect(await tryOpen(db, u, { key: 'x', draws: [PLAIN] })).toMatch(/cards: key/);
  });
});

describe('cards_craft of 118', () => {
  it('crafting the last missing part gives the panorama (source craft, no pack), once; a first part gives none; the answer has pano', async () => {
    const { db, set3 } = await world();
    const u = await newUser(db);
    await setWallet(db, u, { stock: 10, shards: 1000 });
    const rarity = await one<string>(db, 'select rarity from cards_catalog where card_no = $1', [set3[0]!]);
    expect(rarity).not.toBe('L');
    const first = await one<{ pano: number | null; cost: number }>(db, 'select public.cards_craft($1::uuid, $2, $3::int, $4::timestamptz)', [u, key(), set3[0]!, T0]);
    expect(first.pano).toBeNull();
    await own(db, u, [set3[1]!]);
    const k = key();
    const last = await one<{ pano: number | null }>(db, 'select public.cards_craft($1::uuid, $2, $3::int, $4::timestamptz)', [u, k, set3[2]!, T0]);
    const pano = await panoOf(db, set3[0]!);
    expect(last.pano).toBe(pano);
    expect(await panos(db, u)).toEqual([{ pano_no: pano, source: 'craft', pack_id: null }]);
    // the replay of the key answers the same, nothing more is granted
    const again = await one<{ pano: number | null; replayed: boolean }>(db, 'select public.cards_craft($1::uuid, $2, $3::int, $4::timestamptz)', [u, k, set3[2]!, T0]);
    expect(again).toMatchObject({ pano, replayed: true });
    expect(await panos(db, u)).toHaveLength(1);
  });
});
