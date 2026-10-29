// Trending this week on the OtakuQuiz home (owner, 2026-10-29): the same two rows of four and the same image height as the
// kpopquiz.org home. The grid is the shared one (styles/ux-v12/home.css, served on every v12 build); the anime build marks the
// block with anime-o2-trend (the SERIES_ART slot is filled on that build only), and styles/sites/anime/o2.css gives the series art
// the 4:3 box of the kpop card there. kpop renders what it rendered before.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { QuizCardData } from '@/lib/db/types';

const quiz = (i: number, slug: string, name: string): QuizCardData => ({
  id: `q-${i}`, slug: `quiz-${i}`, title: `Quiz ${i}`, group_name: name, group_slug: slug, quiz_type: 'multiple_choice',
  difficulty: 'easy', play_count: 20, cover_image_url: null,
} as unknown as QuizCardData);

// One series with a free photo (bleach, docs/anime/images) and one with none, so both covers are drawn.
const TRENDING = [quiz(1, 'bleach', 'Bleach'), quiz(2, 'no-photo-series', 'No Photo Series')];

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => null }));
vi.mock('@/components/home/activity-ticker', () => ({ ActivityTicker: () => null }));
vi.mock('./islands', () => ({ HomeHeader: () => null, ContinuePlaying: () => null, BlindtestBand: () => null, QotdNote: () => null }));
vi.mock('@/lib/ux-v1/p1/home-data', () => ({
  getHomeQotd: async () => null,
  getHomeGroups: async () => ({ groups: [], visibleGroups: 0 }),
  getHomeCommunity: async () => ({ rows: [], verse: null }),
  getHomeBand: async () => ({ date: '2026-10-29', fans: 0 }),
  getHomeLists: async () => ({ trending: TRENDING, best: [], fresh: [] }),
}));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function homeOn(site: 'kpop' | 'anime'): Promise<string> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site === 'anime') {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    // What the anime layout does before the page renders: fill the SERIES_ART slot.
    await import('@/components/anime/register-art');
  }
  const { UxHome } = await import('./ux-home');
  return renderToStaticMarkup(await UxHome({}));
}

const trendBlock = (html: string): string => {
  const at = html.indexOf('aria-labelledby="p1-trend-h"');
  expect(at).toBeGreaterThan(-1);
  return html.slice(at, html.indexOf('</section>', at));
};

const SRC = fileURLToPath(new URL('../../../', import.meta.url));
const o2 = readFileSync(`${SRC}styles/sites/anime/o2.css`, 'utf8');
const a0 = readFileSync(`${SRC}styles/ux-v1/a0.css`, 'utf8');
const v12Home = readFileSync(`${SRC}styles/ux-v12/home.css`, 'utf8');

describe('Trending this week, kpop', () => {
  it('keeps its wrapper and its cards as before: no anime class, the plain 4:3 cover', async () => {
    const block = trendBlock(await homeOn('kpop'));
    expect(block).toContain('<div class="p1-trend"><div class="ux-qgrid">');
    expect(block).not.toContain('anime-o2');
    expect((block.match(/class="ux-qcard"/g) ?? []).length).toBe(2);
    expect(block).toContain('class="ux-qcov"');
  });
});

describe('Trending this week, anime', () => {
  it('marks its grid with anime-o2-trend and dresses each card with the series art', async () => {
    const block = trendBlock(await homeOn('anime'));
    expect(block).toContain('<div class="p1-trend anime-o2-trend"><div class="ux-qgrid">');
    expect((block.match(/class="ux-qcard"/g) ?? []).length).toBe(2);
    expect((block.match(/class="ux-qcov anime-o2-art-cov"/g) ?? []).length).toBe(2);
    // bleach: the strip holds the photo; the series with no photo: the strip holds the drawn art, the square follows it.
    expect(block).toMatch(/<span class="anime-o2-art-strip"><span class="anime-o2-art anime-o2-art-card anime-o2-photo" data-photo="bleach">/);
    expect(block).toMatch(/<span class="anime-o2-art-strip"><svg class="anime-o2-art anime-o2-art-card"[^>]*>[\s\S]*?<\/svg><\/span><span class="anime-o2-art-sq"><svg class="anime-o2-art anime-o2-art-avatar"/);
  });

  it('the anime sheet gives that grid the cover box of the kpop card, and the shared grid is the kpop one', () => {
    // The kpop card cover and the v12 grid (two rows of four from 761 px, three in view to 1100 px) are shared: the anime build serves them too.
    expect(a0).toMatch(/\.ux-qcov \{ aspect-ratio: 4 \/ 3;/);
    expect(v12Home).toContain('.p1-trend .ux-qgrid {');
    expect(v12Home).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))');
    // Everywhere else the anime card keeps its strip; in the Trending grid the cover is 4:3.
    expect(o2).toContain('html.ux-v1[data-site="anime"] .anime-o2-art-cov { aspect-ratio: 320 / 104; }');
    expect(o2).toContain('html.ux-v1[data-site="anime"] .anime-o2-trend .anime-o2-art-cov { aspect-ratio: 4 / 3; }');
    // A strip with no photo gives way to the square art (never a cropped title); a strip with a photo stays.
    expect(o2).toContain('html.ux-v1[data-site="anime"] .anime-o2-trend .anime-o2-art-strip:not(:has(.anime-o2-photo)) { display: none; }');
    expect(o2).toContain('html.ux-v1[data-site="anime"] .anime-o2-trend .anime-o2-art-strip:not(:has(.anime-o2-photo)) + .anime-o2-art-sq { display: block; }');
  });
});
