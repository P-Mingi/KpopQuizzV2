// Lane F (owner, 2026-11-01): the icon Google shows for kpopquiz.org. A full square in the KpopQuiz pink, no transparency, no rounded corner, the
// white rabbit inside the circle Google cuts. kpopquiz.org keeps its addresses (rewrites to public/brand/kpop/); anime and hub keep their bytes.
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HUB_WORDMARK_TAIL } from './brand';
import { KPOP_ICON_FILES, kpopIconRewrites, rewritesFor } from './routing';

const PUBLIC = fileURLToPath(new URL('../../../public/', import.meta.url));
const KPOP = join(PUBLIC, 'brand', 'kpop');
const PINK = [0xd1, 0x3a, 0x6e];
const PNGS: readonly (readonly [string, number])[] = [
  ['favicon-16x16.png', 16], ['favicon-32x32.png', 32], ['apple-touch-icon.png', 180],
  ['android-chrome-192x192.png', 192], ['android-chrome-512x512.png', 512],
];
const ICO_SIZES = [16, 32, 48, 96, 144];

/** Width, height and colour type of a PNG, from its IHDR (type 2 is RGB: no alpha channel, and no tRNS chunk may add one). */
function ihdr(png: Buffer): { width: number; height: number; colorType: number; tRNS: boolean } {
  expect(png.subarray(1, 4).toString()).toBe('PNG');
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20), colorType: png[25]!, tRNS: png.includes(Buffer.from('tRNS')) };
}

function icoImages(ico: Buffer): { size: number; png: Buffer }[] {
  expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]);
  return Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
    const e = 6 + 16 * i;
    return { size: ico[e]!, png: ico.subarray(ico.readUInt32LE(e + 12), ico.readUInt32LE(e + 12) + ico.readUInt32LE(e + 8)) };
  });
}

describe('the icon files of kpopquiz.org', () => {
  it('the pink is the pink of the Bunnyverse tile', () => {
    expect(`#${PINK.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`).toBe(HUB_WORDMARK_TAIL);
    expect(readFileSync(fileURLToPath(new URL('../../styles/sites/hub/h2.css', import.meta.url)), 'utf8')).toContain('--hub-k: #D13A6E;');
  });

  it.each(PNGS)('%s is exactly %i px, RGB with no alpha', (file, size) => {
    expect(ihdr(readFileSync(join(KPOP, file)))).toEqual({ width: size, height: size, colorType: 2, tRNS: false });
  });

  it('favicon.ico holds 16, 32, 48, 96 and 144 px, each RGB with no alpha, and stays small', () => {
    const ico = readFileSync(join(KPOP, 'favicon.ico'));
    const images = icoImages(ico);
    expect(images.map((x) => x.size)).toEqual(ICO_SIZES);
    for (const { size, png } of images) expect(ihdr(png)).toEqual({ width: size, height: size, colorType: 2, tRNS: false });
    expect(ico.length).toBeLessThan(30_000);
  });

  it('favicon.svg is the opaque picture, in a square', () => {
    const svg = readFileSync(join(KPOP, 'favicon.svg'), 'utf8');
    expect(svg).toContain('viewBox="0 0 128 128"');
    const png = Buffer.from(/base64,([^"]+)"/.exec(svg)![1]!, 'base64');
    expect(ihdr(png)).toEqual({ width: 128, height: 128, colorType: 2, tRNS: false });
  });

  it.each(PNGS)('%s: all four corners are the exact pink (no rounded corner)', async (file, size) => {
    const { data } = await sharp(join(KPOP, file)).raw().toBuffer({ resolveWithObject: true });
    for (const [x, y] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]] as const) {
      expect([...data.subarray((y * size + x) * 3, (y * size + x) * 3 + 3)], `${x},${y}`).toEqual(PINK);
    }
  });

  it('512 px: the white rabbit is there, centred, and inside the circle with room (nothing but pink beyond 42% of the side)', async () => {
    const size = 512;
    const { data } = await sharp(join(KPOP, 'android-chrome-512x512.png')).raw().toBuffer({ resolveWithObject: true });
    let white = 0, x0 = size, x1 = 0, y0 = size, y1 = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const p = data.subarray((y * size + x) * 3, (y * size + x) * 3 + 3);
        const isPink = Math.abs(p[0]! - PINK[0]!) + Math.abs(p[1]! - PINK[1]!) + Math.abs(p[2]! - PINK[2]!) <= 6;
        if (p[0] === 255 && p[1] === 255 && p[2] === 255) white++;
        if (isPink) continue;
        expect(Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2), `${x},${y}`).toBeLessThanOrEqual(0.42 * size);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
    expect(white).toBeGreaterThan(size * size * 0.15);
    expect(Math.abs((x0 + x1) / 2 - (size - 1) / 2)).toBeLessThanOrEqual(3);
    expect(Math.abs((y0 + y1) / 2 - (size - 1) / 2)).toBeLessThanOrEqual(3);
  });

  it('the manifest lists 192 and 512 at their root addresses, any and maskable, every address a rewritten icon', () => {
    const m = JSON.parse(readFileSync(join(PUBLIC, 'site.webmanifest'), 'utf8')) as { icons: { src: string; sizes: string; type: string; purpose: string }[] };
    expect(m.icons.map((i) => `${i.src} ${i.sizes} ${i.type} ${i.purpose}`).sort()).toEqual([
      '/android-chrome-192x192.png 192x192 image/png any',
      '/android-chrome-192x192.png 192x192 image/png maskable',
      '/android-chrome-512x512.png 512x512 image/png any',
      '/android-chrome-512x512.png 512x512 image/png maskable',
    ]);
    for (const i of m.icons) expect(KPOP_ICON_FILES).toContain(i.src);
  });
});

