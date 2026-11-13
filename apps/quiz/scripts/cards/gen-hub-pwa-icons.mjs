// The installable Bunnyverse (lot 4 B6): the three icons of the hub's web manifest, drawn from the same rabbit as the other icons
// (public/rabbit-source.webp, 1024 px, no vector exists): the cream rabbit on the ink of the hub chrome.
//   pwa-192.png, pwa-512.png        purpose "any": the rabbit at the 40% radius of gen-kpop-icons.mjs
//   pwa-maskable-512.png            purpose "maskable": full bleed, the rabbit inside the 30% radius (the safe zone of a maskable icon is the 40% circle)
// Writes public/brand/hub/ (served at /brand/hub/<file>; the manifest of the hub names them).
//   node apps/quiz/scripts/cards/gen-hub-pwa-icons.mjs           writes the files
//   node apps/quiz/scripts/cards/gen-hub-pwa-icons.mjs --check   exit 1 when a file differs from a fresh render
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const sharp = createRequire(join(QUIZ, 'package.json'))('sharp');
const OUT = join(QUIZ, 'public', 'brand', 'hub');

const INK = [0x1f, 0x1b, 0x17];
const CREAM = [0xfa, 0xf8, 0xf5];
const MASTER = 1024;

/** The rabbit as a coverage mask (dark is 255): the largest connected piece, with what it encloses, as gen-kpop-icons.mjs does. */
async function rabbitMask() {
  const { data, info } = await sharp(join(QUIZ, 'public', 'rabbit-source.webp')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const mask = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    const lum = (0.2126 * data[i * ch] + 0.7152 * data[i * ch + 1] + 0.0722 * data[i * ch + 2]) / 255;
    mask[i] = Math.round(255 * Math.min(1, Math.max(0, (0.62 - lum) / 0.5)));
  }
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

/** The centre of the rabbit's bounding box and the distance from it to the farthest solid pixel. */
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

/** The opaque master (1024 px): the rabbit centred on the ink, its farthest pixel at `radius` of the side from the centre. */
async function master(m, radius) {
  const { cx, cy, r } = placement(m);
  const scale = (radius * MASTER) / r;
  const side = Math.round(m.w * scale);
  const scaled = await sharp(m.mask, { raw: { width: m.w, height: m.h, channels: 1 } }).resize(side, side, { kernel: 'lanczos3' }).extractChannel(0).raw().toBuffer();
  const ox = Math.round(MASTER / 2 - cx * scale), oy = Math.round(MASTER / 2 - cy * scale);
  const out = Buffer.alloc(MASTER * MASTER * 3);
  for (let y = 0; y < MASTER; y++) {
    for (let x = 0; x < MASTER; x++) {
      const sx = x - ox, sy = y - oy;
      const a = sx >= 0 && sy >= 0 && sx < side && sy < side ? scaled[sy * side + sx] / 255 : 0;
      for (let c = 0; c < 3; c++) out[(y * MASTER + x) * 3 + c] = Math.round(INK[c] * (1 - a) + CREAM[c] * a);
    }
  }
  return out;
}

const png = (raw, size) => sharp(raw, { raw: { width: MASTER, height: MASTER, channels: 3 } })
  .resize(size, size, { kernel: 'lanczos3' }).removeAlpha().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();

const m = await rabbitMask();
const any = await master(m, 0.4);
const maskable = await master(m, 0.3);
const files = {
  'pwa-192.png': await png(any, 192),
  'pwa-512.png': await png(any, 512),
  'pwa-maskable-512.png': await png(maskable, 512),
};

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
    console.log(`wrote ${name} (${bytes.length} bytes)`);
  }
}
if (check) process.exit(bad === 0 ? 0 : 1);
