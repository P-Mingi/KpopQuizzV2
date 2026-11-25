// Owner, 2026-11-10 (was 2026-11-08: Close red, Wrong grey): Right is green, Wrong is RED, on every dle game and in both themes. Owner, 2026-11-25 (DLE2-A): Close is a SOLID yellow, #EFC94C with the ink #412402, no stripes, everywhere
// (tiles, legend, the home modules). This reads the stylesheet the games ship
// (styles/sites/hub/dle.css), so a change of a token fails here, and proves the text of every cell is AA (4.5:1) on the colour under it (Close: the one yellow).
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
  it('Right paints with the green tokens, Close with the solid yellow token, Wrong with the red tokens', () => {
    expect(rule('.hub-dle-t-correct')).toContain('background: var(--hub-dle-right)');
    expect(rule('.hub-dle-t-correct')).toContain('color: var(--hub-dle-right-ink)');
    expect(rule('.hub-dle-sw-correct')).toContain('background: var(--hub-dle-right)');
    expect(rule('.hub-dle-t-near')).toContain('background: var(--hub-dle-near); color: var(--hub-dle-near-ink)');
    expect(rule('.hub-dle-sw-near')).toContain('background: var(--hub-dle-near)');
    expect(CSS).not.toContain('repeating-linear-gradient(135deg');
    expect(rule('.hub-dle-t-wrong')).toContain('background: var(--hub-dle-wrong)');
  });

  it('no game overrides the tokens of the states: no pink or orange Right or Close', () => {
    const overrides = CSS.split('\n').filter((l) => /\.hub-dle-[ak]\b[^{]*\{[^}]*--hub-dle-(near|right|wrong)/.test(l));
    expect(overrides).toEqual([]);
  });

  it('the green is green, Close is the yellow of the owner and Wrong is red, in both themes', () => {
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
      // Close: the solid yellow of the owner (2026-11-25) with its brown ink, in every theme
      expect(t['hub-dle-near']).toBe('#EFC94C');
      expect(t['hub-dle-near-ink']).toBe('#412402');
      const y = hue(t['hub-dle-near']!);
      expect(y >= 40 && y <= 55, `yellow hue ${y}`).toBe(true);
      // was: Wrong grey; now red, with white text
      const w = hue(t['hub-dle-wrong']!);
      expect(w >= 0 && (w < 10 || w > 350), `hub-dle-wrong ${t['hub-dle-wrong']}`).toBe(true);
      expect(t['hub-dle-wrong-ink']).toBe('#FFFFFF');
    }
  });
});

describe('Close is the one solid yellow, never striped (owner 2026-11-25)', () => {
  it('the three themes carry the same two tokens and no stripe token is left', () => {
    for (const t of [LIGHT, DARK, DARK_AUTO]) {
      expect(t['hub-dle-near']).toBe('#EFC94C');
      expect(t['hub-dle-near-1']).toBeUndefined();
      expect(t['hub-dle-near-2']).toBeUndefined();
    }
  });
  // The colour-blind option keeps blue and grey and now shares the yellow of Close (no pastel stripes of its own).
  // The fill stays #EFC94C (1.5:1 on the light page): a 1 px edge in a darker yellow makes the shape read at 3:1 on the page (the coordinator asked for about #C9A227, which is only 2.3:1, so #A88414 is used).
  it('near tiles and the legend square carry a 1 px edge that reads at 3:1 on the page, the fill and the ink unchanged', () => {
    for (const t of [LIGHT, DARK, DARK_AUTO]) expect(t['hub-dle-near-edge']).toBe('#A88414');
    expect(ratio(LIGHT['hub-dle-near-edge']!, '#FAF8F5')).toBeGreaterThanOrEqual(3);
    expect(ratio(DARK['hub-dle-near-edge']!, '#141312')).toBeGreaterThanOrEqual(3);
    expect(CSS.split('\n').find((l) => l.includes('.hub-dle-t-near {'))).toContain('box-shadow: inset 0 0 0 1px var(--hub-dle-near-edge)');
    expect(CSS.split('\n').find((l) => l.includes('.hub-dle-sw-near {'))).toContain('box-shadow: inset 0 0 0 1px var(--hub-dle-near-edge)');
  });
  it('the colour-blind option has no rule of its own for Close', () => {
    expect(CSS.split('\n').filter((l) => /\.hub-dle-cb .*(t|sw)-near/.test(l))).toEqual([]);
  });
  // The two home modules draw a row of clues as decoration: Close with the same yellow, Wrong red.
  for (const [file, prefix] of [['kpopdle-home.tsx', '.p1-kd'], ['anime-daily-home.tsx', '.p5-ad']] as const) {
    it(`the ${file} module: Close with the yellow of the games, Wrong red`, () => {
      const mod = readFileSync(join(__dirname, `../../components/home/ux-v1/${file}`), 'utf8');
      const line = (cls: string): string => mod.split('\n').find((l) => l.startsWith(`${prefix}-${cls} `)) ?? '';
      expect(line('near')).toContain('background: var(--ux-close)');
      expect(line('near')).not.toContain('repeating-linear-gradient');
      const a0 = readFileSync(join(__dirname, '../../styles/ux-v1/a0.css'), 'utf8');
      expect(a0.match(/--ux-close: (#[0-9A-F]{6}); --ux-close-2: (#[0-9A-F]{6});/g)).toEqual(Array(3).fill(`--ux-close: ${LIGHT['hub-dle-near']}; --ux-close-2: ${LIGHT['hub-dle-near']};`));
      expect(line('off')).toContain('background: var(--ux-no)');
      expect(line('t')).toContain('background: var(--ux-ok)');
    });
  }
});

describe('the text of every cell is AA (4.5:1), computed', () => {
  const themes = { light: LIGHT, dark: DARK, 'dark (system)': DARK_AUTO } as const;
  for (const [name, t] of Object.entries(themes)) {
    it(`${name}: Right, Close, Wrong`, () => {
      const r = {
        right: ratio(t['hub-dle-right-ink']!, t['hub-dle-right']!),
        near: ratio(t['hub-dle-near-ink']!, t['hub-dle-near']!),
        wrong: ratio(t['hub-dle-wrong-ink']!, t['hub-dle-wrong']!),
      };
      for (const [k, v] of Object.entries(r)) expect(v, `${name} ${k}`).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('the colour-blind palette (blue and grey, an option of the settings) stays AA too', () => {
    const lines = CSS.split('\n').filter((l) => l.includes('.hub-dle-cb .hub-dle-t-'));
    const blue = lines.find((l) => l.includes('.hub-dle-t-correct'))!;
    expect(ratio('#FFFFFF', blue.match(/background: (#[0-9A-F]{6})/)![1]!)).toBeGreaterThanOrEqual(4.5);
    // Close keeps the yellow in this option too (AA is proved above); blue against yellow stays apart.
    // the colour-blind option keeps Wrong grey (blue, orange, grey: as the owner kept it), AA in every theme
    const wrong = lines.find((l) => l.includes('.hub-dle-t-wrong'))!;
    expect(wrong).toContain('background: var(--hub-dle-cb-wrong); color: var(--hub-dle-cb-wrong-ink)');
    for (const t of Object.values(themes)) {
      expect(t['hub-dle-cb-wrong']).toMatch(/^#(DCD6CD|3A3631)$/);
      expect(ratio(t['hub-dle-cb-wrong-ink']!, t['hub-dle-cb-wrong']!)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
