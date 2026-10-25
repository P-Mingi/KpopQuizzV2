// Run O1, lot H2a: what compare.mjs and interact.mjs share: the blocks of a page and the pixel diff of two screenshots.
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

// the blocks of a page, in order: the header, the sections of the main column, the footer (the design wraps main in no landmark of its own)
export async function blocks(page, isDesign) {
  const handles = await page.evaluate((design) => {
    const pick = [];
    const mark = (el, name) => { el.setAttribute('data-cmp', name); pick.push(name); };
    const header = document.querySelector('header'); if (header) mark(header, 'bar');
    // the Main board has a <main>; the Mobile board has its sections straight in its one wrapper
    const main = design ? (document.querySelector('main') ?? document.querySelector('x-dc > div')) : document.querySelector('main#main');
    const names = ['hero', 'today', 'quick', 'hot', 'you', 'crossover', 'community'];
    const kids = [...main.children].filter((c) => c.tagName === 'SECTION');
    kids.forEach((c, i) => mark(c, names[i] ?? `s${i}`));
    const footer = document.querySelector('footer'); if (footer) mark(footer, 'footer');
    return pick;
  }, isDesign);
  return handles;
}

export async function shotBlocks(page, dir, prefix, isDesign) {
  const names = await blocks(page, isDesign);
  const files = {};
  for (const n of names) {
    const el = page.locator(`[data-cmp="${n}"]`).first();
    const f = join(dir, `${prefix}-${n}.png`);
    await el.screenshot({ path: f });
    files[n] = f;
  }
  return files;
}

export async function diff(a, b, outFile) {
  const A = await sharp(a).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = Math.max(A.info.width, B.info.width);
  const h = Math.max(A.info.height, B.info.height);
  const px = (img, x, y) => (x < img.info.width && y < img.info.height ? img.data.subarray((y * img.info.width + x) * 4, (y * img.info.width + x) * 4 + 4) : null);
  const outBuf = Buffer.alloc(w * h * 4);
  let bad = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = px(A, x, y), q = px(B, x, y);
    const o = (y * w + x) * 4;
    let d = !p || !q;
    if (p && q) for (let c = 0; c < 3; c++) if (Math.abs(p[c] - q[c]) > 24) d = true;
    if (d) { bad++; outBuf[o] = 255; outBuf[o + 1] = 0; outBuf[o + 2] = 0; outBuf[o + 3] = 255; }
    else { const g = p ? p[0] : 255; outBuf[o] = g; outBuf[o + 1] = g; outBuf[o + 2] = g; outBuf[o + 3] = 90; }
  }
  await sharp(outBuf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(outFile);
  return { bad, total: w * h, da: `${A.info.width}x${A.info.height}`, db: `${B.info.width}x${B.info.height}` };
}

