// Run O1, lane O1: the /quizzes copy (FAQ and UX v11 page) says the genre word of its site. kpop renders what it rendered
// before (the files of __o1_kpop_quizzes__/, written once from the base commit a22664c, never from the head: a plain run
// compares); anime names no K-pop, no KpopQuiz, no kpop group and no kpop host.
import { createElement as h } from 'react';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const CARD = {
  id: 'q1', title: 'A quiz', slug: 'a-quiz', quiz_type: 'multiple_choice', difficulty: 'easy', language: 'en', play_count: 12,
  total_score_sum: 40, total_completions: 5, like_count: 2, created_at: '2026-10-01T00:00:00Z', group_name: 'A Group', group_slug: 'a-group',
  display_color: '#000000', text_color: '#ffffff', logo_url: null, fandom_name: null, creator_username: 'fan', creator_avatar_url: null,
  creator_avatar_bg: '#222222', creator_avatar_text: '#ffffff', creator_xp: 10, question_count: 3, cover_image_url: null,
};
const GROUP = { id: 1, name: 'A Group', slug: 'a-group', quiz_count: 1 };

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/lib/db/queries/groups', () => ({ getAllGroups: async () => [GROUP] }));
vi.mock('@/lib/ux-v1/p2/queries', () => ({ getP2FacetRows: async () => [], getP2Page: async () => [CARD], getP2Pages: async () => [[CARD]] }));
vi.mock('@/lib/stats/site-stats', async (orig) => ({
  ...(await orig<object>()),
  getPublicStatsOrNull: async () => ({ quizzes: 120, groupsWithQuizzes: 12, groupsListed: 12, songs: 0, songGroups: 0, plays: 0, asOf: '2026-10-20' }),
}));

async function onSite<T>(site: 'kpop' | 'anime', load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return load();
}

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const KPOP_WORDS = /K-?pop|kpopquiz|BTS|BLACKPINK|Stray Kids|aespa|NewJeans/i;
const link = (href: string, label: string) => h('a', { href }, label);

describe('quizzesFaqs', () => {
  for (const counts of [null, { quizzes: '120+', groups: '12' }]) {
    const name = counts ? 'with counts' : 'without counts';
    it(`kpop, ${name}: the questions, the JSON-LD texts and the visible answers of the base commit`, async () => {
      const { quizzesFaqs, quizzesFaqJsonLd } = await onSite('kpop', () => import('./faq'));
      const faqs = quizzesFaqs(link, counts);
      await expect(JSON.stringify({ ld: quizzesFaqJsonLd(faqs), html: faqs.map((f) => renderToStaticMarkup(h('div', null, f.a))) }, null, 1))
        .toMatchFileSnapshot(`./__o1_kpop_quizzes__/faq-${counts ? 'counts' : 'plain'}.json`);
    });
    it(`anime, ${name}: its genre, no kpop word, its series`, async () => {
      const { quizzesFaqs, quizzesFaqJsonLd } = await onSite('anime', () => import('./faq'));
      const faqs = quizzesFaqs(link, counts);
      const all = JSON.stringify({ ld: quizzesFaqJsonLd(faqs), html: faqs.map((f) => renderToStaticMarkup(h('div', null, f.a))) });
      expect(all).not.toMatch(KPOP_WORDS);
      expect(all).not.toMatch(DASHES);
      expect(all).toMatch(/anime quiz/);
      expect(faqs).toHaveLength(4);
    });
  }
});

describe('renderP2Quizzes', () => {
  it('kpop: the page of the base commit', async () => {
    const { renderP2Quizzes } = await onSite('kpop', () => import('./ux-page'));
    await expect(renderToString(await renderP2Quizzes({}))).toMatchFileSnapshot('./__o1_kpop_quizzes__/page.html');
  });
  it('anime: its genre, its origin in the JSON-LD, no kpop word', async () => {
    const { renderP2Quizzes } = await onSite('anime', () => import('./ux-page'));
    const html = renderToString(await renderP2Quizzes({}));
    expect(html).not.toMatch(KPOP_WORDS);
    expect(html).toContain('https://otakuquiz.org/q/a-quiz');
    expect(html).toContain('Anime quizzes');
  });
});
