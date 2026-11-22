// Integrator, 2026-11-23 (after HUB-HOT-B): the two colours of the panels of "Popular this week", --hub-pnl-edge (the border) and --hub-pnl-hover
// (the ground of a row under the pointer), have a dark value, and every text that can sit on the hover ground keeps 4.5:1 in both themes.
// The values are read from the sheets themselves (h2.css for the hub tokens, a0.css for the shared ones), so a change of either is checked.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const STYLES = new URL('../../../styles/', import.meta.url);
const h2 = readFileSync(new URL('sites/hub/h2.css', STYLES), 'utf8');
const a0 = readFileSync(new URL('ux-v1/a0.css', STYLES), 'utf8');

/** The values of a custom property in a sheet, in order of appearance (light first, then the dark blocks). */
const values = (css: string, name: string): string[] => [...css.matchAll(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`, 'g'))].map((m) => m[1]!.toUpperCase());

function lum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const ratio = (a: string, b: string): number => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };

describe('the colours of the panels of Popular this week', () => {
  it('have a light value and a dark value (the dark one twice: the dark class and the system preference)', () => {
    for (const name of ['hub-pnl-edge', 'hub-pnl-hover']) {
      const v = values(h2, name);
      expect(v, name).toHaveLength(3);
      expect(v[1], name).toBe(v[2]);
      expect(v[0], name).not.toBe(v[1]);
    }
  });

  it('every text that can sit on the hover ground keeps 4.5:1, light and dark', () => {
    const [hoverLight, hoverDark] = values(h2, 'hub-pnl-hover');
    const shared = { ink: values(a0, 'ux-ink'), muted: values(a0, 'ux-muted') };
    const hub = { ink2: values(h2, 'hub-ink-2'), kInk: values(h2, 'hub-k-ink'), aInk: values(h2, 'hub-a-ink') };
    for (const [name, v] of Object.entries({ ...shared, ...hub })) {
      expect(ratio(v[0]!, hoverLight!), `${name} light`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(v[1]!, hoverDark!), `${name} dark`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('the rows on the hover ground read only those inks (no raw site colour for text)', () => {
    const rows = h2.split('\n').filter((l) => /\.hub-h2-(t1|t2|pnl|ntag|gauge)/.test(l) && /(^|[;{\s])color:/.test(l));
    expect(rows.length).toBeGreaterThan(0);
    for (const l of rows) expect(l, l.slice(0, 90)).not.toMatch(/(^|[;{\s])color:\s*var\(--hub-(s|k|a)\)/);
  });
});
