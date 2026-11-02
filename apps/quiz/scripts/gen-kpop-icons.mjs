// The icons of kpopquiz.org (owner brief, Lane F): a full square in the KpopQuiz pink, no rounded corner and no transparency (Google cuts it to
// a circle itself), the rabbit in white in the middle, as the white rabbit on the pink tile of the Bunnyverse doors drew it (home v2,
// e2e/o1/H1/H2a/rabbit-white.mjs; the pink is --hub-k of styles/sites/hub/h2.css, 'pink-fill' of lib/design-tokens.ts).
// The rabbit comes from public/rabbit-source.webp (1024 px, no vector exists; public/mascot/mascot-default.png is the same art at 128 px): how
// dark a pixel is becomes how white it is, and only the rabbit is kept (its two stars stay, the two loose sparkles of the source go, as on the mascot).
// Its bounding box is centred and its farthest pixel sits 40% of the side from the centre: a margin in the inscribed circle, and the safe zone of a maskable icon.
//
// Writes public/brand/kpop/, served at the root addresses by kpopIconRewrites (lib/site/routing.ts). The root files stay the files of anime and hub (D-099).
//   node apps/quiz/scripts/gen-kpop-icons.mjs           writes the files
//   node apps/quiz/scripts/gen-kpop-icons.mjs --check   exit 1 when a file differs from a fresh render
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharp = createRequire(join(QUIZ, 'package.json'))('sharp');
const OUT = join(QUIZ, 'public', 'brand', 'kpop');

const PINK = [0xd1, 0x3a, 0x6e];
const MASTER = 1024;
const SAFE_RADIUS = 0.4;
const ICO_SIZES = [16, 32, 48, 96, 144];
const PNG_FILES = { 'favicon-16x16.png': 16, 'favicon-32x32.png': 32, 'apple-touch-icon.png': 180, 'android-chrome-192x192.png': 192, 'android-chrome-512x512.png': 512 };

/** The rabbit of the source as a coverage mask: dark is 255, the cream is 0 (the pink stars fall between, so they read as tinted on the white). */
async function rabbitMask() {
  const { data, info } = await sharp(join(QUIZ, 'public', 'rabbit-source.webp')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const mask = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    const lum = (0.2126 * data[i * ch] + 0.7152 * data[i * ch + 1] + 0.0722 * data[i * ch + 2]) / 255;
    mask[i] = Math.round(255 * Math.min(1, Math.max(0, (0.62 - lum) / 0.5)));
  }
  // Keep the largest connected piece: the rabbit with the stars that touch it, without the loose sparkles and the noise of the cream.
  const label = new Int32Array(w * h);
  let best = 0, bestSize = 0, next = 0;
  for (let s = 0; s < w * h; s++) {
    if (mask[s] === 0 || label[s] !== 0) continue;
    next++;
    let size = 0;
    const stack = [s];
    label[s] = next;
    while (stack.length > 0) {
      const p = stack.pop();
      size++;
      const x = p % w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (q >= 0 && q < w * h && mask[q] !== 0 && label[q] === 0) { label[q] = next; stack.push(q); }
      }
    }
    if (size > bestSize) { best = next; bestSize = size; }
  }
  // What the rabbit encloses stays (the pupils are islands inside the eyes); what the cream can reach from the border goes.
  const reached = new Uint8Array(w * h);
  const stack = [];
  const push = (p) => { if (label[p] !== best && reached[p] === 0) { reached[p] = 1; stack.push(p); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length > 0) {
    const p = stack.pop();
    const x = p % w;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (p >= w) push(p - w);
    if (p < w * (h - 1)) push(p + w);
  }
  for (let i = 0; i < w * h; i++) if (reached[i] === 1) mask[i] = 0;
  return { mask, w, h };
}

/** The centre of the rabbit's bounding box, and the distance from it to the farthest solid pixel (the circle the crop must keep whole). */
function placement({ mask, w, h }) {
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  const pts = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] < 64) continue;
      pts.push([x + 0.5, y + 0.5]);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1);
    }
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let far = 0;
  for (const [x, y] of pts) far = Math.max(far, (x - cx) ** 2 + (y - cy) ** 2);
  return { cx, cy, r: Math.sqrt(far) };
}

/** The opaque master: the rabbit, scaled and centred on the pink, three channels. */
async function master() {
  const m = await rabbitMask();
  const { cx, cy, r } = placement(m);
  const scale = (SAFE_RADIUS * MASTER) / r;
  const side = Math.round(m.w * scale);
  const scaled = await sharp(m.mask, { raw: { width: m.w, height: m.h, channels: 1 } }).resize(side, side, { kernel: 'lanczos3' }).extractChannel(0).raw().toBuffer();
  const ox = Math.round(MASTER / 2 - cx * scale), oy = Math.round(MASTER / 2 - cy * scale);
  const out = Buffer.alloc(MASTER * MASTER * 3);
  for (let y = 0; y < MASTER; y++) {
    for (let x = 0; x < MASTER; x++) {
      const sx = x - ox, sy = y - oy;
      const a = sx >= 0 && sy >= 0 && sx < side && sy < side ? scaled[sy * side + sx] / 255 : 0;
      for (let c = 0; c < 3; c++) out[(y * MASTER + x) * 3 + c] = Math.round(PINK[c] * (1 - a) + 255 * a);
    }
  }
  return out;
}

const png = (raw, size) => sharp(raw, { raw: { width: MASTER, height: MASTER, channels: 3 } })
  .resize(size, size, { kernel: 'lanczos3' }).removeAlpha().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();

/** An .ico of PNG images (the header, one 16 byte entry per size, then the files). */
function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, file }, i) => {
    const e = 6 + 16 * i;
    head[e] = size;
    head[e + 1] = size;
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(24, e + 6);
    head.writeUInt32LE(file.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += file.length;
  });
  return Buffer.concat([head, ...images.map((x) => x.file)]);
}

const raw = await master();
const files = {};
for (const [name, size] of Object.entries(PNG_FILES)) files[name] = await png(raw, size);
files['favicon.ico'] = ico(await Promise.all(ICO_SIZES.map(async (size) => ({ size, file: await png(raw, size) }))));
// The SVG icon the head links first: an opaque picture, as the favicon.svg it replaces is (the art has no vector).
files['favicon.svg'] = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><image href="data:image/png;base64,${(await png(raw, 128)).toString('base64')}" width="128" height="128"/></svg>\n`);

const check = process.argv.includes('--check');
let bad = 0;
for (const [name, bytes] of Object.entries(files)) {
  const path = join(OUT, name);
  if (check) {
    let same = false;
    try { same = readFileSync(path).equals(bytes); } catch { /* missing */ }
    if (!same) { bad++; console.error(`differs: ${name}`); }
  } else {
    writeFileSync(path, bytes);
    console.log(name, bytes.length);
  }
}
process.exit(bad ? 1 : 0);
