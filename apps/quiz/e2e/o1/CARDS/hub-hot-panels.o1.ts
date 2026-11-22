// Lot HUB-HOT-B (2026-11-22): the two panels of "Popular this week" keep the same height at 1280 px, whatever the titles say (a very long one on a
// side, a very short one on the other), with or without the NEW tag, with fewer than three quizzes, and with none.
// Offline and self-contained: the real component (components/hub/home/home-hot.tsx) is rendered to markup and set in a page together with the real
// sheets (tokens.css and h2.css), inside the real band (a wrap, the split, the Quick question beside it). No server, no database.
//   playwright test -c playwright.o1.config.ts e2e/o1/CARDS/hub-hot-panels.o1.ts --project=lanes
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import type { HotCard, HotLabels, HotPanel } from '../../../src/components/hub/home/home-hot';

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url));
const css = ['styles/sites/hub/tokens.css', 'styles/sites/hub/h2.css'].map((f) => readFileSync(`${SRC}${f}`, 'utf8')).join('\n');

const labels: HotLabels = {
  title: 'Popular this week', sub: 'The top three on each side, ranked by plays this week.', eyebrow: 'Week 47 · 16-22 Nov', seeAll: 'See all', rank: 'Rank',
  newLabel: 'New', empty: 'No plays yet this week', weekPlays: '{n} plays this week', weekShort: '{n} this week',
};
const LONG = 'An extremely long quiz title that keeps going and going so that it needs far more than two lines of a narrow column to be written in full, '.repeat(3);
const card = (site: 'kpop' | 'anime', n: number, over: Partial<HotCard> = {}): HotCard => ({
  site, tile: `T${n}`, title: `Quiz ${n}`, href: `https://example.test/${site}/${n}`, subject: `Subject ${n}`, level: 'Medium', format: null, weekPlays: 500 - n, isNew: false,
  cover: null, groupImage: null, ...over,
});
const panel = (site: 'kpop' | 'anime', items: HotCard[]): HotPanel => ({
  site, name: site === 'kpop' ? 'KpopQuiz' : 'OtakuQuiz', items, seeAllHref: `https://example.test/${site}`, seeAllLabel: `All quizzes on ${site}`,
});

// The component files are TSX with the automatic JSX runtime of Next; Playwright's own transform turns JSX into its component-testing objects, so
// the three small files of the band are compiled here with TypeScript (the app's own compiler) and loaded as CommonJS.
const nodeRequire = createRequire(import.meta.url);
const loaded = new Map<string, Record<string, unknown>>();
function loadModule(file: string): Record<string, unknown> {
  const hit = loaded.get(file);
  if (hit) return hit;
  const out = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  loaded.set(file, mod.exports);
  const req = (id: string): unknown => {
    if (!id.startsWith('.')) return nodeRequire(id);
    const base = path.resolve(path.dirname(file), id);
    const found = ['.tsx', '.ts'].map((x) => base + x).find((f) => existsSync(f));
    if (!found) throw new Error(`cannot load ${id} from ${file}`);
    return loadModule(found);
  };
  new Function('module', 'exports', 'require', out)(mod, mod.exports, req);
  return mod.exports;
}

async function pageOf(panels: HotPanel[], theme: 'light' | 'dark' = 'light'): Promise<string> {
  const { HomeHot } = loadModule(`${SRC}components/hub/home/home-hot.tsx`) as { HomeHot: (p: { panels: HotPanel[]; labels: HotLabels }) => React.ReactElement };
  const hot = renderToStaticMarkup(createElement(HomeHot, { panels, labels }));
  const quick = '<aside class="hub-h2-quick"><h3 class="hub-h2-h3">Quick question</h3><p class="hub-h2-meta">Tap an answer.</p></aside>';
  return `<!doctype html><html lang="en" class="ux-v1${theme === 'dark' ? ' dark' : ''}" data-site="hub"><head><meta charset="utf-8"><style>${css}</style></head>`
    + `<body style="margin:0"><div class="hub-h2-home"><main class="hub-h2-main"><section class="hub-h2-band hub-h2-wrap"><div class="hub-h2-split">${hot}${quick}</div></section></main></div></body></html>`;
}

