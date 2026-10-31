// Surprise me on the kpopquiz.org home (owner, 2026-10-31, CR-015): the hub's component under kpop-h2, K-pop quizzes only, no link and no
// random URL in the served HTML, passed by the page to UxHome's afterHeader slot, styled by a sheet only that page links.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HubSurpriseCard } from '@/lib/site/hub/data/types';

const pool = vi.hoisted(() => ({ value: null as unknown, calls: [] as string[], throws: false }));
vi.mock('@/lib/site/hub/data/surprise-kpop', () => ({
  getKpopSurprisePool: async () => {
    pool.calls.push('kpop');
    if (pool.throws) throw new Error('database unreachable');
    return pool.value;
  },
}));

const card = (id: string, slug: string, group: string, site: 'kpop' | 'anime' = 'kpop'): HubSurpriseCard => ({
  id, site, siteName: site === 'kpop' ? 'KpopQuiz' : 'OtakuQuiz', tile: group.slice(0, 2).toUpperCase(), title: `Quiz ${id}`, group, href: `${site === 'kpop' ? 'https://kpopquiz.org' : 'https://bunnyverse.org/anime'}/q/${slug}`,
});
const SRC = fileURLToPath(new URL('../../../', import.meta.url));

beforeEach(() => {
  pool.value = [card('k1', 'bts-army-quiz', 'BTS'), card('k2', 'twice-quiz', 'TWICE')];
  pool.calls = [];
  pool.throws = false;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

async function block(): Promise<string> {
  const { KpopHomeSurprise } = await import('./kpop-home-surprise');
  const el = await KpopHomeSurprise();
  return el ? renderToStaticMarkup(el) : '';
}

describe('the block', () => {
  it('is the hub component under kpop-h2, reading the kpop pool, with a button and no link', async () => {
    const html = await block();
    expect(pool.calls).toEqual(['kpop']);
    expect(html).toMatch(/^<div class="kpop-h2-surprise"><div class="kpop-h2-lede-row"><p class="kpop-h2-lede">Not sure what to play\?<\/p><button type="button" class="kpop-h2-ghost kpop-h2-btn"><svg [^>]*>[\s\S]*<\/svg>Surprise me<\/button><\/div><\/div>$/);
    expect(html).not.toContain('hub-h2');
    expect(html).not.toContain('anime-h2');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('<h1');
  });

  it('is left out with no pool, and when the read fails', async () => {
    pool.value = null;
    expect(await block()).toBe('');
    pool.value = [];
    expect(await block()).toBe('');
    pool.throws = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await block()).toBe('');
  });
});

describe('the picks', () => {
  it('link to the canonical quiz page, name the group, and are K-pop quizzes only', async () => {
    const { loadKpopSurprise, toKpopPick } = await import('@/lib/ux-v1/p1/home-surprise');
    expect(toKpopPick(card('k1', 'bts-army-quiz', 'BTS'))).toEqual({
      id: 'k1', tile: 'BT', title: 'Quiz k1', href: '/q/bts-army-quiz', site: 'kpop', pickLabel: 'Random pick from BTS',
    });
    pool.value = [card('k1', 'bts-army-quiz', 'BTS'), card('a1', 'naruto-quiz', 'Naruto', 'anime')];
    const picks = await loadKpopSurprise();
    expect(picks.map((p) => p.id)).toEqual(['k1']);
    expect(picks.every((p) => p.href.startsWith('/q/'))).toBe(true);
  });
});

describe('the page and its sheet', () => {
  const page = readFileSync(`${SRC}app/(site)/page.tsx`, 'utf8');
  const sheet = readFileSync(`${SRC}styles/kpop/home-surprise.css`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('the home passes the block to the afterHeader slot', () => {
    expect(page).toContain('afterHeader={<KpopHomeSurprise />}');
    expect(page).toContain("import '@/styles/kpop/home-surprise.css'");
  });

  it('no random route exists: the block adds no page and no API route', () => {
    const app = readdirSync(`${SRC}app/(site)`);
    expect(app.filter((n) => /random|surprise/i.test(n))).toEqual([]);
    expect(readdirSync(`${SRC}app/api`).filter((n) => /random|surprise/i.test(n))).toEqual([]);
  });

  it('the sheet routes every colour through a UX token and stays out of the sheet every page links', () => {
    expect(sheet).not.toMatch(/#[0-9a-f]{3,8}\b(?![^{]*\{)/i);
    for (const dir of ['ux-v1', 'ux-v12']) {
      for (const f of readdirSync(`${SRC}styles/${dir}`)) expect(readFileSync(`${SRC}styles/${dir}/${f}`, 'utf8')).not.toMatch(/kpop-h2|kpop-az/);
    }
    expect(sheet).toMatch(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*\.kpop-h2-rise \{ animation: none; \}/);
  });
});
