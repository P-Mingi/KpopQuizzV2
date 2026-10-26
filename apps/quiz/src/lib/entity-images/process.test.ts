import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { MAX_SOURCE_BYTES, SIZES } from './constants';
import { ImageError } from './errors';
import { processImage } from './process';
import { makeImage } from './test-support';

async function codeOf(p: Promise<unknown>): Promise<string> {
  try { await p; } catch (e) { return e instanceof ImageError ? e.code : 'other'; }
  return 'none';
}

describe('processImage output', () => {
  it('a cover is WebP at 736x981 and 1472x1962', async () => {
    const out = await processImage(await makeImage(2000, 1500), 'series');
    const m1 = await sharp(out.x1).metadata();
    const m2 = await sharp(out.x2).metadata();
    expect([m1.format, m1.width, m1.height]).toEqual(['webp', 736, 981]);
    expect([m2.format, m2.width, m2.height]).toEqual(['webp', 1472, 1962]);
    expect([out.width, out.height]).toEqual([SIZES.series.x1.w, SIZES.series.x1.h]);
  });

  it('a portrait is WebP at 360x480 and 720x960', async () => {
    const out = await processImage(await makeImage(900, 1200, 'png'), 'character');
    const m1 = await sharp(out.x1).metadata();
    const m2 = await sharp(out.x2).metadata();
    expect([m1.format, m1.width, m1.height]).toEqual(['webp', 360, 480]);
    expect([m2.format, m2.width, m2.height]).toEqual(['webp', 720, 960]);
  });

  it('strips EXIF (the input had it) and every other metadata', async () => {
    const input = await makeImage(1000, 1400, 'jpeg');
    expect((await sharp(input).metadata()).exif).toBeDefined();
    expect(input.includes(Buffer.from('secret-owner'))).toBe(true);
    const out = await processImage(input, 'series');
    for (const file of [out.x1, out.x2]) {
      const m = await sharp(file).metadata();
      expect(m.exif).toBeUndefined();
      expect(m.xmp).toBeUndefined();
      expect(m.icc).toBeUndefined();
      expect(file.includes(Buffer.from('secret-owner'))).toBe(false);
      expect(file.includes(Buffer.from('secret-artist'))).toBe(false);
      expect(file.includes(Buffer.from('Exif'))).toBe(false);
    }
  });

  it('applies the EXIF orientation before the crop, then drops it', async () => {
    // 1400 wide by 1000 high with orientation 6 (rotate 90): the picture is really 1000 by 1400.
    const input = await makeImage(1400, 1000, 'jpeg', 6);
    const out = await processImage(input, 'series');
    expect((await sharp(out.x1).metadata()).orientation).toBeUndefined();
  });

  it('is deterministic: same input, same hash; different input, different hash', async () => {
    const a = await makeImage(1000, 1400, 'png');
    const b = await sharp({ create: { width: 1000, height: 1400, channels: 3, background: { r: 1, g: 2, b: 3 } } }).png().toBuffer();
    expect((await processImage(a, 'series')).hash).toBe((await processImage(a, 'series')).hash);
    expect((await processImage(a, 'series')).hash).not.toBe((await processImage(b, 'series')).hash);
    expect((await processImage(a, 'series')).hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('enlarges a source that is smaller than the box but not tiny', async () => {
    const out = await processImage(await makeImage(500, 700, 'png'), 'series');
    expect((await sharp(out.x2).metadata()).width).toBe(1472);
  });
});

describe('processImage refusals', () => {
  it('refuses an empty file', async () => expect(await codeOf(processImage(new Uint8Array(), 'series'))).toBe('invalid_image'));

  it('refuses a source over 8 MB before decoding it', async () => {
    const big = new Uint8Array(MAX_SOURCE_BYTES + 1);
    big.set([0xff, 0xd8, 0xff, 0xe0]);
    expect(await codeOf(processImage(big, 'series'))).toBe('too_large');
  });

  it('accepts exactly the cap size only if it decodes (a non-image of 8 MB is unsupported, not too large)', async () => {
    expect(await codeOf(processImage(new Uint8Array(MAX_SOURCE_BYTES), 'series'))).toBe('unsupported_type');
  });

  it('judges the file by its bytes, not by what it is called or claims to be', async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><script>alert(1)</script></svg>');
    expect(await codeOf(processImage(svg, 'series'))).toBe('unsupported_type');
    expect(await codeOf(processImage(new TextEncoder().encode('<html>not a picture</html>'), 'series'))).toBe('unsupported_type');
    // A real picture is accepted whatever its name was (the function never sees a name).
    expect(await codeOf(processImage(await makeImage(900, 1200, 'png'), 'series'))).toBe('none');
  });

  it('refuses bytes that start like a JPEG but do not decode', async () => {
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]), Buffer.alloc(200, 7)]);
    expect(await codeOf(processImage(broken, 'series'))).toBe('invalid_image');
  });

  it('refuses a picture under half of the box in either side', async () => {
    expect(await codeOf(processImage(await makeImage(300, 2000, 'png'), 'series'))).toBe('image_too_small');
    expect(await codeOf(processImage(await makeImage(2000, 300, 'png'), 'series'))).toBe('image_too_small');
    expect(await codeOf(processImage(await makeImage(100, 140, 'png'), 'character'))).toBe('image_too_small');
  });

  it('refuses a decompression bomb by pixel count', async () => {
    const huge = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: '#fff' } }).png({ compressionLevel: 9 }).toBuffer();
    expect(huge.length).toBeLessThan(MAX_SOURCE_BYTES);
    expect(await codeOf(processImage(huge, 'series'))).toBe('invalid_image');
  });
});