async function heights(page: import('@playwright/test').Page): Promise<{ panels: number[]; slots: number[][]; none: number }> {
  return page.evaluate(() => ({
    panels: [...document.querySelectorAll('.hub-h2-pnl')].map((e) => Math.round(e.getBoundingClientRect().height * 100) / 100),
    slots: [...document.querySelectorAll('.hub-h2-pnl')].map((p) => [...p.querySelectorAll('.hub-h2-pnl-list > li')].map((e) => Math.round(e.getBoundingClientRect().height * 100) / 100)),
    none: document.querySelectorAll('.hub-h2-pnl-none').length,
  }));
}

test.use({ viewport: { width: 1280, height: 900 } });

const FULL = (site: 'kpop' | 'anime', first: Partial<HotCard>, second: Partial<HotCard>, third: Partial<HotCard>): HotCard[] => [card(site, 1, first), card(site, 2, second), card(site, 3, third)];

const CASES: Array<{ name: string; panels: HotPanel[] }> = [
  { name: 'a very long title on the left, a very short one on the right', panels: [panel('kpop', FULL('kpop', { title: LONG }, { title: LONG }, { title: LONG })), panel('anime', FULL('anime', { title: 'Hi' }, { title: 'Yo' }, { title: 'Ok' }))] },
  { name: 'the other way round', panels: [panel('kpop', FULL('kpop', { title: 'Hi' }, { title: 'Yo' }, { title: 'Ok' })), panel('anime', FULL('anime', { title: LONG }, { title: LONG }, { title: LONG }))] },
  { name: 'NEW on one side only', panels: [panel('kpop', FULL('kpop', { isNew: true }, { isNew: true }, { isNew: true })), panel('anime', FULL('anime', {}, {}, {}))] },
  { name: 'a long subject and a long format on the first place (one line, an ellipsis)', panels: [panel('kpop', FULL('kpop', { subject: LONG, format: LONG, isNew: true }, { subject: LONG }, {})), panel('anime', FULL('anime', {}, {}, {}))] },
  { name: 'a picture on one side, the name in type on the other', panels: [panel('kpop', FULL('kpop', { groupImage: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }, { cover: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }, {})), panel('anime', FULL('anime', { subject: LONG }, {}, {}))] },
  { name: 'fewer than three quizzes on one side', panels: [panel('kpop', [card('kpop', 1, { title: LONG })]), panel('anime', FULL('anime', {}, {}, {}))] },
  { name: 'two quizzes against none ("No plays yet this week")', panels: [panel('kpop', []), panel('anime', [card('anime', 1), card('anime', 2, { title: LONG })])] },
  { name: 'no quiz on either side', panels: [panel('kpop', []), panel('anime', [])] },
];

for (const theme of ['light', 'dark'] as const) {
  for (const c of CASES) {
    test(`1280 px, ${theme}: both panels are level, ${c.name}`, async ({ page }) => {
      await page.setContent(await pageOf(c.panels, theme));
      const h = await heights(page);
      expect(h.panels).toHaveLength(2);
      expect(h.panels[0]).toBe(h.panels[1]);
      // the two panels sit side by side on one line
      const tops = await page.evaluate(() => [...document.querySelectorAll('.hub-h2-pnl')].map((e) => Math.round(e.getBoundingClientRect().top)));
      expect(tops[0]).toBe(tops[1]);
      // every slot has its own fixed height, the same on both sides, a title long or short, with or without the tag
      if (h.none === 0) {
        expect(h.slots[0]).toHaveLength(3);
        expect(h.slots[1]).toHaveLength(3);
        expect(h.slots[0]).toEqual(h.slots[1]);
      }
    });
  }
}

