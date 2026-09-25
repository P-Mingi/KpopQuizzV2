// Landmark computed-style comparison against the pinned prototype reference
// (docs/design/ux-dashboard-v1/v11/checks/reference/styles.json, captured by
// v11/capture-prototype.mjs). Maps each prototype selector to the implementation
// selector (A0 components) and lists the properties that are layout-independent,
// so a kit / page element can be compared with the reference state that shows it.
// Page agents: add your own entries in your spec (same shape), keep A0's here.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Page } from '@playwright/test';

export type StyleMap = Record<string, string>;
export type ReferenceStyles = Record<string, Record<string, StyleMap>>;

const here = path.dirname(fileURLToPath(import.meta.url));
export const STYLES_JSON = path.resolve(here, '../../../../../docs/design/ux-dashboard-v1/v11/checks/reference/styles.json');

export function loadReference(): ReferenceStyles {
  return JSON.parse(fs.readFileSync(STYLES_JSON, 'utf8')) as ReferenceStyles;
}

/** Visual props compared by default (box size is compared only where the entry says so). */
export const VISUAL_PROPS = [
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-top-color', 'border-radius',
  'background-color', 'background-image', 'color',
  'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap',
] as const;

export interface Landmark {
  /** Prototype selector as captured in styles.json. */
  proto: string;
  /** Implementation selector. */
  impl: string;
  /** Reference state that shows it (styles.json key without the width/theme prefix). */
  state: string;
  /** Extra props to compare (e.g. width / height for fixed boxes). */
  box?: ('width' | 'height')[];
  /** Props to skip for this landmark (documented reason in the entry). */
  skip?: string[];
}

/** A0 landmarks (the shared components the kit and the shell render). */
export const A0_LANDMARKS: Landmark[] = [
  { proto: '.nav', impl: '.ux-nav', state: 'home', box: ['width', 'height'] },
  { proto: '.links a.on', impl: '.ux-links a[aria-current="page"]', state: 'home', box: ['height'] },
  { proto: '.qcard', impl: '.ux-qcard', state: 'home', box: ['width'] },
  { proto: '.sec-h h2', impl: '.ux-sec-h h2', state: 'home', box: ['height'] },
  { proto: '.btn-primary', impl: '.ux-btn-primary:not(.ux-btn-lg):not(.ux-btn-sm):not(.ux-btn-block)', state: 'home-guest', box: ['height'] },
  { proto: '.utabs button.on', impl: '.ux-utabs [aria-selected="true"]', state: 'community', box: ['height'] },
  { proto: '.tcard', impl: '.ux-tcard', state: 'quiz' },
  { proto: '.post', impl: '.ux-post', state: 'community' },
  { proto: '.rail>section', impl: '.ux-panel', state: 'community' },
  { proto: '.personprev', impl: '.ux-personprev', state: 'settings', skip: ['margin-top'] },
  { proto: '.aboutbox', impl: '.ux-box', state: 'quiz' },
  { proto: '.stats3', impl: '.ux-stats3', state: 'end-guest', box: ['height'] },
  { proto: '.pin', impl: '.ux-pin.is-you', state: 'ranked', box: ['height'] },
  { proto: '.medal2', impl: '.ux-medal2', state: 'passport' },
];

export interface Mismatch { landmark: string; key: string; prop: string; expected: string; actual: string }

/** Computed styles of the first visible match of each selector. */
export async function computed(page: Page, selectors: string[], props: readonly string[]): Promise<Record<string, StyleMap | null>> {
  return page.evaluate(({ sels, ps }) => {
    const out: Record<string, Record<string, string> | null> = {};
    for (const s of sels) {
      const el = Array.from(document.querySelectorAll<HTMLElement>(s)).find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
      if (!el) { out[s] = null; continue; }
      const cs = getComputedStyle(el);
      out[s] = Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
    }
    return out;
  }, { sels: selectors, ps: [...props, 'width', 'height'] });
}

const norm = (v: string): string => v.replace(/\s+/g, ' ').trim();
function close(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  const na = parseFloat(a); const nb = parseFloat(b);
  // sizes within 2px (C1 rule for boxes) when both are plain px values
  return /^-?[\d.]+px$/.test(a.trim()) && /^-?[\d.]+px$/.test(b.trim()) && Math.abs(na - nb) <= 2;
}

/** Compare the implementation on `page` with the reference `${width}-${theme}-${state}`. */
export async function compareLandmarks(page: Page, width: number, theme: 'light' | 'dark', landmarks: Landmark[], ref = loadReference()): Promise<{ checked: string[]; missing: string[]; mismatches: Mismatch[] }> {
  const got = await computed(page, landmarks.map((l) => l.impl), VISUAL_PROPS);
  const mismatches: Mismatch[] = [];
  const checked: string[] = [];
  const missing: string[] = [];
  for (const l of landmarks) {
    const key = `${width}-${theme}-${l.state}`;
    const expected = ref[key]?.[l.proto];
    const actual = got[l.impl];
    if (!expected) continue; // not visible in that reference state at this width
    if (!actual) { missing.push(`${l.impl} (${key})`); continue; }
    checked.push(l.proto);
    for (const p of [...VISUAL_PROPS, ...(l.box ?? [])]) {
      if (l.skip?.includes(p)) continue;
      const e = expected[p]; const a = actual[p];
      if (e === undefined || a === undefined) continue;
      if (!close(e, a)) mismatches.push({ landmark: l.proto, key, prop: p, expected: e, actual: a });
    }
  }
  return { checked, missing, mismatches };
}
