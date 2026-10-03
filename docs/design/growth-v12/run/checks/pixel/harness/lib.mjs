// C1 (V12 run): shared measurement, comparison and image helpers, extracted verbatim from
// c1-pixel-v11.mjs (itself the v11 C1 harness) so the v12 runner measures the same way.
import path from 'node:path';
import { createRequire } from 'node:module';
import { WT } from './drivers-v11.mjs';
const sharp = createRequire(path.join(WT, 'package.json'))('sharp');
export const TOL_BOX = 2;
export const TOL_STYLE = 0.5;

// ---- in-page measurement -------------------------------------------------------------

/** Runs in the page. scope: '.view.on' for the prototype (fallback to the document). */
export function measureInPage({ lms, props, scope }) {
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return (e.offsetParent !== null || cs.position === 'fixed' || cs.position === 'sticky') && r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; };
  const find = (sel, all) => {
    let list = [];
    try {
      if (scope) list = Array.from(document.querySelectorAll(`${scope} ${sel.split(',').join(`, ${scope} `)}`)).filter(vis);
      if (!list.length) list = Array.from(document.querySelectorAll(sel)).filter(vis);
    } catch { return []; }
    return all ? list : list.slice(0, 1);
  };
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height, vx: r.x, vy: r.y }; };
  const out = {};
  for (const l of lms) {
    const side = l.side;
    const els = find(side, Boolean(l.seq));
    if (!els.length) { out[l.name] = null; continue; }
    const cs = getComputedStyle(els[0]);
    const val = (p) => cs.getPropertyValue(p).replace(/url\((["']?)(data:[^;,]{0,40})[^)]*\1\)/g, 'url($2...)').replace(/url\((["']?)([^)]{0,80})[^)]*\1\)/g, 'url($2)');
    const after = getComputedStyle(els[0], '::after');
    out[l.name] = { n: els.length, boxes: els.slice(0, 24).map(box), style: Object.fromEntries(props.map((p) => [p, val(p)])), afterShadow: after.content !== 'none' ? after.boxShadow : 'none' };
  }
  return out;
}

/** Runs in the page: rectangles of photos and text, document coordinates (for the diff masks). */
export function masksInPage() {
  const rects = [];
  const add = (r) => { if (r.width > 1 && r.height > 1) rects.push([Math.floor(r.x + scrollX), Math.floor(r.y + scrollY), Math.ceil(r.width), Math.ceil(r.height)]); };
  for (const e of document.querySelectorAll('img, picture, video, canvas, iframe')) add(e.getBoundingClientRect());
  for (const e of document.querySelectorAll('*')) {
    const bi = getComputedStyle(e).backgroundImage;
    if (bi && bi.includes('url(')) add(e.getBoundingClientRect());
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let n;
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue;
    const p = n.parentElement;
    if (!p) continue;
    const cs = getComputedStyle(p);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) add(r);
  }
  return rects;
}

// ---- comparison ------------------------------------------------------------------------

export const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
export function styleEqual(a, b, prop) {
  if (norm(a) === norm(b)) return true;
  // two photos (any url) are the same kind of fill; the photo itself is real data
  if (prop === 'background-image' && /url\(/.test(a) && /url\(/.test(b)) return true;
  const px = /^-?[\d.]+px$/;
  if (px.test(norm(a)) && px.test(norm(b))) return Math.abs(parseFloat(a) - parseFloat(b)) <= TOL_STYLE;
  // same numbers in a compound value (shadows, gradients) within 0.5
  const na = norm(a).match(/-?[\d.]+/g); const nb = norm(b).match(/-?[\d.]+/g);
  if (na && nb && na.length === nb.length && norm(a).replace(/-?[\d.]+/g, '#') === norm(b).replace(/-?[\d.]+/g, '#')) return na.every((x, i) => Math.abs(Number(x) - Number(nb[i])) <= TOL_STYLE);
  return false;
}

// ---- images ------------------------------------------------------------------------------

export async function raw(buf) { const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }

export async function images(refPng, implPng, masks, dir, stem, theme, width) {
  const A = await raw(refPng); const B = await raw(implPng);
  const W = Math.max(A.w, B.w); const Hh = Math.max(A.h, B.h);
  const mask = new Uint8Array(W * Hh);
  for (const [x, y, w, h] of masks) {
    for (let yy = Math.max(0, y); yy < Math.min(Hh, y + h); yy++) mask.fill(1, yy * W + Math.max(0, x), yy * W + Math.min(W, x + w));
  }
  const out = Buffer.alloc(W * Hh * 4);
  let diff = 0; let unmasked = 0;
  for (let y = 0; y < Hh; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      const inA = x < A.w && y < A.h; const inB = x < B.w && y < B.h;
      const ia = (y * A.w + x) * 4; const ib = (y * B.w + x) * 4;
      const gray = inB ? Math.round((B.data[ib] + B.data[ib + 1] + B.data[ib + 2]) / 3) : 255;
      const g = 200 + Math.round(gray * 55 / 255);
      if (mask[y * W + x]) { out[o] = g - 40; out[o + 1] = g - 20; out[o + 2] = 255; out[o + 3] = 255; continue; }
      unmasked++;
      const d = inA && inB ? Math.max(Math.abs(A.data[ia] - B.data[ib]), Math.abs(A.data[ia + 1] - B.data[ib + 1]), Math.abs(A.data[ia + 2] - B.data[ib + 2])) : 255;
      if (d > 24) { diff++; out[o] = 230; out[o + 1] = 30; out[o + 2] = 60; out[o + 3] = 255; } else { out[o] = g; out[o + 1] = g; out[o + 2] = g; out[o + 3] = 255; }
    }
  }
  const scale = width > 500 ? 0.4 : 0.8;
  const dW = Math.round(W * scale);
  // WebP caps at 16383 px: very long pages keep their top 16000 px (after scaling) in the images
  const maxRows = Math.min(Hh, Math.floor(16000 / scale));
  await sharp(out, { raw: { width: W, height: Hh, channels: 4 } }).extract({ left: 0, top: 0, width: W, height: maxRows }).resize({ width: dW }).webp({ quality: 50 }).toFile(path.join(dir, `${stem}-diff.webp`));
  // side by side: reference | implementation
  const top = async (png, h) => (h > maxRows ? sharp(png).extract({ left: 0, top: 0, width: (await sharp(png).metadata()).width, height: maxRows }).png().toBuffer() : png);
  const sa = await sharp(await top(refPng, A.h)).resize({ width: dW }).png().toBuffer(); const sb = await sharp(await top(implPng, B.h)).resize({ width: dW }).png().toBuffer();
  const ma = await sharp(sa).metadata(); const mb = await sharp(sb).metadata();
  const gap = 16; const label = 24;
  const SW = ma.width + mb.width + gap; const SH = Math.min(16000, Math.max(ma.height, mb.height) + label);
  const bg = theme === 'dark' ? '#141312' : '#FFFFFF'; const ink = theme === 'dark' ? '#A8A198' : '#6B655E';
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${label}"><style>text{font:600 12px sans-serif;fill:${ink}}</style><text x="0" y="16">reference ${stem}</text><text x="${ma.width + gap}" y="16">implementation ${stem}</text></svg>`);
  const crop = async (b, m) => (m.height > SH - label ? sharp(b).extract({ left: 0, top: 0, width: m.width, height: SH - label }).png().toBuffer() : b);
  await sharp({ create: { width: SW, height: SH, channels: 3, background: bg } })
    .composite([{ input: svg, top: 0, left: 0 }, { input: await crop(sa, ma), top: label, left: 0 }, { input: await crop(sb, mb), top: label, left: ma.width + gap }])
    .webp({ quality: 55 }).toFile(path.join(dir, `${stem}-side.webp`));
  return { refSize: [A.w, A.h], implSize: [B.w, B.h], diffPct: +(100 * diff / Math.max(1, unmasked)).toFixed(2), maskedPct: +(100 * (1 - unmasked / (W * Hh))).toFixed(1) };
}

