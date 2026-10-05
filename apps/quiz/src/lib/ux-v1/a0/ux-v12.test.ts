import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { UX_V12_TOKENS_DARK, UX_V12_TOKENS_LIGHT } from '@/lib/design-tokens';
import { uxV12From } from '@/lib/ux-v12';

import { storyFormat, storyLayout } from '@/components/ux-v1/story-image';

import { ANSWER_SHAPES } from './answer-shapes';
import { buildUxStylesheet, minifyCss, stripV12, V12_BEGIN, V12_END } from './stylesheet';
import { TEAM_NOTE, teamNote } from './team';
import { distributionRows } from './distribution';

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES = path.resolve(here, '../../../styles');
const css = fs.readFileSync(path.join(STYLES, 'ux-v1/a0.css'), 'utf8');

// isUxV12() = NEXT_PUBLIC_UX_V12 on AND NEXT_PUBLIC_UX_V1 on (V12 run rule 5).
// lib/ux-v1.ts reads its env once at import, so each case loads fresh modules.
async function load(v1: string | undefined, v12: string | undefined): Promise<boolean> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', v1 ?? '');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ?? '');
  const mod = await import('@/lib/ux-v12');
  return mod.isUxV12();
}

describe('isUxV12: the four flag combinations', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('both on: true', async () => { expect(await load('1', '1')).toBe(true); });
  it('v11 on, v12 off: false (today\'s v11)', async () => { expect(await load('1', undefined)).toBe(false); });
  it('v11 off, v12 on: false (v12 never runs without v11)', async () => { expect(await load(undefined, '1')).toBe(false); });
  it('both off: false (production today)', async () => { expect(await load(undefined, undefined)).toBe(false); });

  it('accepts 1 and true, nothing else', async () => {
    expect(await load('true', 'true')).toBe(true);
    expect(await load('1', '0')).toBe(false);
    expect(await load('1', 'yes')).toBe(false);
    expect(await load('0', '1')).toBe(false);
  });

  it('the pure rule', () => {
    expect(uxV12From(true, '1')).toBe(true);
    expect(uxV12From(true, undefined)).toBe(false);
    expect(uxV12From(false, '1')).toBe(false);
    expect(uxV12From(false, undefined)).toBe(false);
  });
});

