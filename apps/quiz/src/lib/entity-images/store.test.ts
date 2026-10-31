import { describe, expect, it, vi } from 'vitest';

import { BUCKET, imageTag, path2x } from './constants';
import { ImageError } from './errors';
import { processImage } from './process';
import { assertEntity, deleteImage, publicUrl, saveImage, setFocal, toDto } from './store';
import { GOOD_META, animeSeed, fakeDb, makeImage } from './test-support';

import type { ImageMeta } from './types';

const meta = GOOD_META as unknown as ImageMeta;
const code = async (p: Promise<unknown>): Promise<string> => { try { await p; } catch (e) { return e instanceof ImageError ? e.code : 'other'; } return 'none'; };

async function saved(db: ReturnType<typeof fakeDb>, rev = vi.fn(), kind: 'series' | 'character' = 'series', slug = 'death-note', color = 'png' as 'png' | 'jpeg') {
  const image = await processImage(await makeImage(1000, 1400, color), kind);
  return { dto: await saveImage(db, { kind, slug, image, meta, userId: 'admin-1' }, rev), image, rev };
}

describe('assertEntity', () => {
  it('knows a series and a character of the anime site', async () => {
    const db = fakeDb(animeSeed());
    await expect(assertEntity(db, 'series', 'death-note')).resolves.toBeUndefined();
    await expect(assertEntity(db, 'character', 'death-note/light-yagami')).resolves.toBeUndefined();
  });

  it('refuses an unknown series, an unknown character, a character of another series and a kpop group', async () => {
    const db = fakeDb(animeSeed());
    expect(await code(assertEntity(db, 'series', 'nope'))).toBe('unknown_entity');
    expect(await code(assertEntity(db, 'series', 'bts'))).toBe('unknown_entity');
    expect(await code(assertEntity(db, 'character', 'death-note/nobody'))).toBe('unknown_entity');
    expect(await code(assertEntity(db, 'character', 'one-piece/light-yagami'))).toBe('unknown_entity');
  });
});

describe('saveImage', () => {
  it('stores both files under a hashed name, writes the row and revalidates the image', async () => {
    const db = fakeDb(animeSeed());
    const { dto, image, rev } = await saved(db);
    const path = `anime/series/death-note/${image.hash}.webp`;
    expect(db.files.has(`${BUCKET}/${path}`)).toBe(true);
    expect(db.files.has(`${BUCKET}/${path2x(path)}`)).toBe(true);
    expect(db.tables.entity_images).toHaveLength(1);
    expect(db.tables.entity_images![0]).toMatchObject({ site_id: 'anime', kind: 'series', slug: 'death-note', path, width: 736, height: 981, license: 'cc_by', author: 'Jane Doe', created_by: 'admin-1' });
    expect(dto.url).toBe(publicUrl(path));
    expect(dto.url2x).toBe(publicUrl(path2x(path)));
    expect(rev).toHaveBeenCalledWith('series', 'death-note');
  });

  it('a character path has the series and the character in it', async () => {
    const db = fakeDb(animeSeed());
    const { image } = await saved(db, vi.fn(), 'character', 'death-note/light-yagami');
    expect(db.files.has(`${BUCKET}/anime/character/death-note/light-yagami/${image.hash}.webp`)).toBe(true);
    expect(db.tables.entity_images![0]).toMatchObject({ width: 360, height: 480 });
  });

  it('a replacement updates the row (focal back to the middle, creator kept) and removes the old files', async () => {
    const db = fakeDb(animeSeed());
    const first = await saved(db, vi.fn(), 'series', 'death-note', 'png');
    await setFocal(db, 'series', 'death-note', 20, 30, vi.fn());
    const second = await saved(db, vi.fn(), 'series', 'death-note', 'jpeg');
    expect(second.image.hash).not.toBe(first.image.hash);
    expect(db.tables.entity_images).toHaveLength(1);
    expect(db.tables.entity_images![0]).toMatchObject({ focal_x: 50, focal_y: 50, created_by: 'admin-1' });
    expect([...db.files.keys()].sort()).toEqual([
      `${BUCKET}/anime/series/death-note/${second.image.hash}-2x.webp`, `${BUCKET}/anime/series/death-note/${second.image.hash}.webp`,
    ].sort());
    expect(db.removed).toEqual([`anime/series/death-note/${first.image.hash}.webp`, `anime/series/death-note/${first.image.hash}-2x.webp`]);
  });

  it('the same picture twice keeps its files', async () => {
    const db = fakeDb(animeSeed());
    await saved(db);
    await saved(db);
    expect(db.files.size).toBe(2);
    expect(db.removed).toEqual([]);
  });

  it('removes the new files when the database refuses the row, and does not revalidate', async () => {
    const db = fakeDb(animeSeed());
    db.fail.insert = true;
    const image = await processImage(await makeImage(1000, 1400, 'png'), 'series');
    const rev = vi.fn();
    expect(await code(saveImage(db, { kind: 'series', slug: 'death-note', image, meta, userId: 'admin-1' }, rev))).toBe('db_failed');
    expect(db.files.size).toBe(0);
    expect(rev).not.toHaveBeenCalled();
  });

  it('a storage failure is storage_failed and writes no row', async () => {
    const db = fakeDb(animeSeed());
    db.fail.upload = true;
    const image = await processImage(await makeImage(1000, 1400, 'png'), 'series');
    expect(await code(saveImage(db, { kind: 'series', slug: 'death-note', image, meta, userId: 'admin-1' }, vi.fn()))).toBe('storage_failed');
    expect(db.tables.entity_images).toHaveLength(0);
  });
});

