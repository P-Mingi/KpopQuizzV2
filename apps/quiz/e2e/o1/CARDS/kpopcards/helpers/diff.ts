import type { Browser, Page } from '@playwright/test';

export type DiffResult = { width: number; height: number; diffPixels: number; ratio: number; sizeA: [number, number]; sizeB: [number, number]; diffPng: Buffer };

/** pixelmatch's algorithm (YIQ delta, threshold 0.1, no anti-alias pass) run in a scratch page, so there is no npm dependency.
 *  Pixels outside the smaller image count as different. */
export async function diffPngs(browser: Browser, a: Buffer, b: Buffer, threshold = 0.1): Promise<DiffResult> {
  const ctx = await browser.newContext();
  const page: Page = await ctx.newPage();
  try {
    const r = await page.evaluate(
      async ({ a64, b64, threshold }) => {
        const load = async (b64s: string) => {
          const blob = await (await fetch('data:image/png;base64,' + b64s)).blob();
          const bmp = await createImageBitmap(blob);
          const c = document.createElement('canvas');
          c.width = bmp.width; c.height = bmp.height;
          const g = c.getContext('2d')!;
          g.drawImage(bmp, 0, 0);
          return { w: bmp.width, h: bmp.height, d: g.getImageData(0, 0, bmp.width, bmp.height).data };
        };
        const A = await load(a64), B = await load(b64);
        const W = Math.max(A.w, B.w), H = Math.max(A.h, B.h);
        const out = document.createElement('canvas'); out.width = W; out.height = H;
        const og = out.getContext('2d')!; const od = og.createImageData(W, H);
        const maxDelta = 35215 * threshold * threshold;
        const blend = (c: number, a: number) => 255 + (c - 255) * a;
        const px = (d: Uint8ClampedArray, i: number): number => d[i] ?? 0;
        let diff = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 4;
          const inA = x < A.w && y < A.h, inB = x < B.w && y < B.h;
          let bad = false, gray = 255;
          if (inA && inB) {
            const ia = (y * A.w + x) * 4, ib = (y * B.w + x) * 4;
            const aa = px(A.d, ia + 3) / 255, ba = px(B.d, ib + 3) / 255;
            const r1 = blend(px(A.d, ia), aa), g1 = blend(px(A.d, ia + 1), aa), b1 = blend(px(A.d, ia + 2), aa);
            const r2 = blend(px(B.d, ib), ba), g2 = blend(px(B.d, ib + 1), ba), b2 = blend(px(B.d, ib + 2), ba);
            const y1 = r1 * 0.29889531 + g1 * 0.58662247 + b1 * 0.11448223, y2 = r2 * 0.29889531 + g2 * 0.58662247 + b2 * 0.11448223;
            const i1 = r1 * 0.59597799 - g1 * 0.2741761 - b1 * 0.32180189, i2 = r2 * 0.59597799 - g2 * 0.2741761 - b2 * 0.32180189;
            const q1 = r1 * 0.21147017 - g1 * 0.52261711 + b1 * 0.31114694, q2 = r2 * 0.21147017 - g2 * 0.52261711 + b2 * 0.31114694;
            const delta = 0.5053 * (y1 - y2) ** 2 + 0.299 * (i1 - i2) ** 2 + 0.1957 * (q1 - q2) ** 2;
            bad = delta > maxDelta;
            gray = 255 + (y1 - 255) * 0.1;
          } else bad = true;
          if (bad) { diff++; od.data[o] = 255; od.data[o + 1] = 0; od.data[o + 2] = 0; }
          else { od.data[o] = od.data[o + 1] = od.data[o + 2] = gray; }
          od.data[o + 3] = 255;
        }
        og.putImageData(od, 0, 0);
        return { W, H, diff, sa: [A.w, A.h], sb: [B.w, B.h], png: out.toDataURL('image/png').split(',')[1] ?? '' };
      },
      { a64: a.toString('base64'), b64: b.toString('base64'), threshold },
    );
    return { width: r.W, height: r.H, diffPixels: r.diff, ratio: r.diff / (r.W * r.H), sizeA: r.sa as [number, number], sizeB: r.sb as [number, number], diffPng: Buffer.from(r.png, 'base64') };
  } finally {
    await ctx.close();
  }
}

export type Box = { x: number; y: number; w: number; h: number };
export type BoxRow = { sel: string; idx: number; proto: Box | null; app: Box | null; dx: number; dy: number; dw: number; dh: number; off: number };

/** Document-space boxes (rect + scroll) of every match of each selector, capped per selector. Boxes are read at rest: every infinite CSS animation
 *  (the lobby pack's float, a pulse) is cancelled first, as the screenshot that follows does with animations: 'disabled', so a box never depends on
 *  how long a page took to load (the float moves #pack by up to 8 px). */
export async function measure(page: Page, sels: string[], cap = 12): Promise<Record<string, Box[]>> {
  return page.evaluate(
    ({ sels, cap }) => {
      for (const a of document.getAnimations()) { const t = a.effect?.getTiming(); if (t && t.iterations === Infinity) a.cancel(); }
      const out: Record<string, { x: number; y: number; w: number; h: number }[]> = {};
      for (const s of sels) {
        out[s] = Array.from(document.querySelectorAll(s))
          .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
          .slice(0, cap)
          .map((e) => { const r = e.getBoundingClientRect(); return { x: +(r.left + scrollX).toFixed(1), y: +(r.top + scrollY).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; });
      }
      return out;
    },
    { sels, cap },
  );
}

export function compareBoxes(proto: Record<string, Box[]>, app: Record<string, Box[]>): BoxRow[] {
  const rows: BoxRow[] = [];
  for (const sel of Object.keys(proto)) {
    const pl = proto[sel] ?? [], al = app[sel] ?? [];
    const n = Math.max(pl.length, al.length);
    for (let i = 0; i < n; i++) {
      const p = pl[i] ?? null, a = al[i] ?? null;
      if (!p || !a) { rows.push({ sel, idx: i, proto: p, app: a, dx: 0, dy: 0, dw: 0, dh: 0, off: 999 }); continue; }
      const dx = +(a.x - p.x).toFixed(1), dy = +(a.y - p.y).toFixed(1), dw = +(a.w - p.w).toFixed(1), dh = +(a.h - p.h).toFixed(1);
      rows.push({ sel, idx: i, proto: p, app: a, dx, dy, dw, dh, off: Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dw), Math.abs(dh)) });
    }
  }
  return rows;
}
