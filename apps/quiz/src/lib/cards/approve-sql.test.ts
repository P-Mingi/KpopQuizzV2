// Bunnyverse Cards lot 6: pglite proof of 116c-approve-personality-rights.sql (built by approve-sql.ts from invented photos), after 116.
// Checked: the guard (exactly N photos pending for the personality rights warning alone, added by 116; a held photo once its person has a
// birth date; no pack opened; the time window), the approval changes those photos only, the Verify lines, a second run is refused, the
// rollback puts them back as they were; and the committed file lists exactly the photos of photos.json pending for that reason alone.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { MARK116C, PR_ONLY, buildApprove, personalityOnlyPages } from './approve-sql';
import { PLAYER } from './catalog-append-fixture';
import type { HarvestPhotosFile } from './harvest-checks';
import { HARVEST, at, harvestBase } from './harvest-fixture';
import { HELD_NOTE, buildHarvest } from './harvest-sql';
import { CARDS_SQL, failure, freshCardsDb, one, rows } from './sql-harness';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const base = HARVEST.subjects[0]!.photos[0]!;
const ph = (n: number, review: string[]) => ({ ...base, status: 'pending' as const, review, page: `https://commons.wikimedia.org/wiki/File:Pr_${n}.jpg`,
  sha1: `pr-sha-${n}`, event: `Pr ${n}`, date: `2024-0${n}-02` });
const PR1 = ph(1, [PR_ONLY]);
const PR2 = ph(2, [PR_ONLY]);
const OTHER = ph(3, [PR_ONLY, '2 people are in the frame']);
const HELD = ph(4, [PR_ONLY]);
const H116 = buildHarvest({
  checked_on: '2026-11-16',
  subjects: [
    { slug: 'ada-trio', kind: 'idol', name: 'Ada', qid: 'Q1', group: 'trio', locked: false, photos: [PR1, PR2, OTHER, { ...ph(5, []), status: 'auto' }] },
    // no public.idols row: 116 adds one without a date and holds the photo with its note
    { slug: 'nobody-pr-trio', kind: 'idol', name: 'Nobody Pr', qid: 'Q4260', group: 'trio', locked: false, photos: [HELD] },
  ],
});
const PAGES = [PR1.page, PR2.page, HELD.page];
const C = buildApprove(PAGES, '2026-11-16');
const SQL = at(C.sql, '12:00');

async function after116() {
  const db = await freshCardsDb();
  for (const f of harvestBase()) await db.exec(f);
  await db.exec(at(H116.sql, '12:00'));
  return db;
}
const statuses = (db: Awaited<ReturnType<typeof after116>>) =>
  rows<{ page: string; status: string }>(db, `select right(source_page, 8) as page, status from cards_photos where source_page like '%File:Pr_%' order by source_page`);

describe('116c-approve-personality-rights.sql', () => {
  it('is one DO block with Verify lines, no dash, the clock read once, and the 116 note it reads back', () => {
    expect(C.sql.match(/^do \$c116c\$$/gm)).toHaveLength(1);
    expect(C.rollback.match(/^do \$c116cr\$$/gm)).toHaveLength(1);
    for (const k of ['What:', 'Guard:', 'Why:', 'Rows:', 'Needs:', 'Verify:', 'Refuses:', 'Undo:', 'o1-transaction: single, ONE DO block']) expect(C.sql).toContain(`-- ${k}`);
    expect(C.sql.match(/now\(\)/g)).toHaveLength(1);
    expect(C.sql + C.rollback).not.toMatch(/[\u2013\u2014]/);
    expect(H116.sql).toContain(HELD_NOTE);
    expect(C.sql).not.toMatch(/\b(insert into|delete from)\b/);
    expect(C.sql).not.toMatch(/public\.idols set|update public\.idols/);
  });

  it('refuses unless exactly the expected photos qualify: a held photo counts only once its person has a birth date', async () => {
    const db = await after116();
    const before = await statuses(db);
    // the held photo's person has no birth date yet: 2 of 3 qualify
    expect(await failure(db, SQL)).toMatch(/2 photos qualify \(2 pages\), the file expects exactly 3: nothing changed/);
    expect(await statuses(db)).toEqual(before);
    // the owner fills the date (116b): 3 qualify, the file passes
    await db.exec(`update public.idols set birth_date = '1998-03-03' where wikidata_qid = 'Q4260'`);
    expect(await failure(db, SQL)).toBeNull();
    expect(await statuses(db)).toEqual([
      { page: 'Pr_1.jpg', status: 'approved' }, { page: 'Pr_2.jpg', status: 'approved' }, { page: 'Pr_3.jpg', status: 'pending' },
      { page: 'Pr_4.jpg', status: 'approved' }, { page: 'Pr_5.jpg', status: 'auto' },
    ]);
    // the Verify lines hold
    for (const line of C.sql.split('\n').filter((l) => l.startsWith('-- Verify:'))) {
      const q = /^-- Verify: (.*?);\s{3}expect (\S+)/.exec(line)!;
      expect(String(await one(db, q[1]!)), line).toBe(q[2] === '3' ? '3' : '0');
    }
    expect(await one(db, `select count(*) from cards_photos where right(review_note, ${MARK116C.length}) = '${MARK116C}'`)).toBe(3);
    // a second run is refused: nothing qualifies any more
    expect(await failure(db, SQL)).toMatch(/0 photos qualify/);
    // the rollback puts them back as they were, notes included
    await db.exec(C.rollback);
    expect(await statuses(db)).toEqual(before.map((r) => r));
    expect(await rows(db, `select review_note from cards_photos where source_page = '${PR1.page}'`)).toEqual([{ review_note: `To review: ${PR_ONLY}` }]);
    expect(await rows(db, `select review_note from cards_photos where source_page = '${HELD.page}'`)).toEqual([{ review_note: `${HELD_NOTE}; ${PR_ONLY}` }]);
  });

  it('refuses once a pack was opened, before 116, and between 23:50 and 00:30 UTC, with nothing changed', async () => {
    const fresh = await freshCardsDb();
    for (const f of harvestBase()) await fresh.exec(f);
    expect(await failure(fresh, SQL)).toMatch(/apply 116-photos-harvest\.sql first/);
    const db = await after116();
    for (const t of ['23:50', '00:29']) expect(await failure(db, at(C.sql, t)), t).toMatch(/refused between 23:50 and 00:30 UTC/);
    await db.exec('select public.cards_build_catalog()');
    await db.exec(PLAYER);
    const before = await statuses(db);
    expect(await failure(db, SQL)).toMatch(/a pack was opened/);
    expect(await failure(db, C.rollback)).toMatch(/a pack was opened/);
    expect(await statuses(db)).toEqual(before);
  });

  it('the committed file lists exactly the photos of photos.json pending for the personality rights warning alone', () => {
    const repo = path.resolve(CARDS_SQL, '../../..');
    const file = JSON.parse(readFileSync(path.join(repo, 'docs/design/cards/data/lot6/photos.json'), 'utf8')) as HarvestPhotosFile;
    const pages = personalityOnlyPages(file);
    const committed = readFileSync(path.join(CARDS_SQL, '116c-approve-personality-rights.sql'), 'utf8');
    expect(committed).toBe(buildApprove(pages, file.checked_on).sql);
    expect(readFileSync(path.join(CARDS_SQL, '116c-approve-personality-rights.rollback.sql'), 'utf8')).toBe(buildApprove(pages, file.checked_on).rollback);
    expect(committed).toContain(`the ${pages.length} photos`);
  });
});
