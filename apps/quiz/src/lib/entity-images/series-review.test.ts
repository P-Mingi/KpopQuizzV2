// Lot 3 DLE (owner request of 2026-11-14): the series rows that remain after the non-free deletion, listed read only for the owner's private preview.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NON_FREE_CONFIRM, deleteNonFree, planNonFree } from './non-free';
import { nonFreeFake } from './non-free-fake';
import { reviewItemOf, selectSeriesRow, selectSeriesRows } from './series-review';

const series = (id: number, slug: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id, site_id: 'anime', kind: 'series', slug, path: `anime/series/${slug}/s${id}.webp`, thumb_path: null, license: 'public_domain', license_note: null,
  source_url: null, created_at: '2026-10-01T00:00:00+00:00', license_verified: false, ...over,
});

/** The 50 series rows the integrator counted: 45 public_domain not verified, 4 cc0 not verified, 1 verified. */
const fifty = (): Record<string, unknown>[] => [
  ...Array.from({ length: 45 }, (_, i) => series(1 + i, `pd-${String(i).padStart(2, '0')}`, { source_url: i % 3 === 0 ? 'https://commons.wikimedia.org/wiki/File:X.jpg' : null })),
  ...Array.from({ length: 4 }, (_, i) => series(46 + i, `cc0-${i}`, { license: 'cc0', source_url: i === 3 ? 'not an address' : 'https://static.wikia.nocookie.net/a/b.png' })),
  series(50, 'verified-one', { license: 'public_domain', license_verified: true, source_url: 'https://upload.wikimedia.org/x.png', thumb_path: 'anime/series/verified-one/t.webp' }),
];

describe('the series rows to check', () => {
  it('turns a row into what the owner reads: slug, licence, verified or not, the source host only', () => {
    expect(reviewItemOf(series(1, 'a', { source_url: 'https://Commons.Wikimedia.org/wiki/File:X.jpg', license: 'cc0' }) as never))
      .toEqual({ slug: 'a', license: 'cc0', verified: false, source: 'host', host: 'commons.wikimedia.org' });
    expect(reviewItemOf(series(2, 'b') as never)).toEqual({ slug: 'b', license: 'public_domain', verified: false, source: 'none', host: null });
    expect(reviewItemOf(series(3, 'c', { source_url: '   ' }) as never).source).toBe('none');
    expect(reviewItemOf(series(4, 'd', { source_url: 'javascript:alert(1)' }) as never)).toMatchObject({ source: 'unreadable', host: null });
    expect(reviewItemOf(series(5, 'e', { license_verified: true }) as never).verified).toBe(true);
    // a path or an address never leaves the server
    expect(Object.keys(reviewItemOf(series(6, 'f', { source_url: 'https://x.org/y' }) as never)).sort()).toEqual(['host', 'license', 'slug', 'source', 'verified']);
  });

  it('lists every series row of the anime site in slug order, past the 1000-row cap, and nothing else', async () => {
    const many = Array.from({ length: 1200 }, (_, i) => series(10 + i, `s-${String(i).padStart(4, '0')}`));
    const other = [series(5000, 'kpop-series', { site_id: 'kpop' }), series(5001, 'a-character', { kind: 'character' })];
    const db = nonFreeFake([...many, ...other] as never[], []);
    const list = await selectSeriesRows(db);
    expect(list).toHaveLength(1200);
    expect(list[0]!.slug).toBe('s-0000');
    expect(list.at(-1)!.slug).toBe('s-1199');
  });

  it('reads one series by slug, null for a character, another site or an unknown slug', async () => {
    const db = nonFreeFake([series(1, 'one-piece'), series(2, 'one-piece/luffy', { kind: 'character' }), series(3, 'naruto', { site_id: 'kpop' })] as never[], []);
    expect((await selectSeriesRow(db, 'one-piece'))?.path).toBe('anime/series/one-piece/s1.webp');
    expect(await selectSeriesRow(db, 'one-piece/luffy')).toBeNull();
    expect(await selectSeriesRow(db, 'naruto')).toBeNull();
    expect(await selectSeriesRow(db, 'unknown')).toBeNull();
  });

  it('is read only: it never selects, plans or deletes a series for the button, and the 50 rows stay listed after the button ran', async () => {
    const chars = [
      { id: 100, site_id: 'anime', kind: 'character', slug: 'one-piece/luffy', path: 'anime/character/one-piece/luffy/a.webp', thumb_path: null, license: 'other', license_note: 'Official artwork, rights belong to the original creators and studio', source_url: null, created_at: '2026-11-11T21:10:00+00:00', license_verified: false },
    ];
    const rows = [...fifty(), ...chars];
    const objects = rows.flatMap((r) => [{ name: r.path as string, createdAt: '2026-11-11T21:10:00+00:00' }, { name: (r.path as string).replace(/\.webp$/, '-2x.webp'), createdAt: '2026-11-11T21:10:00+00:00' }]);
    const db = nonFreeFake(rows as never[], objects);
    const before = (await selectSeriesRows(db)).map(reviewItemOf);
    expect(before).toHaveLength(50);
    expect(before.filter((i) => i.license === 'public_domain' && !i.verified)).toHaveLength(45);
    expect(before.filter((i) => i.license === 'cc0' && !i.verified)).toHaveLength(4);
    expect(before.filter((i) => i.verified)).toHaveLength(1);
    const plan = await planNonFree(db);
    expect(plan.counts.rows).toBe(1);
    expect(plan.rows.every((r) => !r.files.some((f) => f.startsWith('anime/series/')))).toBe(true);
    await deleteNonFree(db, { confirm: NON_FREE_CONFIRM, expect: plan.counts });
    const after = (await selectSeriesRows(db)).map(reviewItemOf);
    expect(after).toEqual(before);
    expect(db.removed.some((f) => f.startsWith('anime/series/'))).toBe(false);
    expect(db.calls.some((c) => c === 'delete entity_images 1')).toBe(true);
  });

  it('the module holds no write: no insert, update, upsert, delete or remove', () => {
    const src = readFileSync(fileURLToPath(new URL('./series-review.ts', import.meta.url)), 'utf8').split('\n').filter((l) => !l.trimStart().startsWith('//')).join('\n');
    expect(src).not.toMatch(/\.(insert|update|upsert|delete|remove|rpc)\s*\(/);
  });
});
