// Run O1, lane O1: the leaderboard copy (how points work, the Today panel) says the genre word of its site and links the
// stats page only where the site has data pages. kpop renders what it rendered before (the files of __o1_kpop_leaderboard__/,
// written once from the base commit a22664c, never from the head: a plain run compares).
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));

const AROUND = {
  today: { plays: 5, quizzes: 2, masters: 1, hot: null },
  qotd: { title: 'The quiz of the day', href: '/q/the-quiz', note: 'Easy' },
  happening: [], fresh: [], comments: [], badges: [],
};

async function onSite<T>(site: 'kpop' | 'anime', load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return load();
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const KPOP_WORDS = /K-?pop|kpopquiz/i;

describe('HowPoints', () => {
  it('kpop: the markup of the base commit', async () => {
    const { HowPoints } = await onSite('kpop', () => import('./points'));
    await expect(renderToString(h(HowPoints, { creatorViews: ['week', 'rising'] }))).toMatchFileSnapshot('./__o1_kpop_leaderboard__/points.html');
  });
  it('anime: its genre', async () => {
    const { HowPoints } = await onSite('anime', () => import('./points'));
    const html = renderToString(h(HowPoints, { creatorViews: ['week', 'rising'] }));
    expect(html).not.toMatch(KPOP_WORDS);
    expect(html).toContain('General anime quizzes do not count.');
    expect(html).not.toMatch(/blindtest/i);
  });
});

describe('AroundCommunity', () => {
  it('kpop: the markup of the base commit', async () => {
    const { AroundCommunity } = await onSite('kpop', () => import('./around'));
    await expect(renderToString(h(AroundCommunity, { data: AROUND }))).toMatchFileSnapshot('./__o1_kpop_leaderboard__/around.html');
  });
  it('anime: its genre and its word for a song, no link to the stats page it does not have', async () => {
    const { AroundCommunity } = await onSite('anime', () => import('./around'));
    const html = renderToString(h(AroundCommunity, { data: AROUND }));
    expect(html).not.toMatch(KPOP_WORDS);
    // OtakuQuiz has no blind test (owner, 2026-10-26): no daily blindtest row, no link to /blindtest.
    expect(html).not.toMatch(/Name that|Blindtest of the day/);
    expect([...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1]).filter((u) => u?.startsWith('/blindtest'))).toEqual([]);
    expect([...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1])).not.toContain('/stats');
  });
});
