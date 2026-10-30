// Daily games step 2: the pure rules of the Photos admin (crop, WebP header, slots, validation), the writes of store.ts on an in-memory
// database and bucket, and the public reads that feed the home and /credits (fail closed, values checked at the sink).
import { describe, expect, it, vi } from 'vitest';

import { cropToBox, fitWidth, tooSmall } from './crop';
import {
  ICON_SLOTS, IMAGE_SLOTS, HOME_SLOT_KEY, PHOTO_BOX, isPhotoSlug, parseFocal, parseIconSettings, parseStickerSettings, photoFolder, tabOf,
} from './slots';
import { assertPhotoEntity, checkAssetFiles, checkPhotoFiles, removePhoto, restoreAsset, retireAsset, saveAsset, savePhoto } from './store';
import { META, photoFiles, photosFakeDb, webpOf } from './test-support';
import { parseAssetMeta, parseAssetSettings, parseAssetSlot, parseFocalFields, parsePhotoTarget, parsePublish } from './validate';
import { webpInfo } from './webp';

vi.mock('@/lib/entity-images/store', async (orig) => ({ ...(await orig<typeof import('@/lib/entity-images/store')>()) }));

import { isMissingView, loadLiveAssets, loadPublicPictures, toLiveAsset, toPublicPicture } from './public-read';
import { HOME_ASSET_KEYS } from '@/lib/site/hub/home-assets';

describe('crop', () => {
  it('takes the largest part of the box shape around the focal point, never past an edge', () => {
    expect(cropToBox(1000, 1000, { w: 400, h: 500 }, { x: 50, y: 50 })).toEqual({ sx: 100, sy: 0, sw: 800, sh: 1000 });
    expect(cropToBox(1000, 1000, { w: 400, h: 500 }, { x: 0, y: 50 })).toEqual({ sx: 0, sy: 0, sw: 800, sh: 1000 });
    expect(cropToBox(1000, 1000, { w: 400, h: 500 }, { x: 100, y: 50 })).toEqual({ sx: 200, sy: 0, sw: 800, sh: 1000 });
    expect(cropToBox(1200, 3000, { w: 96, h: 96 }, { x: 50, y: 10 })).toEqual({ sx: 0, sy: 0, sw: 1200, sh: 1200 });
    expect(cropToBox(1200, 3000, { w: 96, h: 96 }, { x: 50, y: 50 })).toEqual({ sx: 0, sy: 900, sw: 1200, sh: 1200 });
  });

  it('scales to a width without enlarging, and refuses a source under half the box', () => {
    expect(fitWidth(4000, 1250, 1920)).toEqual({ w: 1920, h: 600 });
    expect(fitWidth(800, 300, 1920)).toEqual({ w: 800, h: 300 });
    expect(tooSmall(199, 600, PHOTO_BOX.idol, 0.5)).toBe(true);
    expect(tooSmall(200, 250, PHOTO_BOX.idol, 0.5)).toBe(false);
  });
});

describe('webpInfo', () => {
  it('reads the size of real lossy, lossless and alpha WebP files', async () => {
    expect(webpInfo(await webpOf(400, 500))).toEqual({ width: 400, height: 500, animated: false });
    expect(webpInfo(await webpOf(96, 96, 'lossless'))).toEqual({ width: 96, height: 96, animated: false });
    expect(webpInfo(await webpOf(300, 120, 'alpha'))).toEqual({ width: 300, height: 120, animated: false });
  });

  it('refuses what is not a WebP: a PNG, a truncated header, a forged RIFF', async () => {
    expect(webpInfo(new TextEncoder().encode('\x89PNG\r\n\x1a\n0000000000000000000000000'))).toBeNull();
    expect(webpInfo((await webpOf(400, 500)).slice(0, 20))).toBeNull();
    const forged = new TextEncoder().encode('RIFF0000WEBPVP8 0000000000000000000000');
    expect(webpInfo(forged)).toBeNull();
  });
});

