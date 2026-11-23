// Lot LAUNCH-POLISH-3, part A (2026-11-23): the site switcher on the HUB, in the two bars the hub draws itself (the home's hub-h2-head and the daily
// games' hub-dle-head), desktop (1024 px) and phone (375 px), light and dark. Offline, same style as site-switch-layout.o1.ts: the real component is
// rendered with the hub model (Bunnyverse current) and the menu forced open, inside a bar with the real stylesheets (a0.css, then the hub sheets
// tokens.css first, as lib/ux-v1/a0/stylesheet.ts concatenates them). No server.
//   playwright test -c playwright.o1.config.ts e2e/o1/CARDS/hub-site-switch.o1.ts --project=lanes
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url));
const HUB_DIR = `${SRC}styles/sites/hub/`;
const hubFiles = ['tokens.css', ...readdirSync(HUB_DIR).filter((f) => f.endsWith('.css') && f !== 'tokens.css').sort()];
const css = [readFileSync(`${SRC}styles/ux-v1/a0.css`, 'utf8'), ...hubFiles.map((f) => readFileSync(HUB_DIR + f, 'utf8'))].join('\n');
const nodeRequire = createRequire(import.meta.url);
const loaded = new Map<string, Record<string, unknown>>();
function loadModule(file: string): Record<string, unknown> {
  const hit = loaded.get(file);
  if (hit) return hit;
  const out = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  loaded.set(file, mod.exports);
  const req = (id: string): unknown => {
    if (id === '@/components/ux-v1/brand') return { UxBrandMark: () => createElement('span', null, 'Bunny', createElement('b', { className: 'hub-h2-brand-tail' }, 'verse')) };
    if (id === '@/components/ux-v1/icon') return { Icon: ({ className }: { className?: string }) => createElement('svg', { className: `ux-ico ${className ?? ''}`, viewBox: '0 0 20 20' }, createElement('path', { d: 'M5 8l5 5 5-5' })) };
    if (!id.startsWith('.') && !id.startsWith('@/')) return nodeRequire(id);
    const base = id.startsWith('@/') ? path.join(SRC, id.slice(2)) : path.resolve(path.dirname(file), id);
    const found = ['.tsx', '.ts'].map((x) => base + x).find((f) => existsSync(f));
    if (!found) throw new Error(`cannot load ${id} from ${file}`);
    return loadModule(found);
  };
  new Function('module', 'exports', 'require', out)(mod, mod.exports, req);
  return mod.exports;
}

const model = {
  current: 'hub',
  items: [{ id: 'kpop', label: 'KpopQuiz', href: '/k' }, { id: 'anime', label: 'OtakuQuiz', href: '/a' }, { id: 'hub', label: 'Bunnyverse', href: null }],
};

type Bar = 'home' | 'dle';

function pageOf(theme: 'light' | 'dark', bar: Bar): string {
  const { SiteSwitch } = loadModule(`${SRC}components/site-switch/site-switch.tsx`) as { SiteSwitch: (p: { model: unknown }) => React.ReactElement };
  const html = renderToStaticMarkup(createElement(SiteSwitch, { model })).replace('class="ux-sw"', 'class="ux-sw" data-open=""');
  const p = bar === 'home' ? 'hub-h2' : 'hub-dle';
  const tabs = ['Home', 'Daily games', 'Quizzes', 'Community'].map((t, i) => `<a href="#" class="${p}-tab${i === 0 ? ` ${p}-tab-on` : ''}">${t}</a>`).join('');
  return `<!doctype html><html lang="en" class="ux-v1${theme === 'dark' ? ' dark' : ''}" data-site="hub"><head><meta charset="utf-8"><style>*,*::before,*::after{box-sizing:border-box}${css}</style></head>`
    + `<body style="margin:0"><div class="ux-app"><header class="${p}-head"><nav class="${p}-nav">${html}<div class="${p}-tabs">${tabs}</div><div class="${p}-actions"><button class="${p}-btn">Sign in</button></div></nav></header><main style="height:1200px">x</main></div></body></html>`;
}

async function rects(page: import('@playwright/test').Page): Promise<{ menu: DOMRect; rows: number[]; btn: DOMRect; scrim: string; head: DOMRect }> {
  return page.evaluate(() => ({
    menu: document.querySelector('.ux-sw-menu')!.getBoundingClientRect().toJSON(),
    rows: [...document.querySelectorAll('.ux-sw-i')].map((e) => e.getBoundingClientRect().height),
    btn: document.querySelector('.ux-sw-btn')!.getBoundingClientRect().toJSON(),
    scrim: getComputedStyle(document.querySelector('.ux-sw-scrim')!).display,
    head: document.querySelector('header')!.getBoundingClientRect().toJSON(),
  }));
}

async function semantics(page: import('@playwright/test').Page): Promise<void> {
  const rows = await page.evaluate(() => [...document.querySelectorAll('.ux-sw-i')].map((e) => ({ tag: e.tagName, site: e.getAttribute('data-site'), current: e.getAttribute('aria-current'), href: e.getAttribute('href'), check: !!e.querySelector('[data-end=check]') })));
  expect(rows).toEqual([
    { tag: 'A', site: 'kpop', current: null, href: '/k', check: false },
    { tag: 'A', site: 'anime', current: null, href: '/a', check: false },
    { tag: 'SPAN', site: 'hub', current: 'page', href: null, check: true },
  ]);
}

for (const bar of ['home', 'dle'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${bar} bar, 1024 px, ${theme}: menu 340 px wide under the button, rows of 60 px or more, no scrim, Bunnyverse current`, async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 800 });
      await page.setContent(pageOf(theme, bar));
      const r = await rects(page);
      expect(Math.round(r.menu.width)).toBe(340);
      expect(r.menu.top).toBeGreaterThanOrEqual(r.btn.bottom);
      expect(Math.abs(r.menu.left - r.btn.left)).toBeLessThanOrEqual(12); // the button has an 8 px negative margin: the panel hangs from the brand's edge
      for (const h of r.rows) expect(h).toBeGreaterThanOrEqual(60);
      expect(r.scrim).toBe('none');
      await semantics(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    });
    test(`${bar} bar, 375 px, ${theme}: menu full width with 10 px margins under the bar, rows of 64 px or more, a scrim, Bunnyverse current`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 700 });
      await page.setContent(pageOf(theme, bar));
      const r = await rects(page);
      expect(Math.round(r.menu.left)).toBe(10);
      expect(Math.round(r.menu.width)).toBe(355);
      expect(r.menu.top).toBeGreaterThanOrEqual(r.btn.bottom);
      for (const h of r.rows) expect(h).toBeGreaterThanOrEqual(64);
      expect(r.scrim).toBe('block');
      await semantics(page);
      expect(await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).map((e) => e.className))).toEqual([]);
    });
  }
}
