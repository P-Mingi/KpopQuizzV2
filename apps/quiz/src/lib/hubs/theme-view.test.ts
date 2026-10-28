import { describe, expect, it } from 'vitest';

import { GENERAL_THEMES } from './general-themes';
import { buildThemeView, themeCounts } from './theme-view';

import type { HubQuiz } from '@/lib/ux-v1/p3/model';

const quiz = (slug: string, over: Partial<HubQuiz> = {}): HubQuiz => ({
  slug, title: `Title ${slug}`, quiz_type: 'multiple_choice', difficulty: 'easy', play_count: 50, like_count: 0,
  total_score_sum: 0, total_completions: 0, question_count: 10, created_at: '2026-09-01T00:00:00+00:00', ...over,
});
const history = GENERAL_THEMES.find((t) => t.slug === 'kpop-history-quiz')!;
const historySlugs = history.sections.flatMap((s) => s.slugs);

describe('buildThemeView', () => {
  it('lists the published quizzes in the plan order and fills {count}', () => {
    const v = buildThemeView(history, historySlugs.map((s) => quiz(s)));
    expect(v.listed).toBe(historySlugs.length);
    expect(v.sections.flatMap((s) => s.quizzes.map((q) => q.slug))).toEqual(historySlugs);
    expect(v.intro).toContain(`gathers ${historySlugs.length} free quizzes`);
    expect(v.first?.slug).toBe(historySlugs[0]);
    expect(v.questions).toBe(historySlugs.length * 10);
    expect(v.indexable).toBe(true);
  });

  it('a drafted quiz drops out, and the count follows', () => {
    const v = buildThemeView(history, historySlugs.slice(1).map((s) => quiz(s)));
    expect(v.listed).toBe(historySlugs.length - 1);
    expect(v.first?.slug).toBe(historySlugs[1]);
  });

  it('under 5 listed quizzes the page is not indexable', () => {
    expect(buildThemeView(history, historySlugs.slice(0, 4).map((s) => quiz(s))).indexable).toBe(false);
  });

  it('a second listing that is also in a section is not repeated; levels and the content date are real', () => {
    const v = buildThemeView(history, [...historySlugs.map((s, i) => quiz(s, { difficulty: i % 2 ? 'hard' : 'easy', created_at: i === 3 ? '2026-10-20T00:00:00+00:00' : '2026-09-01T00:00:00+00:00' })), ...history.alsoFits.map((s) => quiz(s))]);
    expect(v.also.map((q) => q.slug)).toEqual(history.alsoFits);
    expect(v.levels.easy + v.levels.hard).toBe(v.listed);
    expect(v.updated).toBe('2026-10-20T00:00:00+00:00');
  });

  it('an average only from 30 completed plays', () => {
    const [a, b] = historySlugs;
    const v = buildThemeView(history, [quiz(a!, { total_completions: 29, total_score_sum: 200 }), quiz(b!, { total_completions: 40, total_score_sum: 280 })]);
    expect(v.sections.flatMap((s) => s.quizzes).map((q) => q.averagePct)).toEqual([null, 70]);
  });
});

describe('themeCounts', () => {
  it('counts the published section quizzes of each theme, held ones never', () => {
    const counts = themeCounts(new Set([...historySlugs, 'kpop-geral']));
    expect(counts.get('kpop-history-quiz')).toBe(historySlugs.length);
    expect(counts.get('kpop-dance-quiz')).toBe(0);
  });
});
