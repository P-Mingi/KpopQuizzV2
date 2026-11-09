// O1 audit 03 P1-5: the weekly page opens with a 40 to 60 word answer block and a table, both from the same window counts.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const card = (n: number) => ({
  id: `q${n}`, title: `Quiz number ${n}`, slug: `quiz-${n}`, quiz_type: 'multiple_choice', difficulty: 'easy', language: 'en', play_count: 12,
  total_score_sum: 40, total_completions: 5, like_count: 2, created_at: '2026-10-01T00:00:00Z', group_name: 'A Group', group_slug: 'a-group',
  display_color: '#000000', text_color: '#ffffff', logo_url: null, fandom_name: null, creator_username: 'fan', creator_avatar_url: null,
  creator_avatar_bg: '#222222', creator_avatar_text: '#ffffff', creator_xp: 10, question_count: 3, cover_image_url: null,
});
const state = vi.hoisted(() => ({ rows: [] as Array<{ card: unknown; windowPlays: number }>, st: 'full' }));

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/lib/db/queries/popular', () => ({
  getPopularQuizzes: async (window: string) => ({ window, generatedAt: '2026-11-20T10:00:00Z', state: state.st, rowsScanned: 1, qualifyingCount: state.rows.length, rows: state.rows }),
}));

import { PopularPage, weeklyAnswer } from './popular-page';

import type { PopularResult } from '@/lib/db/queries/popular';

const result = (rows: PopularResult['rows']): PopularResult => ({ window: 'week', generatedAt: '2026-11-20T10:00:00Z', state: 'full', rows, rowsScanned: 1, qualifyingCount: rows.length });
const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

describe('weeklyAnswer', () => {
  it('names the top quiz with its plays, in 40 to 60 words, and the table repeats the same count', () => {
    const rows = [1, 2, 3].map((n) => ({ card: card(n) as never, windowPlays: 1200 - n }));
    const a = weeklyAnswer(result(rows), 'November 20, 2026, 10:00 UTC')!;
    expect(a.text).toContain('Quiz number 1 is the most played K-pop quiz this week, with 1,199 plays');
    expect(a.text).toContain('ranks the 3 quizzes');
    expect(words(a.text)).toBeGreaterThanOrEqual(40);
    expect(words(a.text)).toBeLessThanOrEqual(60);
    expect(a.table[0]).toEqual({ rank: 1, title: 'Quiz number 1', slug: 'quiz-1', group: 'A Group', plays: '1,199' });
    expect(a.table).toHaveLength(3);
  });

  it('makes no claim in the all-time fallback (no window plays)', () => {
    expect(weeklyAnswer(result([{ card: card(1) as never, windowPlays: 0 }]), 'x')).toBeNull();
    expect(weeklyAnswer(result([]), 'x')).toBeNull();
  });
});

describe('PopularPage window=week on kpopquiz.org', () => {
  it('renders the answer block before the list, with a real table in the server HTML', async () => {
    state.rows = [{ card: card(1), windowPlays: 1200 }, { card: card(2), windowPlays: 900 }];
    const html = renderToString(await PopularPage({ window: 'week' }));
    expect(html).toContain('data-answer="popular-week"');
    expect(html).toContain('<table class="pop-table">');
    expect(html).toContain('Plays this week');
    expect(html.indexOf('data-answer="popular-week"')).toBeLessThan(html.indexOf('class="pop-list"'));
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });

  it('today and month are unchanged: no answer block, no table', async () => {
    state.rows = [{ card: card(1), windowPlays: 1200 }];
    for (const window of ['today', 'month'] as const) {
      const html = renderToString(await PopularPage({ window }));
      expect(html).not.toContain('pop-table');
      expect(html).not.toContain('data-answer');
    }
  });
});