test('1280 px: a very long title never adds a line (two lines at most, the same slot height as a short one) and the page does not scroll sideways', async ({ page }) => {
  await page.setContent(await pageOf([panel('kpop', FULL('kpop', { title: LONG }, { title: LONG }, { title: LONG })), panel('anime', FULL('anime', { title: 'Hi' }, { title: 'Yo' }, { title: 'Ok' }))]));
  const m = await page.evaluate(() => {
    const lines = (sel: string): number[] => [...document.querySelectorAll(sel)].map((e) => {
      const r = e as HTMLElement;
      return Math.round(r.getBoundingClientRect().height / parseFloat(getComputedStyle(r).lineHeight));
    });
    return { t1: lines('.hub-h2-t1-title'), t2: lines('.hub-h2-t2-title'), wide: document.documentElement.scrollWidth > document.documentElement.clientWidth };
  });
  // short and long titles take the same two lines (the second is reserved for a short one)
  expect(m.t1).toEqual([2, 2]);
  expect(m.t2).toEqual([2, 2, 2, 2]);
  expect(m.wide).toBe(false);
});

test('1280 px: the first place is one link over the banner and the body, 150 px of banner, a 76 px notch on its bottom left; See all is a 44 px target', async ({ page }) => {
  await page.setContent(await pageOf([panel('kpop', FULL('kpop', {}, {}, {})), panel('anime', FULL('anime', {}, {}, {}))]));
  const m = await page.evaluate(() => {
    const box = (sel: string): { w: number; h: number; x: number; y: number } => { const r = document.querySelector(sel)!.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left, y: r.top }; };
    return { media: box('.hub-h2-t1-media'), rank: box('.hub-h2-t1-rank'), link: box('a.hub-h2-t1'), all: box('.hub-h2-pnl-all'), links: document.querySelectorAll('a.hub-h2-t1').length };
  });
  expect(m.media.h).toBe(150);
  expect(m.rank.w).toBe(76);
  expect(m.rank.h).toBe(76);
  expect(m.rank.x).toBe(m.media.x);
  expect(Math.round(m.rank.y + m.rank.h)).toBe(Math.round(m.media.y + m.media.h));
  expect(m.link.h).toBeGreaterThan(m.media.h);
  expect(m.all.h).toBeGreaterThanOrEqual(44);
  expect(m.all.w).toBeGreaterThanOrEqual(44);
  expect(m.links).toBe(2);
});

test('375 px: the panels stack, the first place is a row of a rank, a 76 px picture and the title, and the slots keep their height', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.setContent(await pageOf([panel('kpop', FULL('kpop', { title: LONG }, { title: 'Yo' }, {})), panel('anime', FULL('anime', { title: 'Hi' }, { title: LONG }, {}))]));
  const m = await page.evaluate(() => ({
    tops: [...document.querySelectorAll('.hub-h2-pnl')].map((e) => Math.round(e.getBoundingClientRect().top)),
    lefts: [...document.querySelectorAll('.hub-h2-pnl')].map((e) => Math.round(e.getBoundingClientRect().left)),
    media: (() => { const r = document.querySelector('.hub-h2-t1-media')!.getBoundingClientRect(); return [r.width, r.height]; })(),
    slot1: [...document.querySelectorAll('.hub-h2-slot-1')].map((e) => e.getBoundingClientRect().height),
    slot2: [...document.querySelectorAll('.hub-h2-slot-2')].map((e) => e.getBoundingClientRect().height),
    wide: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  expect(m.lefts[0]).toBe(m.lefts[1]);
  expect(m.tops[1]).toBeGreaterThan(m.tops[0]!);
  expect(m.media).toEqual([76, 76]);
  expect(new Set(m.slot1).size).toBe(1);
  expect(new Set(m.slot2).size).toBe(1);
  expect(m.wide).toBe(false);
});
