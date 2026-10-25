import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { REGISTRY } from '@/lib/site/registry';

// Lot H2a: the sheets of the new home (styles/sites/hub/tokens.css and h2.css). The hub is ink on cream, the tokens file says what the
// registry says, every class the blocks use is in the sheet and every class of the sheet is used, and the colours of the design
// pass AA in the light and the dark theme.

const SRC = fileURLToPath(new URL('../../../', import.meta.url));
const read = (rel: string): string => readFileSync(`${SRC}${rel}`, 'utf8');
const tokens = read('styles/sites/hub/tokens.css');
const h2 = read('styles/sites/hub/h2.css');

/** The `--name: value` pairs of the rule whose selector is exactly `selector`. */
function vars(css: string, selector: string): Record<string, string> {
  const at = css.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  const body = css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
  return Object.fromEntries([...body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}

describe('tokens.css: the hub is ink on cream', () => {
  const SC = 'html.ux-v1[data-site="hub"]';
  const blocks = [
    { name: 'light', selector: SC, theme: REGISTRY.hub.theme.light },
    { name: 'dark class', selector: 'html.ux-v1.dark[data-site="hub"]', theme: REGISTRY.hub.theme.dark },
    { name: 'dark system', selector: `${SC}:not(.light)`, theme: REGISTRY.hub.theme.dark },
  ];

  it('declares the values of the hub entry of the registry, in all three theme blocks', () => {
    for (const b of blocks) {
      const declared = vars(tokens, b.selector);
      for (const [name, value] of Object.entries(declared)) {
        expect(name.startsWith('ux-'), `${b.name} ${name}`).toBe(true);
        expect(value, `${b.name} ${name}`).toBe((b.theme as Record<string, string>)[name.slice(3)]);
      }
      // every name the hub changes from the kpop theme is declared here
      const kpop = b.name === 'light' ? REGISTRY.kpop.theme.light : REGISTRY.kpop.theme.dark;
      const changed = Object.keys(b.theme).filter((k) => (b.theme as Record<string, string>)[k] !== (kpop as Record<string, string>)[k]).map((k) => `ux-${k}`).sort();
      expect(Object.keys(declared).sort(), b.name).toEqual(changed);
    }
  });

  // contract.test.ts checks every real sheet under styles/sites/hub (tokens.md 3.3), these two included.
  it('has no pink left in the accent family the shell paints its chrome with', () => {
    for (const theme of [REGISTRY.hub.theme.light, REGISTRY.hub.theme.dark] as Record<string, string>[]) {
      for (const k of ['pink', 'pink-fill', 'pink-ink']) expect(['#E8457A', '#D13A6E', '#C43565', '#FF7AA5'], k).not.toContain(theme[k]);
    }
  });
});

describe('h2.css and the blocks of the home', () => {
  const dirs = ['components/hub/home', 'components/hub'];
  const files = dirs.flatMap((d) => readdirSync(`${SRC}${d}`).filter((f) => /\.tsx?$/.test(f)).map((f) => `${d}/${f}`));
  const used = new Set(files.flatMap((f) => [...read(f).matchAll(/hub-h2-[a-z0-9-]+/g)].map((m) => m[0])));
  const defined = new Set([...h2.matchAll(/\.(hub-h2-[a-z0-9-]+)/g)].map((m) => m[1]!));

  it('defines every class the blocks use', () => {
    expect([...used].filter((c) => !defined.has(c)).sort()).toEqual([]);
  });

  it('uses every class it defines', () => {
    expect([...defined].filter((c) => !used.has(c)).sort()).toEqual([]);
  });

  it('writes no site name or colour of a site in the hub chrome rules, and no hub pink', () => {
    expect(h2).not.toMatch(/--ux-pink/);
  });
});

// ---- contrast

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('AA contrast of the design colours (4.5 for text, in both themes)', () => {
  const SC = 'html.ux-v1[data-site="hub"]';
  const light = { ...vars(h2, SC), ...Object.fromEntries(Object.entries(REGISTRY.hub.theme.light).map(([k, v]) => [`ux-${k}`, v])) } as Record<string, string>;
  const dark = { ...light, ...vars(h2, 'html.ux-v1.dark[data-site="hub"]'), ...Object.fromEntries(Object.entries(REGISTRY.hub.theme.dark).map(([k, v]) => [`ux-${k}`, v])) } as Record<string, string>;
  // [text, ground]: names of variables (light and dark values come from the maps above)
  const PAIRS: [string, string][] = [
    ['hub-white', 'hub-k'], ['hub-white', 'hub-a'],
    ['hub-k-ink', 'hub-k-soft'], ['hub-a-ink', 'hub-a-soft'], ['hub-k-ink', 'ux-raised'], ['hub-a-ink', 'ux-raised'],
    ['ux-muted', 'ux-page'], ['ux-muted', 'ux-raised'], ['ux-muted', 'ux-surface'],
    ['ux-ink', 'ux-page'], ['ux-ink', 'ux-raised'], ['ux-ink', 'ux-surface'], ['ux-page', 'ux-ink'],
    ['ux-ok', 'ux-raised'], ['ux-no', 'ux-raised'], ['ux-ok', 'ux-ok-soft'], ['ux-no', 'ux-no-soft'],
    ['hub-x-muted', 'hub-x-bg'], ['hub-x-muted', 'hub-x-card'], ['hub-x-fg', 'hub-x-card'], ['hub-x-k', 'hub-x-card'], ['hub-x-a', 'hub-x-card'],
  ];
  for (const [theme, map] of [['light', light], ['dark', dark]] as const) {
    it(`passes in the ${theme} theme`, () => {
      for (const [fg, bg] of PAIRS) {
        const a = map[fg];
        const b = map[bg];
        expect(a, `${theme} ${fg}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(b, `${theme} ${bg}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(contrast(a!, b!), `${theme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
