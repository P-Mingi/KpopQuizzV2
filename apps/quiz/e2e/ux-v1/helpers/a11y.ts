// Accessibility checks for v11 specs (DESIGN-SPEC 16.9, worker prompt "axe: 0
// serious or critical"). axe-core is NOT a dependency of the app: it is already
// installed with eslint-config-next (eslint-plugin-jsx-a11y -> axe-core) and is
// resolved from there. If it cannot be resolved, runAxe() returns null and the
// caller keeps the dependency-free basicA11y() checks.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import { APP_DIR } from './env';

import type { Page } from '@playwright/test';

function axePath(): string | null {
  try {
    const cfg = fs.realpathSync(path.join(APP_DIR, 'node_modules/eslint-config-next'));
    const plugin = createRequire(path.join(cfg, 'index.js')).resolve('eslint-plugin-jsx-a11y');
    return createRequire(plugin).resolve('axe-core');
  } catch {
    return null;
  }
}

export interface AxeFinding { id: string; impact: string; help: string; nodes: string[] }

/** Serious + critical axe violations (null when axe-core is unavailable). */
export async function runAxe(page: Page, opts: { include?: string; exclude?: string[] } = {}): Promise<AxeFinding[] | null> {
  const p = axePath();
  if (!p) return null;
  await page.addScriptTag({ path: p });
  return page.evaluate(async ({ include, exclude }) => {
    const w = window as unknown as { axe: { run: (ctx: unknown, o: unknown) => Promise<{ violations: { id: string; impact: string | null; help: string; nodes: { target: string[] }[] }[] }> } };
    const ctx = include ? { include: [include], exclude: exclude.map((e) => [e]) } : { exclude: exclude.map((e) => [e]) };
    const r = await w.axe.run(ctx, { resultTypes: ['violations'] });
    return r.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => ({ id: v.id, impact: String(v.impact), help: v.help, nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) }));
  }, { include: opts.include ?? null, exclude: opts.exclude ?? [] });
}

/** Dependency-free basics: one H1, named controls, unique ids, alt on images,
 *  aria-controls / aria-labelledby targets exist. Returns human-readable issues. */
export async function basicA11y(page: Page, rootSelector?: string): Promise<string[]> {
  return page.evaluate((rootSel) => {
    const issues: string[] = [];
    const roots: ParentNode[] = rootSel ? Array.from(document.querySelectorAll(rootSel)) : [document];
    const all = (sel: string): Element[] => roots.flatMap((r) => Array.from(r.querySelectorAll(sel)));
    if (!rootSel) {
      const h1s = Array.from(document.querySelectorAll('h1'));
      if (h1s.length !== 1) issues.push(`expected exactly one h1, found ${h1s.length}`);
    }
    const ids = new Map<string, number>();
    document.querySelectorAll('[id]').forEach((el) => ids.set(el.id, (ids.get(el.id) ?? 0) + 1));
    for (const el of all('[id]')) { const n = ids.get(el.id) ?? 0; if (n > 1) issues.push(`duplicate id "${el.id}" x${n}`); }
    const named = (el: Element): boolean => {
      const label = el.getAttribute('aria-label') || el.getAttribute('title');
      if (label && label.trim()) return true;
      const by = el.getAttribute('aria-labelledby');
      if (by && by.split(/\s+/).every((i) => document.getElementById(i))) return true;
      if ((el.textContent ?? '').trim()) return true;
      if (el.querySelector('img[alt]:not([alt=""])')) return true;
      const labels = (el as HTMLInputElement).labels;
      if (labels && labels.length > 0) return true;
      if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
      if (el.closest('label')) return true;
      return false;
    };
    all('button, a[href], input:not([type="hidden"]), textarea, select, [role="tab"], [role="switch"], [role="menuitem"]').forEach((el) => {
      const h = el as HTMLElement;
      if (h.offsetParent === null && getComputedStyle(h).position !== 'fixed') return;
      if (!named(el)) issues.push(`unnamed ${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(' ')[0]}` : ''}`);
    });
    all('img:not([alt])').forEach((img) => issues.push(`img without alt: ${(img as HTMLImageElement).src.slice(0, 80)}`));
    all('[aria-controls]').forEach((el) => {
      const t = el.getAttribute('aria-controls') ?? '';
      if (t && !document.getElementById(t)) issues.push(`aria-controls target missing: ${t}`);
    });
    return [...new Set(issues)];
  }, rootSelector ?? null);
}

/** The focus ring of the element that has focus (16.9: 2px pink). */
export async function focusRing(page: Page): Promise<{ tag: string; outline: string; boxShadow: string } | null> {
  // Legacy `transition: all` rules can animate the outline in: read after it settles.
  await page.waitForTimeout(350);
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const cs = getComputedStyle(el);
    return { tag: el.tagName.toLowerCase(), outline: `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`, boxShadow: cs.boxShadow };
  });
}
