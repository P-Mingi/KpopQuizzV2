import type { Page } from '@playwright/test';
import { FIXED_TIME, SEED } from './env';

/** Seeded Math.random (mulberry32), installed before any page script runs. */
export function seededRandomScript(seed: number): string {
  return `(() => { let s = ${seed} | 0; Math.random = function () { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;
}

/** Constant Date for the whole page: new Date() and Date.now() return the same instant forever, while timers,
 *  rAF and CSS animations keep running on real time (Playwright's page.clock would freeze them too). */
export function fixedDateScript(ms: number): string {
  return `(() => { const RealDate = Date; const T = ${ms};
    function FixedDate(...a) { if (!new.target) return new RealDate(T).toString(); return a.length ? new RealDate(...a) : new RealDate(T); }
    FixedDate.prototype = RealDate.prototype; FixedDate.now = () => T; FixedDate.UTC = RealDate.UTC; FixedDate.parse = RealDate.parse;
    window.Date = FixedDate; })();`;
}

export async function freeze(page: Page, opts: { seed?: number; time?: Date } = {}) {
  await page.addInitScript(seededRandomScript(opts.seed ?? SEED));
  await page.addInitScript(fixedDateScript((opts.time ?? FIXED_TIME).getTime()));
}

/** CSS masks, identical on both sides: photos and idol names legitimately differ (the prototype uses
 *  placeholders and example idols, the app the real catalog). What is masked is printed in the report. */
export const MASK_CSS = `
  .c-art, .c-art * { visibility: hidden !important; }
  .c-art { background: #7a7a7a !important; visibility: visible !important; }
  .c-name, .c-meta span, .c-mono, .c-kind .kh { color: transparent !important; text-shadow: none !important; }
  .rtag b, .al-name, .rk-name { color: transparent !important; }
  img.photo, .photo, [data-photo], picture, .c-art img { visibility: hidden !important; }
  * { caret-color: transparent !important; }
`;
export const MASK_DESCRIPTION =
  'photo layer (.c-art and everything in it, img.photo/[data-photo]) painted flat grey; idol name and meta text on cards (.c-name, .c-meta span, .c-mono, .c-kind .kh), ' +
  'reveal-tag and almost-there and ranking names (.rtag b, .al-name, .rk-name) made transparent. Boxes are NOT masked: the layout must still match.';

export async function injectMask(page: Page) {
  await page.addStyleTag({ content: MASK_CSS });
}
