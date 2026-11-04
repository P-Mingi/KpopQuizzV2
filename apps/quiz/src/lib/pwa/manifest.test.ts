// Run PWA (docs/o1/PWA-PLAN.md, section 2): the manifests. kpopquiz.org's public/site.webmanifest is extended (id, scope, start_url
// /?source=pwa, display standalone, 192 and 512 icons any and maskable); Bunnyverse's own manifest is public/brand/hub/site.webmanifest, answered at
// /site.webmanifest on the hub build only (the brand rewrite of lib/site/routing.ts). These tests read the files, so they go in the same commit as
// public/site.webmanifest.
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { KPOP_ICON_FILES, PER_SITE_BRAND_FILES, middlewareStep, rewritesFor } from '@/lib/site/routing';

const SRC = new URL('../../', import.meta.url).pathname;
const PUBLIC = join(SRC, '..', 'public');

describe('the manifests (plan, section 2)', () => {
  const kpop = JSON.parse(readFileSync(join(PUBLIC, 'site.webmanifest'), 'utf8')) as Record<string, unknown> & { icons: { src: string; sizes: string; type: string; purpose: string }[] };
  const hub = JSON.parse(readFileSync(join(PUBLIC, 'brand/hub/site.webmanifest'), 'utf8')) as Record<string, unknown> & { icons: { src: string; sizes: string }[] };

  it('kpopquiz.org: opens on /?source=pwa, in scope /, standalone, with a stable id, its colours and the 192 and 512 icons, any then maskable', () => {
    expect(kpop.id).toBe('/');
    expect(kpop.start_url).toBe('/?source=pwa');
    expect(kpop.scope).toBe('/');
    expect(kpop.display).toBe('standalone');
    expect(kpop.name).toBe('KpopQuiz');
    expect(kpop.short_name).toBe('KpopQuiz');
    expect(kpop.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(kpop.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    const purposes = (size: string): string[] => kpop.icons.filter((i) => i.sizes === size).map((i) => i.purpose);
    expect(purposes('192x192')).toEqual(['any', 'maskable']);
    expect(purposes('512x512')).toEqual(['any', 'maskable']);
    for (const i of kpop.icons) {
      expect(KPOP_ICON_FILES).toContain(i.src);
      expect(statSync(join(PUBLIC, 'brand/kpop', i.src)).isFile(), i.src).toBe(true);
    }
  });

  it('kpopquiz.org: the start address creates no page and the home keeps its canonical (the query is read by nothing)', () => {
    const home = readFileSync(join(SRC, 'app/(site)/page.tsx'), 'utf8');
    expect(home).not.toMatch(/searchParams/);
    expect(home).toMatch(/canonical: '\/'/);
    const url = new URL('https://kpopquiz.org/?source=pwa');
    expect(url.pathname).toBe('/');
    expect(middlewareStep('kpop', url.pathname)).toBe('kpop');
  });

  it('the manifest link of the kpop head is the one it already had: the served head does not change', () => {
    const layout = readFileSync(join(SRC, 'app/layout.tsx'), 'utf8');
    expect(layout).toContain("manifest: '/site.webmanifest'");
    expect(layout).toContain('export const viewport: Viewport = siteViewport();');
  });

  it('Bunnyverse: its own manifest, served on the hub build only through the brand rewrite, installable (name, standalone, 192 and 512, start at /)', () => {
    expect(PER_SITE_BRAND_FILES).toContain('/site.webmanifest');
    expect(rewritesFor('hub')).toContainEqual({ source: '/site.webmanifest', destination: '/brand/hub/site.webmanifest' });
    expect(rewritesFor('kpop')).toEqual([]);
    expect(hub.name).toBe('Bunnyverse');
    expect(hub.display).toBe('standalone');
    expect(hub.start_url).toBe('/');
    expect(hub.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(hub.icons.map((i) => i.sizes).sort()).toEqual(['192x192', '512x512']);
    for (const i of hub.icons) expect(statSync(join(PUBLIC, 'brand/hub', i.src)).isFile(), i.src).toBe(true);
  });
});
