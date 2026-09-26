import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { checkHeaderFile, HEADER_H, HEADER_MAX_BYTES, HEADER_W, renderHeader, sniffImage } from './header-image';

// File checks of the header upload route: declared type, size, sniffed bytes, and
// the sharp re-encode (1500 x 300 WebP, metadata dropped).

async function img(format: 'jpeg' | 'png' | 'webp' | 'gif', w = 800, h = 600): Promise<Buffer> {
  const base = sharp({ create: { width: w, height: h, channels: 3, background: { r: 232, g: 69, b: 122 } } });
  return format === 'jpeg' ? base.jpeg().toBuffer() : format === 'png' ? base.png().toBuffer() : format === 'webp' ? base.webp().toBuffer() : base.gif().toBuffer();
}

describe('sniffImage', () => {
  it('recognises JPEG, PNG and WebP magic bytes', async () => {
    expect(sniffImage(await img('jpeg'))).toBe('jpeg');
    expect(sniffImage(await img('png'))).toBe('png');
    expect(sniffImage(await img('webp'))).toBe('webp');
  });
  it('refuses GIF, SVG, HTML and short input', async () => {
    expect(sniffImage(await img('gif'))).toBeNull();
    expect(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniffImage(Buffer.from('<!doctype html><html>'))).toBeNull();
    expect(sniffImage(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});

describe('checkHeaderFile', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  it('accepts a PNG under 5 MB', () => expect(checkHeaderFile({ type: 'image/png', size: 1000 }, png)).toEqual({ ok: true, kind: 'png' }));
  it('refuses empty files', () => expect(checkHeaderFile({ type: 'image/png', size: 0 }, png)).toMatchObject({ ok: false, status: 400 }));
  it('refuses files over 5 MB', () => expect(checkHeaderFile({ type: 'image/png', size: HEADER_MAX_BYTES + 1 }, png)).toMatchObject({ ok: false, status: 413 }));
  it('accepts exactly 5 MB', () => expect(checkHeaderFile({ type: 'image/png', size: HEADER_MAX_BYTES }, png).ok).toBe(true));
  it.each(['image/gif', 'image/svg+xml', 'text/html', 'application/pdf'])('refuses declared type %s', (type) =>
    expect(checkHeaderFile({ type, size: 10 }, png)).toMatchObject({ ok: false, status: 415 }));
  it('refuses bytes that are not an image even when the declared type says PNG', () =>
    expect(checkHeaderFile({ type: 'image/png', size: 10 }, Buffer.from('<svg onload=alert(1)>'))).toMatchObject({ ok: false, status: 415 }));
});

describe('renderHeader', () => {
  it.each(['jpeg', 'png', 'webp'] as const)('re-encodes a %s into a 1500 x 300 WebP', async (f) => {
    const r = await renderHeader(await img(f, 2400, 1600));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect([r.width, r.height]).toEqual([HEADER_W, HEADER_H]);
    const meta = await sharp(r.out).metadata();
    expect(meta.format).toBe('webp');
    expect([meta.width, meta.height]).toEqual([HEADER_W, HEADER_H]);
    expect(meta.exif).toBeUndefined();
  });
  it('crops a small image up to the header size', async () => {
    const r = await renderHeader(await img('png', 300, 200));
    expect(r.ok && [r.width, r.height]).toEqual([HEADER_W, HEADER_H]);
  });
  it('drops EXIF metadata', async () => {
    const withExif = await sharp({ create: { width: 900, height: 400, channels: 3, background: '#fff' } })
      .jpeg().withExif({ IFD0: { Copyright: 'someone', ImageDescription: 'secret gps' } }).toBuffer();
    expect((await sharp(withExif).metadata()).exif).toBeDefined();
    const r = await renderHeader(withExif);
    expect(r.ok).toBe(true);
    if (r.ok) expect((await sharp(r.out).metadata()).exif).toBeUndefined();
  });
  it('refuses a GIF and garbage with the right status', async () => {
    expect(await renderHeader(await img('gif'))).toMatchObject({ ok: false, status: 415 });
    expect(await renderHeader(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02]))).toMatchObject({ ok: false, status: 422 });
  });
  it('refuses a PNG whose header claims a gigantic canvas (decompression bomb)', async () => {
    // valid PNG signature + IHDR claiming 20000 x 20000 (400 MP) and nothing else
    const ihdr = Buffer.alloc(25);
    ihdr.writeUInt32BE(13, 0); ihdr.write('IHDR', 4, 'ascii'); ihdr.writeUInt32BE(20000, 8); ihdr.writeUInt32BE(20000, 12);
    ihdr[16] = 8; ihdr[17] = 2;
    const bomb = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ihdr]);
    expect(await renderHeader(bomb)).toMatchObject({ ok: false });
  });
});
