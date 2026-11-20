// Lane PHOTOCHECK (2026-11-17): the cutter reads a photo upright. 26 published crops were turned because their Commons originals carry an
// EXIF Orientation tag and the cutter cut the raw pixels. Proved on made pictures: a photo stored on its side with Orientation 6 (or turned
// over with 3) is cut as it is seen, at the size the database holds (the oriented one); a photo without the tag is cut exactly as before.
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { cutImage, orientedSize } from '../../../scripts/cards/card-cut.mjs';
import { cutPlan } from '../../../scripts/cards/card-files.mjs';

/** A picture seen as `w` x `h`: its top half red, its bottom half blue. Stored as it is seen (no tag), or stored turned with the tag that
 *  turns it back (6: stored turned 90 degrees anticlockwise, shown turned clockwise; 3: stored upside down). */
async function picture(w: number, h: number, orientation: 1 | 3 | 6): Promise<Buffer> {
  const px = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 3; if (y < h / 2) px[i] = 230; else px[i + 2] = 230; }
  let img = sharp(px, { raw: { width: w, height: h, channels: 3 } });
  if (orientation === 6) img = sharp(await img.rotate(-90).raw().toBuffer(), { raw: { width: h, height: w, channels: 3 } });
  if (orientation === 3) img = sharp(await img.rotate(180).raw().toBuffer(), { raw: { width: w, height: h, channels: 3 } });
  return img.jpeg({ quality: 95 }).withMetadata({ orientation }).toBuffer();
}
/** The mean red and blue of the top and the bottom tenth of a WebP card file. */
async function bands(file: Buffer): Promise<{ top: [number, number]; bottom: [number, number] }> {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const band = (y0: number, y1: number): [number, number] => {
    let r = 0, b = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = 0; x < info.width; x++) { const i = (y * info.width + x) * 3; r += data[i]!; b += data[i + 2]!; n++; }
    return [r / n, b / n];
  };
  const t = Math.floor(info.height / 10);
  return { top: band(0, t), bottom: band(info.height - t, info.height) };
}

describe('the cutter reads the photo upright', () => {
  it('orientedSize: the size of the photo as it is seen', async () => {
    expect(orientedSize({ width: 1500, height: 1000, autoOrient: { width: 1000, height: 1500 } })).toEqual({ width: 1000, height: 1500 });
    expect(orientedSize({ width: 1500, height: 1000 })).toEqual({ width: 1500, height: 1000 });
    const m = await sharp(await picture(1000, 1500, 6)).metadata();
    expect([m.width, m.height]).toEqual([1500, 1000]);
    expect(orientedSize(m)).toEqual({ width: 1000, height: 1500 });
  });

  for (const orientation of [1, 3, 6] as const) {
    it(`a person stored with Orientation ${orientation} is cut upright, at the window of the size the database holds`, async () => {
      const src = await picture(1000, 1500, orientation);
      const out = await cutImage(sharp, src, false, 50, 30);
      expect(out.window).toEqual(cutPlan(false, 1000, 1500, 50, 30).window);
      const f = out.parts[0]!.files as Record<string, Buffer>;
      const m = await sharp(f['1x']!).metadata();
      expect([m.width, m.height]).toEqual([320, 495]);
      const b = await bands(f['1x']!);
      expect(b.top[0]).toBeGreaterThan(150); // red on top
      expect(b.top[1]).toBeLessThan(80);
      expect(b.bottom[1]).toBeGreaterThan(150); // blue at the bottom
      expect(b.bottom[0]).toBeLessThan(80);
    });
  }

  it('a group stored with Orientation 6 gives its parts and its panorama upright', async () => {
    const src = await picture(3300, 1700, 6);
    const out = await cutImage(sharp, src, true, 50, 50, 3);
    expect(out.window).toEqual(cutPlan(true, 3300, 1700, 50, 50, 3).window);
    expect(out.parts.map((p) => p.part)).toEqual([1, 2, 3]);
    for (const p of out.parts) {
      const b = await bands((p.files as Record<string, Buffer>)['1x']!);
      expect(b.top[0]).toBeGreaterThan(150);
      expect(b.bottom[1]).toBeGreaterThan(150);
    }
    const pano = await bands((out.pano!.files as Record<string, Buffer>)['1x']!);
    expect(pano.top[0]).toBeGreaterThan(150);
    expect(pano.bottom[1]).toBeGreaterThan(150);
  });

  it('a photo without the tag is cut exactly as before (the raw pixels, the stored size)', async () => {
    const src = await picture(1200, 1800, 1);
    const out = await cutImage(sharp, src, false, 40, 20);
    const box = cutPlan(false, 1200, 1800, 40, 20).window;
    const before = await sharp(src).extract({ left: box.left, top: box.top, width: box.width, height: box.height }).resize(320, 495, { fit: 'cover' }).webp({ quality: 82 }).toBuffer();
    expect(Buffer.compare((out.parts[0]!.files as Record<string, Buffer>)['1x']!, before)).toBe(0);
  });
});
