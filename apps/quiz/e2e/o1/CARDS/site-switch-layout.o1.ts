// Lot LAUNCH-POLISH-2, task F (2026-11-23): the layout of the site switcher menu, desktop and phone. Offline: the real component is rendered to
// markup with the menu forced open (data-open) inside a bar with the real tokens (a0.css). No server. The keyboard flow (Escape returns the focus
// to the button) is the component's effect and is covered by the unit test of the component; here the sizes the owner asked for are measured.
//   playwright test -c playwright.o1.config.ts e2e/o1/CARDS/site-switch-layout.o1.ts --project=lanes
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url));
const css = readFileSync(`${SRC}styles/ux-v1/a0.css`, 'utf8');
const nodeRequire = createRequire(import.meta.url);
const loaded = new Map<string, Record<string, unknown>>();
function loadModule(file: string): Record<string, unknown> {
  const hit = loaded.get(file);
  if (hit) return hit;
  const out = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  loaded.set(file, mod.exports);
  const req = (id: string): unknown => {
    if (id === '@/components/ux-v1/brand') return { UxBrandMark: () => createElement('span', { className: 'ux-brand-mark' }, 'Kpop', createElement('b', null, 'Quiz')) };
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
  current: 'kpop',
  items: [{ id: 'kpop', label: 'KpopQuiz', href: null }, { id: 'anime', label: 'OtakuQuiz', href: '/a' }, { id: 'hub', label: 'Bunnyverse', href: '/h' }],
};

function pageOf(theme: 'light' | 'dark'): string {
  const { SiteSwitch } = loadModule(`${SRC}components/site-switch/site-switch.tsx`) as { SiteSwitch: (p: { model: unknown }) => React.ReactElement };
  const html = renderToStaticMarkup(createElement(SiteSwitch, { model })).replace('class="ux-sw"', 'class="ux-sw" data-open=""');
  return `<!doctype html><html lang="en" class="ux-v1${theme === 'dark' ? ' dark' : ''}"><head><meta charset="utf-8"><style>*,*::before,*::after{box-sizing:border-box}${css}</style></head>`
    + `<body style="margin:0"><header class="ux-nav"><div class="ux-wrap ux-nav-in">${html}</div></header><main style="height:1200px">x</main></body></html>`;
}

async function rects(page: import('@playwright/test').Page): Promise<{ menu: DOMRect; rows: number[]; btn: DOMRect; scrim: string }> {
  return page.evaluate(() => ({
    menu: document.querySelector('.ux-sw-menu')!.getBoundingClientRect().toJSON(),
    rows: [...document.querySelectorAll('.ux-sw-i')].map((e) => e.getBoundingClientRect().height),
    btn: document.querySelector('.ux-sw-btn')!.getBoundingClientRect().toJSON(),
    scrim: getComputedStyle(document.querySelector('.ux-sw-scrim')!).display,
  }));
}

for (const theme of ['light', 'dark'] as const) {
  test(`1280 px, ${theme}: the menu is 340 px wide under the button, rows of 60 px or more, no scrim`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setContent(pageOf(theme));
    const r = await rects(page);
    expect(Math.round(r.menu.width)).toBe(340);
    expect(r.menu.top).toBeGreaterThanOrEqual(r.btn.bottom);
    for (const h of r.rows) expect(h).toBeGreaterThanOrEqual(60);
    expect(r.scrim).toBe('none');
  });
  test(`375 px, ${theme}: the menu spans the width under the bar with 10 px margins, rows of 64 px or more, a scrim`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.setContent(pageOf(theme));
    const r = await rects(page);
    expect(Math.round(r.menu.left)).toBe(10);
    expect(Math.round(r.menu.width)).toBe(355);
    expect(r.menu.top).toBeGreaterThanOrEqual(64);
    for (const h of r.rows) expect(h).toBeGreaterThanOrEqual(64);
    expect(r.scrim).toBe('block');
    expect(await page.evaluate(() => [...document.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).map((e) => e.className))).toEqual([]);
  });
}