describe('stylesheet: the v12 rules are served only with the v12 flag', () => {
  // The v11 route algorithm as it is on feat/v12 (app/api/ux-v1/a0/styles/route.ts).
  const v11Route = (dir: string): string => fs.readdirSync(dir).filter((f) => f.endsWith('.css'))
    .sort((a, b) => (a === 'a0.css' ? -1 : b === 'a0.css' ? 1 : a.localeCompare(b)))
    .map((f) => `/* ${f} */\n${minifyCss(fs.readFileSync(path.join(dir, f), 'utf8'))}`).join('\n');

  it('a0.css carries exactly one v12 block, at the end', () => {
    expect(css.split(V12_BEGIN).length).toBe(2);
    expect(css.split(V12_END).length).toBe(2);
    expect(css.indexOf(V12_BEGIN)).toBeLessThan(css.indexOf(V12_END));
    expect(css.slice(css.indexOf(V12_END) + V12_END.length).trim()).toBe('');
  });

  it('v12 off: no v12 rule, no ux-v12 file; v11 rules are the same bytes as before the block was added', () => {
    const off = buildUxStylesheet({ v12: false, stylesDir: STYLES });
    for (const cls of ['.ux-teamtag', '.ux-thm', '.ux-gtile', '.ux-steps3', '.ux-langsw', '.ux-ltiles', '.ux-pbtns', '.ux-rescard', '.ux-traits', '.ux-dist', '.ux-story', '--ux-lt-a']) {
      expect(off.includes(cls), cls).toBe(false);
    }
    // Same output as the v11 route run on a folder whose a0.css has no v12 block.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'a1-css-'));
    try {
      fs.mkdirSync(path.join(tmp, 'ux-v1'));
      for (const f of fs.readdirSync(path.join(STYLES, 'ux-v1'))) {
        const src = fs.readFileSync(path.join(STYLES, 'ux-v1', f), 'utf8');
        fs.writeFileSync(path.join(tmp, 'ux-v1', f), f === 'a0.css' ? src.slice(0, src.indexOf(V12_BEGIN)) : src);
      }
      expect(off).toBe(v11Route(path.join(tmp, 'ux-v1')));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('v12 on: the block is served, then every styles/ux-v12/<id>.css in name order', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'a1-css-'));
    try {
      fs.mkdirSync(path.join(tmp, 'ux-v1'));
      fs.mkdirSync(path.join(tmp, 'ux-v12'));
      fs.writeFileSync(path.join(tmp, 'ux-v1/a0.css'), `.a { color: red; }\n${V12_BEGIN}\n.ux-thm { display: block; }\n${V12_END}\n`);
      fs.writeFileSync(path.join(tmp, 'ux-v1/p1.css'), '.p1 { color: blue; }');
      fs.writeFileSync(path.join(tmp, 'ux-v12/g4.css'), '.g4 { color: green; }');
      fs.writeFileSync(path.join(tmp, 'ux-v12/g3.css'), '/* note */ .g3 { color: pink; }');
      expect(buildUxStylesheet({ v12: true, stylesDir: tmp })).toBe('/* a0.css */\n.a{color: red;}.ux-thm{display: block;}\n/* p1.css */\n.p1{color: blue;}\n/* ux-v12/g3.css */\n.g3{color: pink;}\n/* ux-v12/g4.css */\n.g4{color: green;}');
      expect(buildUxStylesheet({ v12: false, stylesDir: tmp })).toBe('/* a0.css */\n.a{color: red;}\n/* p1.css */\n.p1{color: blue;}');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('a missing ux-v12 folder is not an error', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'a1-css-'));
    try {
      fs.mkdirSync(path.join(tmp, 'ux-v1'));
      fs.writeFileSync(path.join(tmp, 'ux-v1/a0.css'), '.a { color: red; }');
      expect(buildUxStylesheet({ v12: true, stylesDir: tmp })).toBe('/* a0.css */\n.a{color: red;}');
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('stripV12 leaves a sheet without the block untouched', () => {
    expect(stripV12('.a{}')).toBe('.a{}');
  });
});

describe('v12 tokens: a0.css and lib/design-tokens.ts agree', () => {
  const v12 = css.slice(css.indexOf(V12_BEGIN));
  function block(selectorStart: string): Record<string, string> {
    const i = v12.indexOf(selectorStart);
    if (i < 0) throw new Error(`no block ${selectorStart}`);
    const body = v12.slice(v12.indexOf('{', i) + 1, v12.indexOf('}', i));
    const out: Record<string, string> = {};
    for (const [, k, v] of body.matchAll(/--ux-([a-z0-9-]+):\s*([^;]+);/g)) if (k && v) out[k] = v.trim().replace(/\s+/g, '');
    return out;
  }
  const norm = (v: string): string => v.replace(/\s+/g, '').toLowerCase();
  const light = block('html.ux-v1,\n.ux-theme-light');
  const dark = block('html.ux-v1.dark,\n.ux-theme-dark');
  const system = block('html.ux-v1:not(.light)');

  it('light', () => {
    expect(Object.keys(light).sort()).toEqual(Object.keys(UX_V12_TOKENS_LIGHT).sort());
    for (const [k, v] of Object.entries(UX_V12_TOKENS_LIGHT)) expect(norm(light[k] ?? ''), k).toBe(norm(v));
  });
  it('dark (class) and dark (system) are identical and match', () => {
    for (const [k, v] of Object.entries(UX_V12_TOKENS_DARK)) {
      if (k in dark) expect(norm(dark[k] ?? ''), k).toBe(norm(v));
      else expect(norm(light[k] ?? ''), `${k} (theme-independent)`).toBe(norm(v));
    }
    expect(system).toEqual(dark);
  });

  it('white on the four answer colours is AA (the tile text and the shapes)', () => {
    const lum = (h: string): number => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
    };
    for (const k of ['lt-a', 'lt-b', 'lt-c', 'lt-d'] as const) {
      expect(1.05 / (lum(UX_V12_TOKENS_LIGHT[k]) + 0.05), k).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('answer tiles: four colours, four shapes, always the same pairing', () => {
  it('triangle, diamond, circle, square in the prototype order', () => {
    expect(ANSWER_SHAPES.map((s) => s.name)).toEqual(['Triangle', 'Diamond', 'Circle', 'Square']);
    expect(ANSWER_SHAPES.map((s) => s.tone)).toEqual(['a', 'b', 'c', 'd']);
    expect(new Set(ANSWER_SHAPES.map((s) => s.d)).size).toBe(4);
  });
});

describe('team accounts (SYSTEM.md 5.6)', () => {
  it('the line under the name, post and profile', () => {
    expect(TEAM_NOTE).toBe('Editorial account of the KpopQuiz team. Topics and blogs are written by the team and checked before they go live.');
    expect(teamNote('profile')).toBe(TEAM_NOTE);
    expect(teamNote('post')).toBe(`${TEAM_NOTE} Replies come from fans.`);
  });
});

describe('result distribution: real shares only', () => {
  it('sorts by share, scales the bars to the largest share, keeps the real label', () => {
    const rows = distributionRows([{ id: 'a', label: 'A', pct: 10 }, { id: 'b', label: 'B', pct: 25 }, { id: 'c', label: 'C', pct: 0 }], 'a');
    expect(rows.map((r) => r.id)).toEqual(['b', 'a', 'c']);
    expect(rows.map((r) => r.width)).toEqual([100, 40, 0]);
    expect(rows.map((r) => r.text)).toEqual(['25%', '10%', '0%']);
    expect(rows.map((r) => r.me)).toEqual([false, true, false]);
  });
  it('drops rows whose share is not a real number, and hides when nothing is left', () => {
    expect(distributionRows([{ id: 'a', label: 'A', pct: Number.NaN }, { id: 'b', label: 'B', pct: -1 }])).toEqual([]);
    expect(distributionRows([])).toEqual([]);
  });
  it('all zero: no bar is drawn', () => {
    expect(distributionRows([{ id: 'a', label: 'A', pct: 0 }]).map((r) => r.width)).toEqual([0]);
  });
});

describe('story image variants', () => {
  it('story is 1080 x 1920, square is 1080 x 1080, each with its own file name', () => {
    expect(storyFormat(undefined)).toEqual({ width: 1080, height: 1920, fileName: 'kpopquiz-story.png' });
    expect(storyFormat('story')).toEqual({ width: 1080, height: 1920, fileName: 'kpopquiz-story.png' });
    expect(storyFormat('square')).toEqual({ width: 1080, height: 1080, fileName: 'kpopquiz-square.png' });
  });
  it('a card without v12 fields keeps the v11 layout (text ends at H - 200, footer at H - 110, 4 + 3 lines)', () => {
    expect(storyLayout({})).toEqual({ width: 1080, height: 1920, pad: 72, textBottom: 1720, footerY: 1810, maxLines1: 4, maxLines2: 3, qr: null });
  });
  it('the text never runs under the QR tile or the button, in both formats', () => {
    for (const format of ['story', 'square'] as const) {
      const l = storyLayout({ format, qr: 'data:image/png;base64,AA==', cta: 'Play at kpopquiz.org' });
      expect(l.qr).not.toBeNull();
      expect(l.textBottom).toBeLessThan(l.qr!.y);
      expect(l.qr!.x + l.qr!.size).toBe(l.width - l.pad);
      expect(l.qr!.y + l.qr!.size).toBe(l.height - l.pad);
      expect(l.footerY + 84).toBe(l.height - l.pad);
      const noQr = storyLayout({ format, cta: 'Play at kpopquiz.org' });
      expect(noQr.textBottom).toBeLessThan(noQr.footerY);
    }
    expect(storyLayout({ format: 'square' }).maxLines1).toBe(3);
    expect(storyLayout({ format: 'square' }).maxLines2).toBe(2);
  });
});
