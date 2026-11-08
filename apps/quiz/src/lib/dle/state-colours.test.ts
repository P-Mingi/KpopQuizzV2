// Owner feedback 2026-11-08, item 1: Right is green, Close is red with the stripes, Wrong is grey, on every dle game and in both themes. This reads the stylesheet the games ship
// (styles/sites/hub/dle.css), so a change of a token fails here, and proves the text of every cell is AA (4.5:1) on the colour under it (the lighter and the darker stripe for Close).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const CSS = readFileSync(join(__dirname, '../../styles/sites/hub/dle.css'), 'utf8');

const lum = (hex: string): number => {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0]! + 0.7152 * v[1]! + 0.0722 * v[2]!;
};
const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

/** The custom properties a block of the stylesheet sets, from the line that opens with `open` to its closing brace. */
function tokens(open: string, from = 0): Record<string, string> {
  const start = CSS.indexOf(open, from);
  expect(start, open).toBeGreaterThanOrEqual(0);
  const body = CSS.slice(start, CSS.indexOf('\n}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})/g)) out[m[1]!] = m[2]!;
  return out;
}

const LIGHT = tokens('html.ux-v1[data-site="hub"] {\n  --hub-dle-wrong');
const DARK = { ...LIGHT, ...tokens('html.ux-v1.dark[data-site="hub"] {') };
const DARK_AUTO = { ...LIGHT, ...tokens('  html.ux-v1[data-site="hub"]:not(.light) {') };

describe('the cell colours, in the stylesheet', () => {
  const rule = (sel: string): string => CSS.split('\n').find((l) => l.includes(`${sel} {`)) ?? '';
  it('Right paints with the green tokens, Close with the stripes of the red tokens, Wrong stays grey', () => {
    expect(rule('.hub-dle-t-correct')).toContain('background: var(--hub-dle-right)');
    expect(rule('.hub-dle-t-correct')).toContain('color: var(--hub-dle-right-ink)');
    expect(rule('.hub-dle-sw-correct')).toContain('background: var(--hub-dle-right)');
    expect(rule('.hub-dle-t-near')).toContain('repeating-linear-gradient(135deg, var(--hub-dle-near-1) 0 6px, var(--hub-dle-near-2) 6px 12px)');
    expect(rule('.hub-dle-sw-near')).toContain('repeating-linear-gradient(135deg, var(--hub-dle-near-1) 0 3px, var(--hub-dle-near-2) 3px 6px)');
    expect(rule('.hub-dle-t-wrong')).toContain('background: var(--hub-dle-wrong)');
  });

  it('no game overrides the tokens of the states: no pink or orange Right or Close', () => {
    const overrides = CSS.split('\n').filter((l) => /\.hub-dle-[ak]\b[^{]*\{[^}]*--hub-dle-(near|right|wrong)/.test(l));
    expect(overrides).toEqual([]);
  });

  it('the green is green and the stripes are red, in both themes', () => {
    const hue = (hex: string): number => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
      const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
      if (d === 0) return -1;
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    for (const t of [LIGHT, DARK, DARK_AUTO]) {
      expect(hue(t['hub-dle-right']!)).toBeGreaterThan(90);
      expect(hue(t['hub-dle-right']!)).toBeLessThan(160);
      for (const k of ['hub-dle-near-1', 'hub-dle-near-2', 'hub-dle-near-ink', 'hub-dle-near-edge']) {
        const h = hue(t[k]!);
        expect(h === -1 || h < 15 || h > 345, `${k} ${t[k]}`).toBe(true);
      }
    }
  });
});

describe('the text of every cell is AA (4.5:1), computed', () => {
  const themes = { light: LIGHT, dark: DARK, 'dark (system)': DARK_AUTO } as const;
  for (const [name, t] of Object.entries(themes)) {
    it(`${name}: Right, Close (both stripes), Wrong`, () => {
      const r = {
        right: ratio(t['hub-dle-right-ink']!, t['hub-dle-right']!),
        nearOnLight: ratio(t['hub-dle-near-ink']!, t['hub-dle-near-1']!),
        nearOnDark: ratio(t['hub-dle-near-ink']!, t['hub-dle-near-2']!),
        wrong: ratio(t['hub-dle-wrong-ink']!, t['hub-dle-wrong']!),
      };
      for (const [k, v] of Object.entries(r)) expect(v, `${name} ${k}`).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('the colour-blind palette (blue and orange, an option of the settings) stays AA too', () => {
    const lines = CSS.split('\n').filter((l) => l.includes('.hub-dle-cb .hub-dle-t-'));
    const blue = lines.find((l) => l.includes('.hub-dle-t-correct'))!;
    expect(ratio('#FFFFFF', blue.match(/background: (#[0-9A-F]{6})/)![1]!)).toBeGreaterThanOrEqual(4.5);
    const near = lines.find((l) => l.includes('.hub-dle-t-near'))!;
    const [a, b, ink] = [...near.matchAll(/#[0-9A-F]{6}/g)].map((m) => m[0]);
    expect(ratio(ink!, a!)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(ink!, b!)).toBeGreaterThanOrEqual(4.5);
  });
});
