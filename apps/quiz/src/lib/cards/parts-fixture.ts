// Bunnyverse Cards lot 7: the data of the proofs of 118-group-parts.sql (parts-sql.test.ts, parts-open.test.ts on PGlite). The database is the
// one production has (bundle-fixture.ts: the bundle 099 to 115) with 116 and 117 applied, plus an invented group (group:zz) whose photos have
// the sizes the proofs need. Test code only.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';

import { OUTPUTS, readCards } from '../../../scripts/cards/bundle-sql.mjs';

import { prodStateSql } from './bundle-fixture';
import { at } from './harvest-fixture';
import { buildParts, type PartsData, type PartsPhoto, type PartsSql } from './parts-sql';
import { CARDS_SQL } from './sql-harness';

export const rd = (f: string): string => readFileSync(path.join(CARDS_SQL, f), 'utf8');
export const SOURCES = { text117: rd('117-catalog-safeupdate.sql'), text114: rd('114-catalog-append.sql'), text110: rd('110-core.sql') };

/** Production as of 2026-11-17: the bundle, then 116 and 117. */
export async function prodDb(): Promise<PGlite> {
  const db = new PGlite();
  for (const s of prodStateSql()) await db.exec(s);
  await db.exec(readCards(OUTPUTS.bundle));
  for (const f of ['116-photos-harvest.sql', '117-catalog-safeupdate.sql']) await db.exec(at(rd(f), '12:00'));
  return db;
}

export async function run(db: PGlite, sql: string, hhmm = '12:00'): Promise<string[]> {
  const notices: string[] = [];
  await db.exec(at(sql, hhmm), { onNotice: (n) => notices.push(n.message ?? '') });
  return notices;
}

/** The message of a script that must fail, or null. */
export async function failsWith(db: PGlite, sql: string, hhmm = '12:00'): Promise<string | null> {
  try {
    await db.exec(at(sql, hhmm));
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

export const page = (n: number): string => `https://commons.wikimedia.org/wiki/File:Lot7_${n}.jpg`;
export const entry = (p: string, o: Partial<PartsPhoto> = {}): PartsPhoto =>
  ({ page: p, parts: 2, heads_box: null, note: '2 cards by the ratio', focal_from: null, focal: null, review: false, rejected: false, by: 'ratio', ...o });
export const build = (photos: PartsPhoto[]): PartsSql => buildParts(SOURCES, { checked_on: '2026-11-17', photos } as PartsData);

/** The invented group: photos with chosen sizes and qualities, all live with a file to show. parts: what the owner set (null reads as 2). */
export interface ZzPhoto { w: number; h: number; q: number; parts: 2 | 3 | null; stage?: boolean }
export const ZZ: ZzPhoto[] = [
  { w: 4000, h: 1700, q: 5, parts: 3 }, // 3 x 1100 px: Full Art possible
  { w: 2000, h: 1600, q: 4, parts: 2 }, // 2 x 1000 px
  { w: 1800, h: 1000, q: 3, parts: 3 }, // 3 x 600 px: small, no Full Art
  { w: 1500, h: 1200, q: 3, parts: 2 }, // 2 x 750 px
  { w: 3000, h: 1400, q: 2, parts: 3 }, // 3 x 928 px
  { w: 1200, h: 1000, q: 2, parts: 2 }, // 2 x 600 px
];
export async function addGroup(db: PGlite, id: string, photos: ZzPhoto[], sortKey: string, first = 1): Promise<void> {
  await db.exec(`insert into public.cards_entities (id, kind, name, sort_key, active) values ('${id}', 'group', '${id}', '${sortKey}', true)`);
  for (const [i, p] of photos.entries()) {
    await db.query(`insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at, source_path,
        source_width, source_height, status, quality, stage, focal_x, focal_y, event_date)
      values ($1, $2, 'commons', $3, 'https://upload.example/x.jpg', 'A', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0', false, '2026-11-17', $4, $5, $6, 'auto', $7, $8, 50, 50, $9)`,
    [id, first + i, `https://commons.wikimedia.org/wiki/File:${id.replace(':', '_')}_${first + i}.jpg`, `images/group-photos/${id.replace(':', '_')}_${first + i}.jpg`,
      p.w, p.h, p.q, p.stage ?? false, `2025-01-${String(10 + i)}`]);
  }
  // the owner's choice per photo (only once 118 has added the column)
  if (await db.query(`select 1 from information_schema.columns where table_name = 'cards_photos' and column_name = 'parts'`).then((r) => r.rows.length > 0)) {
    for (const [i, p] of photos.entries()) await db.query('update public.cards_photos set parts = $1 where entity_id = $2 and slot = $3', [p.parts, id, first + i]);
  }
}