describe('slots', () => {
  it('has the eight tabs of the board, the 11 icons, the six image cards of the board then the home slots', () => {
    expect(tabOf('banners')).toBe('banners');
    expect(tabOf('nope')).toBe('idols');
    expect(ICON_SLOTS).toHaveLength(11);
    expect(IMAGE_SLOTS.slice(0, 6).map((s) => s.key)).toEqual(['banner:kpopdle', 'banner:otakudle', 'banner:daily', 'banner:otakudle/one-piece', 'home:kpopdle', 'home:otakudle']);
    // every slot of the home v3 has its site_assets key, lower case (022's key check)
    for (const k of HOME_ASSET_KEYS) {
      expect(IMAGE_SLOTS.some((s) => s.key === HOME_SLOT_KEY[k])).toBe(true);
      expect(HOME_SLOT_KEY[k]).toMatch(/^[a-z0-9][a-z0-9:/_-]{0,100}$/);
    }
    for (const s of IMAGE_SLOTS) expect(s.key).toMatch(/^[a-z0-9][a-z0-9:/_-]{0,100}$/);
  });

  it('keys a picture as 022 does: ids for the kpop kinds, the series slug, series/character', () => {
    expect(isPhotoSlug('idol', '12')).toBe(true);
    expect(isPhotoSlug('idol', '012')).toBe(false);
    expect(isPhotoSlug('group', 'bts')).toBe(false);
    expect(isPhotoSlug('series', 'one-piece')).toBe(true);
    expect(isPhotoSlug('character', 'one-piece/luffy')).toBe(true);
    expect(isPhotoSlug('character', 'one-piece')).toBe(false);
    expect(photoFolder('idol', '12')).toBe('kpop/idol/12');
    expect(photoFolder('character', 'one-piece/luffy')).toBe('anime/character/one-piece/luffy');
  });

  it('rebuilds stored settings from its lists only', () => {
    expect(parseIconSettings({ mode: 'icon', icon: 'idol', circle: true, color: 'k' })).toEqual({ mode: 'icon', icon: 'idol', circle: true, color: 'k' });
    expect(parseIconSettings({ mode: 'icon', icon: 'javascript:alert(1)', circle: true, color: 'k' })).toBeNull();
    expect(parseIconSettings({ mode: 'icon', icon: 'idol', circle: true, color: 'red' })).toBeNull();
    expect(parseStickerSettings({ side: 'left', x: 999, y: -5, w: 10, r: 90, o: 10, mirror: true, anim: 'yes' })).toEqual({ side: 'left', x: 220, y: 0, w: 60, r: 45, o: 30, mirror: true, anim: false });
    expect(parseStickerSettings({ side: 'top', x: 1, y: 1, w: 100, r: 0, o: 100 })).toBeNull();
    expect(parseFocal({ x: 120, y: 3 })).toEqual({ x: 50, y: 50 });
    expect(parseFocal({ x: 12.345, y: 3 })).toEqual({ x: 12.35, y: 3 });
  });
});

describe('validate', () => {
  it('accepts the known slots only', () => {
    expect(parseAssetSlot('banner:kpopdle')).toEqual({ key: 'banner:kpopdle', type: 'banner', page: 'kpopdle' });
    expect(parseAssetSlot('home:site-k')).toEqual({ key: 'home:site-k', type: 'card_image', page: 'home' });
    expect(parseAssetSlot('icon:k-idol')).toEqual({ key: 'icon:k-idol', type: 'icon', page: 'kpopdle' });
    expect(parseAssetSlot('sticker:daily:ab12cd34')).toEqual({ key: 'sticker:daily:ab12cd34', type: 'sticker', page: 'daily' });
    for (const bad of ['banner:other', 'sticker:quiz:ab12cd34', 'sticker:daily:AB', 'icon:nope', 42]) expect(() => parseAssetSlot(bad)).toThrow();
  });

  it('rebuilds the settings of a version from the lists', () => {
    expect(parseAssetSettings({ key: 'banner:daily', type: 'banner', page: 'daily' }, { focal: { x: 20, y: 80 }, evil: '<script>' })).toEqual({ focal: { x: 20, y: 80 } });
    expect(() => parseAssetSettings({ key: 'icon:hints', type: 'icon', page: 'kpopdle' }, { mode: 'icon', icon: 'x' })).toThrow();
  });

  it('takes a credit with a source page, except for an illustration of our own', () => {
    expect(parseAssetMeta({ source_url: '', author: 'Bunnyverse', license: 'own_photo' })).toEqual({ source_url: '', author: 'Bunnyverse', license: 'own_photo', license_note: null });
    expect(() => parseAssetMeta({ source_url: '', author: 'A', license: 'cc_by' })).toThrow();
    expect(() => parseAssetMeta({ source_url: 'http://x.org', author: 'A', license: 'cc_by' })).toThrow();
  });

  it('reads a target, a focal point and a publication date', () => {
    expect(parsePhotoTarget('idol', '5')).toEqual({ kind: 'idol', slug: '5' });
    expect(() => parsePhotoTarget('idol', 'abc')).toThrow();
    expect(() => parsePhotoTarget('quiz', '5')).toThrow();
    expect(parseFocalFields('25', '75')).toEqual({ x: 25, y: 75 });
    expect(() => parseFocalFields('101', '5')).toThrow();
    const now = new Date('2026-10-30T12:00:00Z');
    expect(parsePublish('now', now)).toBe('now');
    expect(parsePublish('draft', now)).toBeNull();
    expect(parsePublish('2026-11-02T08:00:00.000Z', now)).toEqual(new Date('2026-11-02T08:00:00.000Z'));
    expect(() => parsePublish('2026-10-01T08:00:00.000Z', now)).toThrow();
    expect(() => parsePublish('2030-01-01T00:00:00.000Z', now)).toThrow();
    expect(() => parsePublish('soon', now)).toThrow();
  });
});