describe('the addresses', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  async function beforeFiles(site: 'kpop' | 'anime' | 'hub'): Promise<{ source: string; destination: string }[]> {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', site === 'kpop' ? '' : site);
    vi.stubEnv('SITE_ID', '');
    const config = (await import('../../../next.config')).default;
    return ((await config.rewrites!()) as { beforeFiles: { source: string; destination: string }[] }).beforeFiles;
  }

  it('every icon has its file in public/brand/kpop and keeps its root address', () => {
    for (const r of kpopIconRewrites()) {
      expect(r.destination).toBe(`/brand/kpop${r.source}`);
      expect(statSync(join(PUBLIC, r.destination)).isFile(), r.destination).toBe(true);
      expect(statSync(join(PUBLIC, r.source)).isFile(), r.source).toBe(true);
    }
    expect(rewritesFor('kpop')).toEqual([]);
  });

  it('the kpop build answers its icons from public/brand/kpop', async () => {
    const before = await beforeFiles('kpop');
    for (const r of kpopIconRewrites()) expect(before).toContainEqual(r);
  });

  it.each(['anime', 'hub'] as const)('%s never answers a root icon from public/brand/kpop', async (site) => {
    const before = await beforeFiles(site);
    expect(before.filter((r) => r.destination.includes('/brand/kpop'))).toEqual([]);
    for (const f of KPOP_ICON_FILES) expect(before).toContainEqual({ source: f, destination: `/brand/${site}${f}` });
  });
});

describe('anime and hub keep their icons, byte for byte', () => {
  // sha256 of the files on origin/main (3c10df8) before this change. The root files are what the copies of anime and hub equal (routing.test.ts, D-099).
  const BEFORE: Readonly<Record<string, string>> = {
    '/favicon.ico': '673bdd5159c3f99943291562c0b30cde692c4112a91b0597b89850739c0b497b',
    '/favicon.svg': '1ca06d267058f28d784acd01ea9ea3ea007422a4eb34b00ed7c2fa56e4a692dc',
    '/favicon-16x16.png': '744655bc1eeeadc64fb4641a5b514f7d6f39b797dc1d76ccde5887b1d7474c27',
    '/favicon-32x32.png': '76aaa0c20c88e36608e22d673183464efac71528cb6d33b131cd567bb8bc4def',
    '/apple-touch-icon.png': '3922548732af315bb3bd05327583a2b128d521872facb7b5d62a6ff54afa444b',
    '/android-chrome-192x192.png': '40598a1a975909e76a02f2bb39e169669e8a8e3d81e8e4c9375da8b19f73a855',
    '/android-chrome-512x512.png': '45bcb4858a65e083269050f7a31d801909c138a30d86564f9caa9b65b84deedf',
  };
  const MANIFESTS = {
    anime: 'c600c65f81e82a64c93d66725439b11b0de5ce78bc6f6bcf14af4e7b60713751',
    hub: 'a45f1d1c1be0ef1824cc739c349ad51a05ae371e27e52c9cc0b62c7e70a5b099',
  } as const;
  const sha = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');

  it.each(['anime', 'hub'] as const)('%s', (site) => {
    expect(Object.keys(BEFORE).sort()).toEqual([...KPOP_ICON_FILES].sort());
    for (const [file, hash] of Object.entries(BEFORE)) {
      expect(sha(join(PUBLIC, 'brand', site, file)), file).toBe(hash);
      expect(sha(join(PUBLIC, file)), `root ${file}`).toBe(hash);
    }
    expect(sha(join(PUBLIC, 'brand', site, 'site.webmanifest'))).toBe(MANIFESTS[site]);
  });
});
