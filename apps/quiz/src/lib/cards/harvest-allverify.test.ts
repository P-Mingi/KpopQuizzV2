// Bunnyverse Cards lot 6: the owner's script (owner-cards.mjs) refuses to publish unless ALL-verify.sql answers TOUT_OK. On the state the
// integrator read in production (bundle-fixture.ts), after the bundle of 099 to 115: the committed 116 then "Reconstruire le catalogue"
// keep TOUT_OK true (the exact-set rows of 102 and 103 leave out what 116's log added; 116 gives the groups it brings in their type of
// 111), approvals of its pending photos then a rebuild too; and no row 116 added to public.idols is active.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

import { OUTPUTS, readCards } from '../../../scripts/cards/bundle-sql.mjs';

import { prodStateSql } from './bundle-fixture';
import { at } from './harvest-fixture';
import { CARDS_SQL } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

type Row = { fichier: string; controle: string; attendu: string | null; obtenu: string | null; ok: boolean };
const notOk = async (db: PGlite): Promise<string[]> =>
  (await db.query<Row>(readCards(OUTPUTS.verify))).rows.filter((r) => !r.ok).map((r) => `${r.fichier} ${r.controle}: ${r.attendu} / ${r.obtenu}`);

describe('ALL-verify.sql after 116 (lot 6)', () => {
  it('answers TOUT_OK after 116 and the rebuild, and again after approvals and a rebuild', async () => {
    const db = new PGlite();
    for (const s of prodStateSql()) await db.exec(s);
    await db.exec(readCards(OUTPUTS.bundle));
    expect(await notOk(db)).toEqual([]);
    await db.exec(at(readFileSync(path.join(CARDS_SQL, '116-photos-harvest.sql'), 'utf8'), '12:00'));
    // before the rebuild only the catalog rows differ (their controle says "true after Reconstruire le catalogue")
    expect((await notOk(db)).every((r) => /catalog|TOUT_OK|114-catalog-append/.test(r))).toBe(true);
    await db.exec('select public.cards_build_catalog()');
    expect(await notOk(db)).toEqual([]);
    // the owner approves the photos pending for the personality rights warning alone (116c does it), then rebuilds
    await db.exec(`update public.cards_photos set status = 'approved' where status = 'pending' and review_note = 'To review: Commons shows a personality rights warning on the file'`);
    await db.exec('select public.cards_build_catalog()');
    expect(await notOk(db)).toEqual([]);
    // the groups 116 brought in that 111 lists have their type; no row of 116 in public.idols is active
    expect(Number((await db.query<{ n: number }>(`select count(*)::int as n from public.cards_harvest_log where kind = 'type'`)).rows[0]!.n)).toBeGreaterThan(0);
    expect(Number((await db.query<{ n: number }>(`select count(*)::int as n from public.idols where review_reason like '116-photos-harvest%' and active`)).rows[0]!.n)).toBe(0);
  });
});
