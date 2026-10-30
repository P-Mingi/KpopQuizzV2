// Surprise me with a class prefix (owner, 2026-10-29 and 2026-10-30; TWINS row 1, code A8): the hub keeps its markup byte for byte, and the
// OtakuQuiz home gets the same markup under anime-h2, the classes its sheet styles (styles/sites/anime/h2.css, tokens.md 3.3 rule 6).
// The pick row shows after a click; renderToStaticMarkup cannot click, so useState is replaced here to start on a pick when `forced.pick`
// is set (the rest of React is the real one).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HomeSurprise } from './home-surprise';

import type { SurprisePick } from './home-surprise';

const forced = vi.hoisted(() => ({ pick: null as unknown }));
vi.mock('react', async (importOriginal) => {
  const real = await importOriginal<typeof import('react')>();
  const useState = ((init: unknown) => {
    const [v, set] = real.useState(init);
    return forced.pick ? [forced.pick, set] : [v, set];
  }) as typeof real.useState;
  return { ...real, default: { ...real, useState }, useState };
});

afterEach(() => { forced.pick = null; });

const card = (id: string, site: 'kpop' | 'anime'): SurprisePick => ({ id, tile: id.toUpperCase(), title: `Quiz ${id}`, href: `https://x.test/${id}`, site, pickLabel: `Random pick on ${site}` });
const LABELS = { button: 'Surprise me', play: 'Play', another: 'Another' };
const render = (prefix?: 'hub-h2' | 'anime-h2'): string =>
  renderToStaticMarkup(createElement(HomeSurprise, { pool: [card('a', 'kpop'), card('b', 'anime')], playedIds: [], lede: 'Pick your side, or play both.', labels: LABELS, ...(prefix ? { prefix } : {}) }));
const classesOf = (html: string): string[] => [...new Set([...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1]!.split(' ')))].sort();

describe('Surprise me on the hub (no prefix given)', () => {
  it('prints the hub markup exactly, before and after a click', () => {
    expect(render()).toBe(render('hub-h2'));
    expect(render()).toMatch(/^<div class="hub-h2-lede-row"><p class="hub-h2-lede">Pick your side, or play both\.<\/p><button type="button" class="hub-h2-ghost hub-h2-btn"><svg /);
    forced.pick = card('b', 'anime');
    const html = render();
    expect(html).toBe(render('hub-h2'));
    expect(html).toContain(
      '<div role="status" class="hub-h2-pick hub-h2-rise hub-h2-s-a"><span aria-hidden="true" class="hub-h2-th hub-h2-pick-tile">B</span>'
      + '<span class="hub-h2-pick-body"><span class="hub-h2-pick-k">Random pick on anime</span><span class="hub-h2-pick-t hub-h2-clamp">Quiz b</span></span>'
      + '<a href="https://x.test/b" class="hub-h2-pick-play hub-h2-btn">Play</a><button type="button" class="hub-h2-pick-again">Another</button></div>',
    );
    forced.pick = card('a', 'kpop');
    expect(render()).toContain('class="hub-h2-pick hub-h2-rise hub-h2-s-k"');
  });
});

describe('Surprise me on the OtakuQuiz home (prefix anime-h2)', () => {
  it('prints the same markup with every class under anime-h2, and no hub class', () => {
    const same = (html: string): string => html.replace(/\bhub-h2-/g, 'anime-h2-');
    expect(render('anime-h2')).toBe(same(render()));
    expect(render('anime-h2')).not.toContain('hub-h2');
    forced.pick = card('b', 'anime');
    expect(render('anime-h2')).toBe(same(render()));
    expect(render('anime-h2')).toContain('<div role="status" class="anime-h2-pick anime-h2-rise anime-h2-s-a">');
    expect(render('anime-h2')).not.toContain('hub-h2');
  });

  it('is styled by the anime sheet: every class it prints (and the wrapper of the home) has a rule there, every rule is for one of them', () => {
    const sheet = readFileSync(fileURLToPath(new URL('../../../styles/sites/anime/h2.css', import.meta.url)), 'utf8');
    // The rules of every site sheet (scope, anime-h2 classes only, tokens) are checked by lib/site/contract.test.ts on every real sheet.
    const before = render('anime-h2');
    forced.pick = card('b', 'anime');
    const after = render('anime-h2');
    const printed = new Set(['anime-h2-surprise', ...classesOf(before), ...classesOf(after)]);
    const defined = new Set([...sheet.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/\.(anime-h2-[a-z0-9-]+)/g)].map((m) => m[1]!));
    expect([...printed].filter((c) => !defined.has(c)).sort()).toEqual([]);
    expect([...defined].filter((c) => !printed.has(c)).sort()).toEqual([]);
    // Calm motion: the pick rises in, and stands still under prefers-reduced-motion.
    expect(sheet).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.anime-h2-rise \{ animation: none; \}/);
  });
});
