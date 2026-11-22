// Owner, 2026-11-22 ("on Bunnyverse the navbar should also be at the bottom"): the hub home and the daily games pages, which draw their own top
// bar (the bare shell), get the phone tab bar of every other page; their top tabs hide up to 900 px, as .ux-links do; with six tabs the cards
// tab reads "Cards" so the labels never run into each other.
import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

const read = (rel: string): string => readFileSync(new URL(rel, import.meta.url), 'utf8');

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('the phone tab bar of the hub', () => {
  it('the bare shell (hub home, daily games) draws the tab bar too', () => {
    const src = read('./ux-client-shell.tsx');
    // The bare branch ends where the full shell's top bar starts.
    const bare = src.slice(src.indexOf('if (bare &&'), src.indexOf('<UxChromeGate part="nav">'));
    expect(bare).toContain('<UxChromeGate part="tabbar"><UxTabBar /></UxChromeGate>');
  });

  it('the top tabs of the home and of the daily games hide up to 900 px', () => {
    const h2 = read('../../../styles/sites/hub/h2.css');
    const dle = read('../../../styles/sites/hub/dle.css');
    expect(h2).toMatch(/@media \(max-width: 900px\) \{\n\s+html\.ux-v1\[data-site="hub"\] \.hub-h2-tabs \{ display: none; \}/);
    expect(dle).toMatch(/@media \(max-width: 900px\) \{\n\s+html\.ux-v1\[data-site="hub"\] \.hub-dle-tabs \{ display: none; \}/);
  });

  it('with KpopCards on, six short labels: Home, Daily, Quizzes, Community, Cards, You', async () => {
    vi.stubEnv('NEXT_PUBLIC_NET_CARDS', '1');
    const { tabItemsFor } = await import('@/lib/ux-v1/a0/nav');
    const { REGISTRY } = await import('@/lib/site/registry');
    const labels = tabItemsFor({ ...REGISTRY.hub, features: { ...REGISTRY.hub.features, dailyGuess: true } } as typeof REGISTRY.hub).map((t) => t.label);
    expect(labels).toContain('Cards');
    expect(labels).not.toContain('KpopCards');
    for (const l of labels) expect(l.length, l).toBeLessThanOrEqual(9);
  });
});