describe('store: pictures of entities', () => {
  const seed = () => ({ idols: [{ id: 5, name: 'Idol' }], groups: [{ id: 2, name: 'G', site_id: 'kpop' }, { id: 3, name: 'S', site_id: 'anime' }], agencies: [{ id: 9, name: 'A' }], entity_images: [] });

  it('checks the exact sizes of the three files', async () => {
    const ok = await photoFiles(400, 500);
    expect(() => checkPhotoFiles('idol', ok)).not.toThrow();
    expect(() => checkPhotoFiles('idol', { ...ok, thumb: ok.x1 })).toThrow(/96 par 96/);
    expect(() => checkPhotoFiles('series', ok)).toThrow(/736 par 981/);
    expect(() => checkPhotoFiles('idol', { ...ok, x1: new Uint8Array([1, 2, 3]) })).toThrow(/WebP/);
  });

  it('knows the entity: an idol, a kpop group, an agency', async () => {
    const db = photosFakeDb(seed());
    await expect(assertPhotoEntity(db, 'idol', '5')).resolves.toBeUndefined();
    await expect(assertPhotoEntity(db, 'idol', '6')).rejects.toThrow(/n'existe pas/);
    await expect(assertPhotoEntity(db, 'group', '3')).rejects.toThrow(/n'existe pas/);
    await expect(assertPhotoEntity(db, 'agency', '9')).resolves.toBeUndefined();
  });

  it('stores the three files under their hash, then the row with its 96 px file and the box', async () => {
    const db = photosFakeDb(seed());
    const saved = await savePhoto(db, { kind: 'idol', slug: '5', files: await photoFiles(400, 500), meta: META, verified: true, focal: { x: 40, y: 30 }, userId: 'u-1' });
    expect(saved.path).toMatch(/^kpop\/idol\/5\/[0-9a-f]{16}\.webp$/);
    expect(saved.thumbPath).toBe(saved.path.replace('.webp', '-96.webp'));
    expect(saved.verified).toBe(true);
    expect([...db.files.keys()].sort()).toEqual([`entity-images/${saved.path}`, `entity-images/${saved.path.replace('.webp', '-2x.webp')}`, `entity-images/${saved.thumbPath}`].sort());
    expect(db.tables.entity_images![0]).toMatchObject({ site_id: 'kpop', kind: 'idol', slug: '5', width: 400, height: 500, focal_x: 40, focal_y: 30, license: 'cc_by_sa', license_verified: true, created_by: 'u-1' });
  });

  it('a new file replaces the old ones; no file changes the credit only; a row without a 96 px file is never verified', async () => {
    const db = photosFakeDb(seed());
    const first = await savePhoto(db, { kind: 'idol', slug: '5', files: await photoFiles(400, 500), meta: META, verified: false, focal: { x: 50, y: 50 }, userId: 'u-1' });
    const second = await savePhoto(db, { kind: 'idol', slug: '5', files: { x1: await webpOf(400, 500, 'lossless'), x2: await webpOf(800, 1000), thumb: await webpOf(96, 96) }, meta: META, verified: true, focal: { x: 50, y: 50 }, userId: 'u-1' });
    expect(second.path).not.toBe(first.path);
    expect(db.removed).toEqual([first.path, first.path.replace('.webp', '-2x.webp'), first.thumbPath]);
    await savePhoto(db, { kind: 'idol', slug: '5', files: null, meta: { ...META, author: 'New' }, verified: false, focal: { x: 10, y: 20 }, userId: 'u-1' });
    expect(db.tables.entity_images![0]).toMatchObject({ path: second.path, author: 'New', license_verified: false, focal_x: 10 });
    const old = photosFakeDb({ ...seed(), entity_images: [{ site_id: 'kpop', kind: 'idol', slug: '5', path: 'kpop/idol/5/x.webp', thumb_path: null }] });
    await expect(savePhoto(old, { kind: 'idol', slug: '5', files: null, meta: META, verified: true, focal: { x: 50, y: 50 }, userId: 'u-1' })).rejects.toThrow(/96 px/);
    await expect(savePhoto(photosFakeDb(seed()), { kind: 'idol', slug: '5', files: null, meta: META, verified: false, focal: { x: 50, y: 50 }, userId: 'u-1' })).rejects.toThrow(/Choisis une image/);
  });

  it('a refused row leaves no file behind', async () => {
    const db = photosFakeDb(seed());
    db.fail.insert = true;
    await expect(savePhoto(db, { kind: 'idol', slug: '5', files: await photoFiles(400, 500), meta: META, verified: true, focal: { x: 50, y: 50 }, userId: 'u-1' })).rejects.toThrow(/refusée/);
    expect(db.files.size).toBe(0);
    const up = photosFakeDb(seed());
    up.fail.upload = '-96';
    await expect(savePhoto(up, { kind: 'idol', slug: '5', files: await photoFiles(400, 500), meta: META, verified: true, focal: { x: 50, y: 50 }, userId: 'u-1' })).rejects.toThrow(/stockage/);
    expect(up.files.size).toBe(0);
  });
});

describe('store: removing a picture', () => {
  it('removes the row and its three files; a record with no picture says so', async () => {
    const db = photosFakeDb({ idols: [{ id: 5, name: 'Idol' }], entity_images: [] });
    const saved = await savePhoto(db, { kind: 'idol', slug: '5', files: await photoFiles(400, 500), meta: META, verified: true, focal: { x: 50, y: 50 }, userId: 'u-1' });
    expect(db.files.size).toBe(3);
    expect(await removePhoto(db, 'idol', '5')).toEqual({ kind: 'idol', slug: '5', files: 3 });
    expect(db.tables.entity_images).toEqual([]);
    expect(db.files.size).toBe(0);
    expect(db.removed).toEqual([saved.path, saved.path.replace('.webp', '-2x.webp'), saved.thumbPath]);
    await expect(removePhoto(db, 'idol', '5')).rejects.toThrow(/pas de photo/);
  });

  it('touches only the picture of that record (kind, site and slug)', async () => {
    const db = photosFakeDb({ entity_images: [
      { site_id: 'kpop', kind: 'group', slug: '5', path: 'kpop/group/5/a.webp', thumb_path: 'kpop/group/5/a-96.webp' },
      { site_id: 'kpop', kind: 'idol', slug: '5', path: 'kpop/idol/5/b.webp', thumb_path: null },
    ] });
    await removePhoto(db, 'idol', '5');
    expect(db.tables.entity_images).toEqual([expect.objectContaining({ kind: 'group', slug: '5' })]);
    expect(db.removed).toEqual(['kpop/idol/5/b.webp', 'kpop/idol/5/b-2x.webp']);
  });
});

describe('store: site assets', () => {
  const banner = { key: 'banner:kpopdle', type: 'banner' as const, page: 'kpopdle' };

  it('checks the sizes: large up to 1920, 400 and 96 the large one scaled', async () => {
    const files = { large: await webpOf(1920, 600), mid: await webpOf(400, 125), thumb: await webpOf(96, 30) };
    const wide = await webpOf(2000, 600);
    const tall = await webpOf(400, 300);
    const stk = { large: await webpOf(300, 300, 'alpha'), mid: null, thumb: await webpOf(96, 96, 'alpha') };
    const bigIcon = { large: await webpOf(500, 500), mid: null, thumb: await webpOf(96, 96) };
    expect(() => checkAssetFiles('banner', files)).not.toThrow();
    expect(() => checkAssetFiles('banner', { ...files, large: wide })).toThrow(/1920/);
    expect(() => checkAssetFiles('banner', { ...files, mid: tall })).toThrow(/400 par 125/);
    expect(() => checkAssetFiles('sticker', stk)).not.toThrow();
    expect(() => checkAssetFiles('icon', bigIcon)).toThrow(/400/);
  });

  it('adds a version per save; a picture is published only verified; a new version without files keeps the last files', async () => {
    const db = photosFakeDb({ site_assets: [] });
    const files = { large: await webpOf(1920, 600), mid: await webpOf(400, 125), thumb: await webpOf(96, 30) };
    await expect(saveAsset(db, { slot: banner, files, noFile: false, settings: { focal: { x: 50, y: 50 } }, meta: META, verified: false, publishAt: 'now', userId: 'u-1' })).rejects.toThrow(/licence vérifiée/);
    expect(db.files.size).toBe(0);
    await saveAsset(db, { slot: banner, files, noFile: false, settings: { focal: { x: 50, y: 50 } }, meta: META, verified: true, publishAt: 'now', userId: 'u-1' });
    const at = new Date('2026-12-01T10:00:00Z');
    await saveAsset(db, { slot: banner, files: null, noFile: false, settings: { focal: { x: 20, y: 50 } }, meta: META, verified: true, publishAt: at, userId: 'u-1' });
    const rows = db.tables.site_assets!;
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ path: rows[0]!.path, mid_path: rows[0]!.mid_path, published_at: at.toISOString(), settings: { focal: { x: 20, y: 50 } } });
    expect(String(rows[0]!.path)).toMatch(/^hub\/banner\/kpopdle\/[0-9a-f]{16}-1920\.webp$/);
    await expect(saveAsset(photosFakeDb({ site_assets: [] }), { slot: banner, files: null, noFile: false, settings: {}, meta: META, verified: true, publishAt: 'now', userId: 'u-1' })).rejects.toThrow(/Choisis une image/);
  });

  it('an icon or a sticker drawn as a PNG takes only our own illustration or a written permission, never a CC licence', async () => {
    const sticker = { key: 'sticker:daily:ab12cd34', type: 'sticker' as const, page: 'daily' };
    const icon = { key: 'icon:k-idol', type: 'icon' as const, page: 'kpopdle' };
    const stickerSettings = { side: 'left', x: 10, y: 200, w: 140, r: 0, o: 100, mirror: false, anim: true };
    const iconSettings = { mode: 'png', icon: 'star', circle: false, color: 'ink' };
    const small = async (): Promise<{ large: Uint8Array; mid: null; thumb: Uint8Array }> => ({ large: await webpOf(300, 300, 'alpha'), mid: null, thumb: await webpOf(96, 96, 'alpha') });
    for (const license of ['cc_by', 'cc_by_sa', 'cc0', 'public_domain', 'other'] as const) {
      const db = photosFakeDb({ site_assets: [] });
      const meta = { ...META, license, license_note: license === 'other' ? 'x' : null };
      await expect(saveAsset(db, { slot: sticker, files: await small(), noFile: false, settings: stickerSettings, meta, verified: true, publishAt: 'now', userId: 'u-1' }), license).rejects.toThrow(/Creative Commons/);
      await expect(saveAsset(db, { slot: icon, files: await small(), noFile: false, settings: iconSettings, meta, verified: true, publishAt: 'now', userId: 'u-1' }), license).rejects.toThrow(/Creative Commons/);
      expect(db.files.size, license).toBe(0);
      expect(db.tables.site_assets, license).toEqual([]);
    }
    const db = photosFakeDb({ site_assets: [] });
    await saveAsset(db, { slot: sticker, files: await small(), noFile: false, settings: stickerSettings, meta: { source_url: '', author: 'Bunnyverse', license: 'own_photo', license_note: null }, verified: true, publishAt: 'now', userId: 'u-1' });
    await saveAsset(db, { slot: icon, files: await small(), noFile: false, settings: iconSettings, meta: { ...META, license: 'licensed' }, verified: true, publishAt: 'now', userId: 'u-1' });
    expect(db.tables.site_assets!.map((r) => r.license)).toEqual(['own_photo', 'licensed']);
    // A banner keeps every licence of its form.
    const banner = photosFakeDb({ site_assets: [] });
    await saveAsset(banner, { slot: { key: 'banner:daily', type: 'banner', page: 'daily' }, files: { large: await webpOf(1920, 600), mid: await webpOf(400, 125), thumb: await webpOf(96, 30) }, noFile: false, settings: { focal: { x: 50, y: 50 } }, meta: { ...META, license: 'cc_by' }, verified: true, publishAt: 'now', userId: 'u-1' });
    expect(banner.tables.site_assets).toHaveLength(1);
  });

  it('an icon of the library has no file and no credit', async () => {
    const db = photosFakeDb({ site_assets: [] });
    await saveAsset(db, { slot: { key: 'icon:k-idol', type: 'icon', page: 'kpopdle' }, files: null, noFile: true, settings: { mode: 'icon', icon: 'star', circle: false, color: 'ink' }, meta: null, verified: false, publishAt: 'now', userId: 'u-1' });
    expect(db.tables.site_assets![0]).toMatchObject({ key: 'icon:k-idol', type: 'icon', path: null, author: null, license: null, license_verified: false });
  });

  it('retires every version of a key, and puts an old verified version back', async () => {
    const db = photosFakeDb({ site_assets: [
      { id: 1, key: 'sticker:home:abcdef12', path: 'hub/sticker/home/abcdef12/a-400.webp', license_verified: true, retired_at: null },
      { id: 2, key: 'banner:daily', path: 'hub/banner/daily/a-1920.webp', license_verified: true, retired_at: null, published_at: '2026-10-01T00:00:00Z' },
      { id: 3, key: 'banner:daily', path: 'hub/banner/daily/b-1920.webp', license_verified: false, retired_at: null, published_at: null },
    ] });
    expect(await retireAsset(db, 'sticker:home:abcdef12')).toEqual({ retired: 1, files: 1 });
    expect(db.tables.site_assets![0]!.retired_at).toEqual(expect.any(String));
    expect(db.removed).toEqual(['hub/sticker/home/abcdef12/a-400.webp']);
    await restoreAsset(db, 2);
    expect(Date.parse(String(db.tables.site_assets![1]!.published_at))).toBeGreaterThan(Date.parse('2026-10-30T00:00:00Z'));
    await expect(restoreAsset(db, 3)).rejects.toThrow(/licence vérifiée/);
    await expect(restoreAsset(db, 1)).rejects.toThrow(/retirée/);
  });
});

