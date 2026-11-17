// Bunnyverse Cards lot 7: the owner's script (owner-cards.mjs) refuses to publish unless ALL-verify.sql answers TOUT_OK. The expected values of
// 102, 103 and 114 know the lot 7 rule (a group photo gives coalesce(parts, 2) cards, Full Art needs every part at 640 px). On the state the
// integrator read in production (bundle-fixture.ts): TOUT_OK after the bundle, after 116 and the rebuild, after 117, after the REAL 118 (the
// committed file) and the rebuild, after approving the pending photos and a rebuild; and on a database without 118 it is still TOUT_OK.
import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

import { OUTPUTS, readCards } from '../../../scripts/cards/bundle-sql.mjs';

import { prodStateSql } from './bundle-fixture';
import { at } from './harvest-fixture';
import { rd } from './parts-fixture';

vi.setConfig({ testTimeout: 600_000, hookTimeout: 600_000 });

type Row = { fichier: string; controle: string; attendu: string | null; obtenu: string | null; ok: boolean };
const notOk = async (db: PGlite): Promise<string[]> =>
  (await db.query<Row>(readCards(OUTPUTS.verify))).rows.filter((r) => !r.ok).map((r) => `${r.fichier} ${r.controle}: ${r.attendu} / ${r.obtenu}`);
const catalogOnly = (l: string[]): boolean => l.every((r) => /catalog|TOUT_OK|114-catalog-append/.test(r));

describe('ALL-verify.sql after 118 (lot 7)', () => {
  const bundle = async (): Promise<PGlite> => {
    const db = new PGlite();
    for (const s of prodStateSql()) await db.exec(s);
    await db.exec(readCards(OUTPUTS.bundle));
    return db;
  };
  it('answers TOUT_OK after the bundle, after 116 and the rebuild, after 117 and the rebuild', async () => {
    const db = await bundle();
    expect(await notOk(db)).toEqual([]);
    await db.exec(at(rd('116-photos-harvest.sql'), '12:00'));
    expect(catalogOnly(await notOk(db))).toBe(true);
    await db.exec('select public.cards_build_catalog()'); // 103's body (a DELETE without WHERE runs in PGlite)
    expect(await notOk(db)).toEqual([]);
    await db.exec(at(rd('117-catalog-safeupdate.sql'), '12:00'));
    await db.exec('select public.cards_build_catalog()');
    expect(await notOk(db)).toEqual([]);
  });

  it('answers TOUT_OK after the REAL 118 and the rebuild (groups in 2 and 3 parts), after approvals and a rebuild', async () => {
    const db = await bundle();
    for (const f of ['116-photos-harvest.sql', '117-catalog-safeupdate.sql', '118-group-parts.sql']) await db.exec(at(rd(f), '12:00'));
    await db.exec('select public.cards_build_catalog()');
    expect(Number((await db.query<{ n: number }>('select max(part)::int as n from public.cards_catalog')).rows[0]!.n)).toBe(3);
    expect(await notOk(db)).toEqual([]);
    // the owner approves the photos pending for the personality rights warning alone, then rebuilds
    await db.exec(`update public.cards_photos set status = 'approved' where status = 'pending' and review_note = 'To review: Commons shows a personality rights warning on the file'`);
    await db.exec('select public.cards_build_catalog()');
    expect(await notOk(db)).toEqual([]);
    // every pending photo approved: the rebuild again
    await db.exec(`update public.cards_photos set status = 'approved' where status = 'pending'`);
    await db.exec('select public.cards_build_catalog()');
    expect(await notOk(db)).toEqual([]);
  });

  it('is TOUT_OK on a database without 118 (the parts column is read dynamically)', async () => {
    const db = new PGlite();
    for (const s of prodStateSql()) await db.exec(s);
    await db.exec(readCards(OUTPUTS.bundle));
    for (const f of ['116-photos-harvest.sql', '117-catalog-safeupdate.sql']) await db.exec(at(rd(f), '12:00'));
    await db.exec('select public.cards_build_catalog()');
    expect(await notOk(db)).toEqual([]);
    expect(await db.query(`select 1 from information_schema.columns where table_name = 'cards_photos' and column_name = 'parts'`).then((r) => r.rows.length)).toBe(0);
  });
});
