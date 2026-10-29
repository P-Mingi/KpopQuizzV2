// Run O1, lane O1: the popular pages (/quizzes/popular-today, -this-week, -this-month) say the genre word of their site.
// kpop renders what it rendered before (the files of __o1_kpop_popular__/, written once from the base commit a22664c,
// never from the head: a plain run compares); anime names no K-pop, no KpopQuiz and no kpop host, and links only to
// pages its route map has.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PopularWindow } from '@/lib/db/queries/popular';

const CARD = {
  id: 'q1', title: 'A quiz', slug: 'a-quiz', quiz_type: 'multiple_choice', difficulty: 'easy', language: 'en', play_count: 12,
  total_score_sum: 40, total_completions: 5, like_count: 2, created_at: '2026-10-01T00:00:00Z', group_name: 'A Group', group_slug: 'a-group',
  display_color: '#000000', text_color: '#ffffff', logo_url: null, fandom_name: null, creator_username: 'fan', creator_avatar_url: null,
  creator_avatar_bg: '#222222', creator_avatar_text: '#ffffff', creator_xp: 10, question_count: 3, cover_image_url: null,
};

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/lib/db/queries/popular', () => ({
  getPopularQuizzes: async (window: string) => ({
    window, generatedAt: '2026-10-20T10:00:00Z', state: 'ok', rowsScanned: 1, qualifyingCount: 1,
    rows: [{ card: CARD, windowPlays: 7 }],
  }),
}));

async function onSite<T>(site: 'kpop' | 'anime', load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return load();
}

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const WINDOWS: PopularWindow[] = ['today', 'week', 'month'];

describe('popular pages', () => {
  for (const window of WINDOWS) {
    it(`kpop, ${window}: the page and its metadata are those of the base commit`, async () => {
      const { PopularPage, popularMeta } = await onSite('kpop', () => import('./popular-page'));
      await expect(renderToString(await PopularPage({ window }))).toMatchFileSnapshot(`./__o1_kpop_popular__/${window}.html`);
      await expect(JSON.stringify(popularMeta(window), null, 1)).toMatchFileSnapshot(`./__o1_kpop_popular__/${window}.meta.json`);
    });

    it(`anime, ${window}: no K-pop, no KpopQuiz, no kpop host; its own host and genre`, async () => {
      const { PopularPage, popularMeta } = await onSite('anime', () => import('./popular-page'));
      const html = renderToString(await PopularPage({ window }));
      const meta = JSON.stringify(popularMeta(window));
      for (const text of [html, meta]) {
        expect(text).not.toMatch(/K-?pop|kpopquiz|Pulse/i);
        expect(text).not.toMatch(DASHES);
      }
      expect(html).toContain('https://bunnyverse.org/anime/q/a-quiz');
      expect(html).toContain('on bunnyverse.org/anime');
      expect(html).toMatch(/most played anime quizzes/i);
      expect([...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1])).not.toContain('/stats');
    });
  }
});
