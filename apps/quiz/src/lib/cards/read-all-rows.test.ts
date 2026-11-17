// The paged read of PostgREST rows (scripts/cards/card-files.mjs, lot CPUB-RETRY). Run Cards publish #2 read cards_photos with limit=2000 and
// got the first 1,000 of 1,101 live photos: Supabase answers at most its max rows (1,000) a read, whatever the limit. readAllRows reads page
// by page and checks the rows read against the total of the first page's Content-Range (Prefer: count=exact). Pure: no network.
import { describe, expect, it } from 'vitest';

import { PAGE_ROWS, contentRangeTotal, readAllRows } from '../../../scripts/cards/card-files.mjs';

/** A page as PostgREST answers it: `rows`, and a Content-Range with `total` (or a star). */
const answer = (rows: unknown[], offset: number, total: number | '*'): Response =>
  new Response(JSON.stringify(rows), { status: 200, headers: { 'content-range': `${rows.length ? `${offset}-${offset + rows.length - 1}` : '*'}/${total}` } });

/** A table of `total` rows ({ id }), at most `maxRows` a read; `announce` replaces the total of the Content-Range; `ignoreOffset`: every
 *  read gives the first page. Returns the page reader and the reads made ([offset, first]). */
function table(total: number, { maxRows = 1000, announce = total as number | '*', ignoreOffset = false } = {}) {
  const reads: [number, boolean][] = [];
  const readPage = async (offset: number, first: boolean): Promise<Response> => {
    reads.push([offset, first]);
    const from = ignoreOffset ? 0 : offset;
    const n = Math.max(0, Math.min(PAGE_ROWS, maxRows, total - from));
    return answer(Array.from({ length: n }, (_, i) => ({ id: from + i + 1 })), from, first ? announce : '*');
  };
  return { readPage, reads };
}

describe('contentRangeTotal', () => {
  it('reads the total after the slash, or null', () => {
    expect(contentRangeTotal('0-999/1101')).toBe(1101);
    expect(contentRangeTotal('*/0')).toBe(0);
    expect(contentRangeTotal(' 1000-1100/1101 ')).toBe(1101);
    expect(contentRangeTotal('0-999/*')).toBeNull();
    expect(contentRangeTotal('')).toBeNull();
    expect(contentRangeTotal(null)).toBeNull();
  });
});

describe('readAllRows', () => {
  it('reads 1,101 rows in two pages of at most 1,000, the count asked on the first page only', async () => {
    expect(PAGE_ROWS).toBe(1000);
    const t = table(1101);
    const { rows, total } = await readAllRows(t.readPage, 'GET cards_photos');
    expect(total).toBe(1101);
    expect(rows).toHaveLength(1101);
    expect(rows.at(999)).toEqual({ id: 1000 });
    expect(rows.at(-1)).toEqual({ id: 1101 });
    expect(t.reads).toEqual([[0, true], [1000, false]]);
  });

  it('a total that is a whole number of pages reads one more, empty page; an empty table reads one', async () => {
    const t = table(2000);
    expect((await readAllRows(t.readPage, 'x')).rows).toHaveLength(2000);
    expect(t.reads.map(([o]) => o)).toEqual([0, 1000, 2000]);
    const e = table(0);
    expect(await readAllRows(e.readPage, 'x')).toEqual({ rows: [], total: 0 });
    expect(e.reads).toEqual([[0, true]]);
  });

  it('stops when the rows read are not the total: a project answering fewer rows a read, a row added or removed during the read', async () => {
    await expect(readAllRows(table(1101, { maxRows: 500 }).readPage, 'GET cards_photos')).rejects.toThrow('GET cards_photos: 500 rows read, the project counts 1101; stopped before any write');
    await expect(readAllRows(table(1101, { announce: 1102 }).readPage, 'GET cards_photos')).rejects.toThrow('GET cards_photos: 1101 rows read, the project counts 1102');
    await expect(readAllRows(table(1101, { announce: 1100 }).readPage, 'GET cards_photos')).rejects.toThrow('GET cards_photos: 1101 rows read, the project counts 1100');
  });

  it('stops at once when the first page has no total, and never loops on a server that ignores the offset', async () => {
    const t = table(1101, { announce: '*' });
    await expect(readAllRows(t.readPage, 'read idols')).rejects.toThrow('read idols: no total in the Content-Range of the first page (Prefer: count=exact); stopped before any write');
    expect(t.reads).toEqual([[0, true]]);
    const same = table(3000, { announce: 1500, ignoreOffset: true });
    await expect(readAllRows(same.readPage, 'x')).rejects.toThrow('x: 2000 rows read, the project counts 1500');
    expect(same.reads).toHaveLength(2);
  });

  it('with a key, a row read twice stops the read; an answer that is not a list stops it too', async () => {
    const twice = async (offset: number, first: boolean): Promise<Response> => answer(offset === 0 ? [{ id: 1 }, { id: 1 }] : [], offset, first ? 2 : '*');
    await expect(readAllRows(twice, 'GET cards_photos', { key: (r: { id: number }) => r.id })).rejects.toThrow('GET cards_photos: the row 1 was read twice (the rows changed during the read); stopped before any write');
    expect((await readAllRows(twice, 'GET cards_photos')).rows).toHaveLength(2);
    const notList = async (): Promise<Response> => new Response(JSON.stringify({ message: 'x' }), { headers: { 'content-range': '*/0' } });
    await expect(readAllRows(notList, 'x')).rejects.toThrow('x: the answer is not a list of rows; stopped before any write');
  });
});
