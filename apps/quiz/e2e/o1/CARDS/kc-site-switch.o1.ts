// Lot KCNAV (owner, 2026-11-23: "from kpopcard on the nav a button to go back to kpopquiz or bunnyverse"): the site switcher in the KpopCards bar, desktop
// (1024 px) and phone (375 px), light and dark. Offline, same style as hub-site-switch.o1.ts: the real SiteSwitch is rendered with the KpopCards model
// (KpopQuiz, OtakuQuiz, Bunnyverse as links, KpopCards current) and the KpopCards brand inside its button, in a bar that carries the classes of
// kc-shell.tsx (.top .wrap, .tabs, .wallet, .pill, avatar, .bottomnav), with the real stylesheets (a0.css, cards-tokens.css, kpopcards.css,
// cards-photo.css) and the menu forced open. No server. With O1_CARDS_URL set (a hub dev server in fixture mode, for example
// http://hub.localhost:3126/kpopcards) the live page is checked too.
//   playwright test -c playwright.o1.config.ts e2e/o1/CARDS/kc-site-switch.o1.ts --project=lanes
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const SRC = fileURLToPath(new URL('../../../src/', import.meta.url));
const css = ['ux-v1/a0.css', 'cards/cards-tokens.css', 'cards/kpopcards.css', 'cards/cards-photo.css'].map((f) => readFileSync(`${SRC}styles/${f}`, 'utf8')).join('\n');
const nodeRequire = createRequire(import.meta.url);
const loaded = new Map<string, Record<string, unknown>>();
function loadModule(file: string): Record<string, unknown> {
  const hit = loaded.get(file);
  if (hit) return hit;
  const out = ts.transpileModule(readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  loaded.set(file, mod.exports);
  const req = (id: string): unknown => {
    if (id === '@/components/ux-v1/brand') return { UxBrandMark: () => createElement('span', null, 'unused') };
    if (id === '@/components/ux-v1/icon') return { Icon: ({ className }: { className?: string }) => createElement('svg', { className: `ux-ico ${className ?? ''}`, viewBox: '0 0 24 24' }, createElement('path', { d: 'm6 9 6 6 6-6' })) };
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
  current: 'cards',
  items: [
    { id: 'kpop', label: 'KpopQuiz', href: '/k' },
    { id: 'anime', label: 'OtakuQuiz', href: '/a' },
    { id: 'hub', label: 'Bunnyverse', href: '/' },
    { id: 'cards', label: 'KpopCards', href: null },
  ],
};

function pageOf(theme: 'light' | 'dark'): string {
  const { SiteSwitch } = loadModule(`${SRC}components/site-switch/site-switch.tsx`) as { SiteSwitch: (p: { model: unknown; brand: React.ReactNode }) => React.ReactElement };
  const brand = createElement('span', { className: 'brand kc kc-brand' }, createElement('img', { className: 'kc-ico', alt: '', width: 34, height: 34, src: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' }), createElement('span', { className: 'kc-word' }, 'Kpop', createElement('b', null, 'Cards')));
  const html = renderToStaticMarkup(createElement(SiteSwitch, { model, brand })).replace('class="ux-sw"', 'class="ux-sw" data-open=""');
  const tabs = ['Lobby', 'Collection', 'Missions', 'Ranking', 'Help'].map((t, i) => `<a href="#"${i === 0 ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  const pills = '<span class="pill"><b>7</b>/5<span class="lbl">packs</span></span><span class="pill"><b class="num">34</b><span class="lbl">shards</span></span>';
  const bell = '<div class="setwrap"><button class="iconbtn" type="button" aria-label="Notifications">&#9679;</button></div>';
  const av = '<div class="setwrap"><button class="avatar" type="button"><span class="av">M</span><span class="lv">Lv 3</span></button></div>';
  const bottom = `<nav class="bottomnav">${tabs}</nav>`;
  return `<!doctype html><html lang="en" class="ux-v1${theme === 'dark' ? ' dark' : ''}" data-site="hub"><head><meta charset="utf-8"><style>*,*::before,*::after{box-sizing:border-box}${css}</style></head>`
    + `<body style="margin:0"><div class="ux-app"><div class="ux-page bvc"><header class="top"><div class="wrap">${html}<nav class="tabs" aria-label="KpopCards">${tabs}</nav><div class="wallet">${pills}${bell}${av}</div></div></header><div class="kc-main" style="height:1200px">x</div>${bottom}</div></div></body></html>`;
}

async function measure(page: import('@playwright/test').Page): Promise<{ menu: DOMRect; rows: number[]; btn: DOMRect; scrim: string; top: DOMRect; brandInBtn: boolean; ink: string; underline: string; bullet: string }> {
  return page.evaluate(() => {
    const t = document.querySelector('.top')!;
    const q = (s: string): DOMRect => t.querySelector(s)!.getBoundingClientRect().toJSON();
    return {
      menu: q('.ux-sw-menu'), btn: q('.ux-sw-btn'), top: q('.wrap'),
      rows: [...t.querySelectorAll('.ux-sw-i')].map((e) => e.getBoundingClientRect().height),
      scrim: getComputedStyle(t.querySelector('.ux-sw-scrim')!).display,
      brandInBtn: !!t.querySelector('.ux-sw-btn .brand.kc .kc-word') && t.querySelector('.ux-sw-btn .kc-word')!.getBoundingClientRect().width > 40,
      ink: getComputedStyle(t.querySelector('a.ux-sw-i b')!).color,
      underline: getComputedStyle(t.querySelector('a.ux-sw-i')!).textDecorationLine,
      bullet: getComputedStyle(t.querySelector('.ux-sw-list')!).listStyleType,
    };
  });
}

async function semantics(page: import('@playwright/test').Page): Promise<void> {
  const rows = await page.evaluate(() => [...document.querySelectorAll('.top .ux-sw-i')].map((e) => ({ tag: e.tagName, site: e.getAttribute('data-site'), current: e.getAttribute('aria-current'), href: e.getAttribute('href'), check: !!e.querySelector('[data-end=check]') })));
  expect(rows).toEqual([
    { tag: 'A', site: 'kpop', current: null, href: '/k', check: false },
    { tag: 'A', site: 'anime', current: null, href: '/a', check: false },
    { tag: 'A', site: 'hub', current: null, href: '/', check: false },
    { tag: 'SPAN', site: 'cards', current: 'page', href: null, check: true },
  ]);
}

const sideways = (page: import('@playwright/test').Page): Promise<string[]> => page.evaluate(() => [...document.querySelectorAll('.top *')].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 0.5).map((e) => String((e as HTMLElement).className)));

for (const theme of ['light', 'dark'] as const) {
  test(`KpopCards bar, 1024 px, ${theme}: brand in the button, menu 340 px under it, rows of 60 px or more, no scrim, KpopCards current, Cards colours`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.setContent(pageOf(theme));
    const r = await measure(page);
    expect(r.brandInBtn).toBe(true);
    expect(Math.round(r.menu.width)).toBe(340);
    expect(r.menu.top).toBeGreaterThanOrEqual(r.btn.bottom);
    expect(Math.abs(r.menu.left - r.btn.left)).toBeLessThanOrEqual(12);
    expect(r.rows).toHaveLength(4);
    for (const h of r.rows) expect(h).toBeGreaterThanOrEqual(60);
    expect(r.scrim).toBe('none');
    expect(r.ink).toBe('rgb(26, 23, 20)'); // --txt1 of the Cards, not the dark ink of the site
    expect(r.underline).toBe('none');
    expect(r.bullet).toBe('none');
    await semantics(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await sideways(page)).toEqual([]);
  });
  test(`KpopCards bar, 375 px, ${theme}: the bar fits, menu full width with 10 px margins under it, rows of 64 px or more, a scrim`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.setContent(pageOf(theme));
    const r = await measure(page);
    expect(r.brandInBtn).toBe(true);
    expect(Math.round(r.menu.left)).toBe(10);
    expect(Math.round(r.menu.width)).toBe(355);
    expect(r.menu.top).toBeGreaterThanOrEqual(r.btn.bottom);
    for (const h of r.rows) expect(h).toBeGreaterThanOrEqual(64);
    expect(r.scrim).toBe('block');
    expect(r.ink).toBe('rgb(26, 23, 20)');
    await semantics(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await sideways(page)).toEqual([]);
  });
}

test('KpopCards bar, 768 px (tablet): no sideways scroll, menu 340 px', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.setContent(pageOf('light'));
  const r = await measure(page);
  expect(Math.round(r.menu.width)).toBe(340); // up to 760 px the phone layout; at 768 px the 340 px panel
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await sideways(page)).toEqual([]);
});

const LIVE = process.env.O1_CARDS_URL;
for (const width of [1024, 375] as const) {
  test(`live ${LIVE ?? '(O1_CARDS_URL unset)'}, ${width} px: the real bar opens the switcher, brand inside, four rows, no sideways scroll`, async ({ page }) => {
    test.skip(!LIVE, 'set O1_CARDS_URL to a KpopCards page of a hub dev server');
    await page.setViewportSize({ width, height: 800 });
    await page.goto(LIVE!);
    await page.locator('.top .ux-sw-btn').click();
    await expect(page.locator('.top .ux-sw-menu')).toBeVisible();
    await expect(page.locator('.top .ux-sw-btn .kc-word')).toBeVisible();
    expect(await page.locator('.top .ux-sw-i').count()).toBe(4);
    await expect(page.locator('.top [data-site=cards][aria-current=page]')).toHaveCount(1);
    await expect(page.locator('.top a[data-site=hub]')).toHaveAttribute('href', '/');
    const m = await measure(page);
    expect(Math.round(m.menu.width)).toBe(width === 1024 ? 340 : width - 20);
    for (const h of m.rows) expect(h).toBeGreaterThanOrEqual(width === 1024 ? 60 : 64);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}