describe('store: the files of a retired version', () => {
  it('leave the bucket with the retired rows; a file a version still on the site names stays; never a file of another key', async () => {
    const db = photosFakeDb({ site_assets: [] });
    const sticker = { key: 'sticker:daily:ab12cd34', type: 'sticker' as const, page: 'daily' };
    const own = { source_url: '', author: 'Bunnyverse', license: 'own_photo' as const, license_note: null };
    const settings = { side: 'left', x: 10, y: 200, w: 140, r: 0, o: 100, mirror: false, anim: true };
    await saveAsset(db, { slot: sticker, files: { large: await webpOf(300, 300, 'alpha'), mid: null, thumb: await webpOf(96, 96, 'alpha') }, noFile: false, settings, meta: own, verified: true, publishAt: 'now', userId: 'u-1' });
    // A second version without files reuses the first one's files.
    await saveAsset(db, { slot: sticker, files: null, noFile: false, settings: { ...settings, x: 20 }, meta: own, verified: true, publishAt: 'now', userId: 'u-1' });
    expect(db.files.size).toBe(2);
    const shared = String(db.tables.site_assets![0]!.path);
    expect(db.tables.site_assets![1]!.path).toBe(shared);
    // A stray row of another key that names the same file is never a reason to remove a file outside the retired key's folder.
    db.tables.site_assets!.push({ id: 99, key: 'sticker:home:zz99zz99', path: 'hub/sticker/home/zz99zz99/x-400.webp', mid_path: null, thumb_path: null, retired_at: null });
    db.files.set('entity-images/hub/sticker/home/zz99zz99/x-400.webp', 1);
    expect(await retireAsset(db, sticker.key)).toEqual({ retired: 2, files: 2 });
    expect([...db.files.keys()]).toEqual(['entity-images/hub/sticker/home/zz99zz99/x-400.webp']);
    expect(db.tables.site_assets!.filter((r) => r.key === sticker.key).every((r) => typeof r.retired_at === 'string')).toBe(true);
  });

  it('keeps a file that a row of the key saved meanwhile (not retired) still names', async () => {
    const db = photosFakeDb({ site_assets: [
      { id: 1, key: 'banner:daily', path: 'hub/banner/daily/a-1920.webp', mid_path: 'hub/banner/daily/a-400m.webp', thumb_path: 'hub/banner/daily/a-96t.webp', retired_at: null },
    ] });
    // The read of the rows still on the site answers a version that reuses the 1920 file (a save between the two statements).
    const from = db.from.bind(db);
    let reads = 0;
    (db as { from: (t: string) => unknown }).from = (t: string) => {
      const q = from(t) as Record<string, unknown>;
      const select = q.select as (c?: string) => unknown;
      q.select = (c?: string) => {
        if (c === 'path, mid_path, thumb_path' && (reads += 1) === 2) db.tables.site_assets!.push({ id: 2, key: 'banner:daily', path: 'hub/banner/daily/a-1920.webp', mid_path: null, thumb_path: null, retired_at: null });
        return select(c);
      };
      return q;
    };
    expect(await retireAsset(db, 'banner:daily')).toEqual({ retired: 1, files: 2 });
    expect(db.removed.sort()).toEqual(['hub/banner/daily/a-400m.webp', 'hub/banner/daily/a-96t.webp']);
  });
});