describe('the 96 px file of step 2 (019\'s thumb_path)', () => {
  const OLD = 'anime/series/death-note/0123456789abcdef';
  const stored = (): ReturnType<typeof fakeDb> => {
    const db = fakeDb({ ...animeSeed(), entity_images: [{
      id: 7, site_id: 'anime', kind: 'series', slug: 'death-note', path: `${OLD}.webp`, thumb_path: `${OLD}-96.webp`, license_verified: true,
      width: 736, height: 981, focal_x: 50, focal_y: 50, source_url: 'https://x.org/a', author: 'A', license: 'cc0', license_note: null, updated_at: '2026-10-30T00:00:00Z',
    }] });
    for (const f of [`${OLD}.webp`, `${OLD}-2x.webp`, `${OLD}-96.webp`]) db.files.set(`${BUCKET}/${f}`, Buffer.from('x'));
    return db;
  };

  it('a replacement removes the old 96 px file with the 1x and the 2x, and the row drops it and its check', async () => {
    const db = stored();
    const { image } = await saved(db);
    expect(db.removed).toEqual([`${OLD}.webp`, `${OLD}-2x.webp`, `${OLD}-96.webp`]);
    expect(db.tables.entity_images![0]).toMatchObject({ path: `anime/series/death-note/${image.hash}.webp`, thumb_path: null, license_verified: false });
    expect([...db.files.keys()].some((k) => k.includes(OLD))).toBe(false);
  });

  it('a delete removes the 96 px file too', async () => {
    const db = stored();
    await deleteImage(db, 'series', 'death-note', vi.fn());
    expect(db.removed).toEqual([`${OLD}.webp`, `${OLD}-2x.webp`, `${OLD}-96.webp`]);
    expect(db.files.size).toBe(0);
  });

  it('before 019 (no thumb_path column) a replace and a delete still work on the two files', async () => {
    const db = fakeDb(animeSeed(), { missingColumns: ['thumb_path'] });
    const first = await saved(db, vi.fn(), 'series', 'death-note', 'png');
    await saved(db, vi.fn(), 'series', 'death-note', 'jpeg');
    expect(db.removed).toEqual([`anime/series/death-note/${first.image.hash}.webp`, `anime/series/death-note/${first.image.hash}-2x.webp`]);
    expect(db.tables.entity_images![0]).not.toHaveProperty('thumb_path');
    await deleteImage(db, 'series', 'death-note', vi.fn());
    expect(db.files.size).toBe(0);
  });
});

describe('setFocal', () => {
  it('saves the focal point and revalidates the image', async () => {
    const db = fakeDb(animeSeed());
    await saved(db);
    const rev = vi.fn();
    const dto = await setFocal(db, 'series', 'death-note', 12.5, 80, rev);
    expect([dto.focalX, dto.focalY]).toEqual([12.5, 80]);
    expect(db.tables.entity_images![0]).toMatchObject({ focal_x: 12.5, focal_y: 80 });
    expect(rev).toHaveBeenCalledWith('series', 'death-note');
  });

  it('there is no focal point to set before an image exists', async () => {
    const db = fakeDb(animeSeed());
    const rev = vi.fn();
    expect(await code(setFocal(db, 'series', 'death-note', 1, 1, rev))).toBe('no_image');
    expect(rev).not.toHaveBeenCalled();
  });
});

describe('deleteImage', () => {
  it('removes the row and both files and revalidates the image', async () => {
    const db = fakeDb(animeSeed());
    await saved(db);
    const rev = vi.fn();
    await deleteImage(db, 'series', 'death-note', rev);
    expect(db.tables.entity_images).toHaveLength(0);
    expect(db.files.size).toBe(0);
    expect(rev).toHaveBeenCalledWith('series', 'death-note');
  });

  it('answers no_image when there is nothing to remove', async () => {
    const rev = vi.fn();
    expect(await code(deleteImage(fakeDb(animeSeed()), 'series', 'death-note', rev))).toBe('no_image');
    expect(rev).not.toHaveBeenCalled();
  });
});

describe('toDto and publicUrl', () => {
  it('builds the public bucket URL and numbers from the numeric strings of the database', () => {
    expect(publicUrl('a/b.webp', 'https://x.supabase.co/')).toBe('https://x.supabase.co/storage/v1/object/public/entity-images/a/b.webp');
    const dto = toDto({ site_id: 'anime', kind: 'series', slug: 's', path: 'anime/series/s/h.webp', width: 736, height: 981, focal_x: '33.50', focal_y: '50.00', license: 'cc0', author: 'A', source_url: 'https://x.test', license_note: null, updated_at: 't' });
    expect([dto.focalX, dto.focalY]).toEqual([33.5, 50]);
    expect(dto.url2x.endsWith('/anime/series/s/h-2x.webp')).toBe(true);
  });

  it('the cache tag names the site, the kind and the slug', () => {
    expect(imageTag('character', 'death-note/l')).toBe('entity-image:anime:character:death-note/l');
  });
});
