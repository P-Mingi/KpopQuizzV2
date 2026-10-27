// Run O1, lane B1 (tokens.md 3.1): the per-site sheets that buildUxStylesheet appends on anime and hub builds,
// and the guarantee that the kpop build reads nothing from styles/sites/.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { buildUxStylesheet, siteSheetFiles, uxStylesheetVersion } from '@/lib/ux-v1/a0/stylesheet';

const dir = mkdtempSync(join(tmpdir(), 'o1-b1-styles-'));
const put = (rel: string, css: string): void => {
  mkdirSync(join(dir, rel, '..'), { recursive: true });
  writeFileSync(join(dir, rel), css);
};
put('ux-v1/a0.css', '.a0 { color: red; }');
put('ux-v1/p1.css', '.p1 { color: blue; }');
put('ux-v12/g1.css', '.g1 { color: green; }');

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('buildUxStylesheet by site', () => {
  const base = buildUxStylesheet({ v12: true, stylesDir: dir, site: 'kpop' });

  it('kpop reads nothing from styles/sites: same bytes, same ?v= whether the folder exists or not', () => {
    put('sites/anime/tokens.css', 'html.ux-v1[data-site="anime"] { --ux-pink: #E2501C; }');
    expect(buildUxStylesheet({ v12: true, stylesDir: dir, site: 'kpop' })).toBe(base);
    expect(uxStylesheetVersion(buildUxStylesheet({ v12: true, stylesDir: dir, site: 'kpop' }))).toBe(uxStylesheetVersion(base));
    expect(base).not.toContain('E2501C');
  });

  it('anime appends its folder after the v11 and v12 sheets, tokens.css first, the others by file name', () => {
    put('sites/anime/tokens.css', 'html.ux-v1[data-site="anime"] { --ux-pink: #E2501C; }');
    put('sites/anime/o3.css', '.anime-o3-x { color: red; }');
    put('sites/anime/o2.css', '.anime-o2-x { color: red; }');
    put('sites/hub/tokens.css', 'html.ux-v1[data-site="hub"] { --ux-pink: #123456; }');
    const css = buildUxStylesheet({ v12: true, stylesDir: dir, site: 'anime' });
    expect(css.startsWith(base)).toBe(true);
    const order = ['/* sites/anime/tokens.css */', '/* sites/anime/o2.css */', '/* sites/anime/o3.css */'].map((m) => css.indexOf(m));
    expect(order.every((i) => i > base.length - 1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(css).not.toContain('123456');
    expect(buildUxStylesheet({ v12: true, stylesDir: dir, site: 'hub' })).toContain('/* sites/hub/tokens.css */');
  });

  it('a site without a folder adds nothing', () => {
    expect(buildUxStylesheet({ v12: false, stylesDir: join(dir, 'missing-parent'), site: 'hub' })).toBe('');
  });

  it('siteSheetFiles puts tokens.css first and sorts the rest', () => {
    expect(siteSheetFiles(['o3.css', 'tokens.css', 'o1.css'])).toEqual(['tokens.css', 'o1.css', 'o3.css']);
  });
});