describe('public reads', () => {
  const live = {
    key: 'home:site-k', type: 'card_image', page: 'home', settings: { focal: { x: 30, y: 60 } }, path: 'hub/home/site-k/a-1920.webp', mid_path: 'hub/home/site-k/a-400m.webp',
    thumb_path: 'hub/home/site-k/a-96t.webp', width: 1920, height: 1280, source_url: 'https://commons.wikimedia.org/x', author: 'A', license: 'cc_by', license_note: null, published_at: '2026-10-30T00:00:00Z',
  };

  it('checks every stored value before it reaches a page', () => {
    expect(toLiveAsset(live)?.large).toMatch(/\/storage\/v1\/object\/public\/entity-images\/hub\/home\/site-k\/a-1920\.webp$/);
    expect(toLiveAsset({ ...live, path: 'javascript:alert(1)' })).toBeNull();
    expect(toLiveAsset({ ...live, path: 'hub/../x.webp' })).toBeNull();
    expect(toLiveAsset({ ...live, type: 'video' })).toBeNull();
    expect(toLiveAsset({ ...live, license: 'stolen' })).toBeNull();
    expect(toLiveAsset({ ...live, source_url: 'javascript:alert(1)' })?.sourceUrl).toBeNull();
    expect(toLiveAsset({ ...live, path: null, mid_path: null, thumb_path: null, type: 'icon', license: null, author: null })?.large).toBeNull();
    const pic = { site_id: 'kpop', kind: 'idol', slug: '5', path: 'kpop/idol/5/a.webp', thumb_path: 'kpop/idol/5/a-96.webp', focal_x: '40', focal_y: 30, source_url: 'https://commons.wikimedia.org/y', author: 'B', license: 'cc0', license_note: ' ', updated_at: '2026-10-30T00:00:00Z', name: 'Idol' };
    expect(toPublicPicture(pic)).toMatchObject({ kind: 'idol', name: 'Idol', position: '40% 30%', license: 'cc0' });
    expect(toPublicPicture({ ...pic, source_url: 'http://insecure.org' })).toBeNull();
  });

  it('reads the two views of 022 only, and throws when a view is missing (the caller answers nothing)', async () => {
    const db = photosFakeDb({ site_assets_public: [live], entity_images_public: [] });
    expect(await loadLiveAssets(db)).toHaveLength(1);
    expect(await loadPublicPictures(db)).toEqual([]);
    await expect(loadLiveAssets(photosFakeDb({}, ['site_assets_public']))).rejects.toThrow(/does not exist/);
    // a missing view is told apart from a blip: only the first is an answer the cache may keep
    expect(isMissingView(new Error("fetchAllRows: Could not find the table 'public.site_assets_public' in the schema cache"))).toBe(true);
    expect(isMissingView(new Error('fetchAllRows: TypeError: fetch failed'))).toBe(false);
  });
});
