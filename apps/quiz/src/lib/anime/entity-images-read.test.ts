// Run O1 (ADM front): the server reads of the owner's images, against a fake client: the whole table in pages past the 1000 row cap, the
// anime scope, the pictures by series and by character, the names of /credits with no locked character, and an empty answer on any failure.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ENTITY_IMAGE_COLUMNS, characterPictures, loadCreditNames, loadEntityImageRows, seriesPictures } from './entity-images-read';
import { ownerSeriesPicture, setOwnerSeriesPictures } from './entity-images-store';

import type { ImagesDb } from './entity-images-read';
import type { EntityImage } from './entity-images-rules';

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');

const row = (over: Partial<EntityImage> = {}): EntityImage => ({
  kind: 'series', slug: 'death-note', path: 'series/death-note.webp', width: 736, height: 981, focal_x: 50, focal_y: 50,
  source_url: 'https://example.org/p', author: 'Ana', license: 'cc0', license_note: null, updated_at: '2026-10-26T10:00:00.000Z', ...over,
});

/** A fake builder that records its filters and answers range(from, to) from `rows`. */
function fakeDb(tables: Record<string, unknown[]>, seen: { filters: string[]; selects: string[]; ranges: Array<[number, number]> } = { filters: [], selects: [], ranges: [] }, fail = false): ImagesDb {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      const q: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        select(cols: string) { seen.selects.push(`${table}:${cols}`); return q; },
        eq(col: string, v: unknown) { seen.filters.push(`${table}.${col}=${String(v)}`); return q; },
        order() { return q; },
        range(from: number, to: number) { seen.ranges.push([from, to]); return Promise.resolve(fail ? { data: null, error: { message: 'relation does not exist' } } : { data: rows.slice(from, to + 1), error: null }); },
        then(res: (v: unknown) => unknown) { return Promise.resolve({ data: rows, error: null }).then(res); },
      };
      return q;
    },
  };
}

afterEach(() => { setOwnerSeriesPictures({}); vi.restoreAllMocks(); });

describe('loadEntityImageRows', () => {
  it('reads only the display columns, scoped to the anime site', async () => {
    const seen = { filters: [] as string[], selects: [] as string[], ranges: [] as Array<[number, number]> };
    const rows = await loadEntityImageRows(fakeDb({ entity_images: [row(), row({ kind: 'character', slug: 'death-note/light' })] }, seen));
    expect(rows).toHaveLength(2);
    expect(seen.selects).toEqual([`entity_images:${ENTITY_IMAGE_COLUMNS}`]);
    expect(seen.filters).toContain('entity_images.site_id=anime');
    expect(ENTITY_IMAGE_COLUMNS.split(', ').sort()).toEqual(['author', 'focal_x', 'focal_y', 'height', 'kind', 'license', 'license_note', 'path', 'slug', 'source_url', 'updated_at', 'width']);
  });

  it('pages past the 1000 row cap', async () => {
    const many = Array.from({ length: 2300 }, (_, i) => row({ kind: 'character', slug: `s/c${i}` }));
    const seen = { filters: [] as string[], selects: [] as string[], ranges: [] as Array<[number, number]> };
    const rows = await loadEntityImageRows(fakeDb({ entity_images: many }, seen));
    expect(rows).toHaveLength(2300);
    expect(seen.ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it('drops a row it does not understand', async () => {
    const rows = await loadEntityImageRows(fakeDb({ entity_images: [row(), row({ license: 'gpl' as never }), row({ kind: 'poster' as never }), row({ path: '' })] }));
    expect(rows).toHaveLength(1);
  });

  it('is an empty list when the read fails (the table is not there yet): the pages then show the bundled photo', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await loadEntityImageRows(fakeDb({}, undefined, true))).toEqual([]);
    expect(spy).toHaveBeenCalled();
  });
});

describe('the pictures', () => {
  const rows = [
    row({ slug: 'death-note', focal_x: 20, focal_y: 80 }),
    row({ slug: 'bleach', license: 'cc_by' }),
    row({ kind: 'character', slug: 'death-note/light' }),
    row({ kind: 'character', slug: 'death-note/ryuk' }),
    row({ kind: 'character', slug: 'death-note-2/light' }),
    row({ kind: 'character', slug: 'bleach/ichigo' }),
  ];
  it('keys the series by slug', () => {
    const m = seriesPictures(rows);
    expect(Object.keys(m).sort()).toEqual(['bleach', 'death-note']);
    expect(m['death-note']).toMatchObject({ position: '20% 80%', width: 736, height: 981 });
    expect(m.bleach!.credit?.license).toBe('CC BY');
    expect(m['death-note']!.credit).toBeNull();
  });
  it('keys the characters of one series by the slug of the character, and only that series', () => {
    expect(Object.keys(characterPictures(rows, 'death-note')).sort()).toEqual(['light', 'ryuk']);
    expect(Object.keys(characterPictures(rows, 'bleach'))).toEqual(['ichigo']);
    expect(characterPictures(rows, 'naruto')).toEqual({});
  });
  it('is read by the series store, and forgotten when the store is emptied', () => {
    setOwnerSeriesPictures(seriesPictures(rows));
    expect(ownerSeriesPicture('bleach')?.src).toContain('/storage/v1/object/public/entity-images/series/death-note.webp');
    expect(ownerSeriesPicture('naruto')).toBeNull();
    expect(ownerSeriesPicture(undefined)).toBeNull();
    expect(ownerSeriesPicture('constructor')).toBeNull();
    setOwnerSeriesPictures({});
    expect(ownerSeriesPicture('bleach')).toBeNull();
  });
});

describe('the names of /credits', () => {
  it('names the series and the characters with no spoiler only', async () => {
    const seen = { filters: [] as string[], selects: [] as string[], ranges: [] as Array<[number, number]> };
    const db = fakeDb({
      groups: [{ id: 1, slug: 'death-note', name: 'Death Note' }],
      characters: [{ group_id: 1, slug: 'light', name: 'Light Yagami' }],
    }, seen);
    const names = await loadCreditNames(db);
    expect(names).toEqual({ series: { 'death-note': 'Death Note' }, character: { 'death-note/light': 'Light Yagami' } });
    expect(seen.filters).toContain('characters.spoiler_level=0');
    expect(seen.filters).toContain('characters.status=published');
  });
  it('is empty on a failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const bad: ImagesDb = { from() { throw new Error('down'); } };
    expect(await loadCreditNames(bad)).toEqual({ series: {}, character: {} });
  });
});
