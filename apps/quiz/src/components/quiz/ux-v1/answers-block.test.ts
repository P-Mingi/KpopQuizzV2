// SEO phase 1 (2026-10-27): the "Answers & explanations" block of the real quiz page
// (components/quiz/ux-v1/quiz-page.tsx), rendered server side like quiz-page-render.test.ts.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { P4QuizPageProps } from '@/components/quiz/ux-v1/quiz-page';
import type { AnswerRow } from '@/lib/quiz/answers';

vi.mock('@/components/quiz/ux-v1/islands', () => {
  const none = (): null => null;
  return {
    P4Run: ({ children }: { children: React.ReactNode }) => children,
    P4StartActions: none, P4StickyStart: none, P4HofMine: none, P4Follow: none, P4ReportButton: none,
  };
});
vi.mock('@/components/quiz/quiz-owner-actions', () => ({ QuizOwnerActions: (): null => null }));

const ANSWERS: AnswerRow[] = [
  { qIndex: 0, n: 1, question: 'Which year did BTS debut?', answer: '2013', explanation: { kind: 'verified', text: 'BTS debuted on 13 June 2013 under Big Hit Entertainment.', sourceUrl: 'https://en.wikipedia.org/wiki/BTS' } },
  { qIndex: 1, n: 2, question: 'Who is the leader of BTS?', answer: 'RM', explanation: { kind: 'fun_fact', text: 'RM has led the group since debut.' } },
  { qIndex: 2, n: 3, question: 'BTS has seven members.', answer: 'True', explanation: null },
];

async function render(answers: AnswerRow[] | null): Promise<string> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  const { P4QuizPage } = await import('@/components/quiz/ux-v1/quiz-page');
  const props = {
    run: { timerOn: false, timerSeconds: 0 },
    quiz: {
      id: 'q1', slug: 'bts-quiz-x', title: 'BTS quiz', quizType: 'multiple_choice', difficulty: 'easy', questionCount: 3, playCount: 120,
      groupName: 'BTS', groupSlug: 'bts', creatorId: 'c1', creatorUsername: 'kpophistory', creatorXp: 100, creatorAvatarUrl: null, cover: null,
    },
    crumbs: [{ label: 'Home', href: '/' }, { label: 'BTS quiz' }],
    breadcrumbJsonLd: {}, quizJsonLd: {}, intro: 'Intro.', creatorNote: null, introAvg: null, perQuestionScore: true,
    extra: { fastestTimeSeconds: null, perfectScoreCount: 0 }, passRate: null, counts: { likes: 0, reactions: 0, comments: 0 },
    inThisQuiz: null, prompts: ['Which year did BTS debut?'], review: [{ question: 'Which year did BTS debut?', options: ['2012', '2013', '2014', '2015'] }],
    dyk: null, triviaAvailable: false, fandomName: 'ARMY', hof: [], related: [], groupQuizCount: null, articleLinks: [], creator: null,
    answers,
  } as unknown as P4QuizPageProps;
  return renderToStaticMarkup(createElement(P4QuizPage, props));
}

describe('the Answers & explanations block', () => {
  it('is one closed native details at the bottom, after Made by, with every answer', async () => {
    const html = await render(ANSWERS);
    const block = /<section class="ux-sec" aria-label="Answers and explanations">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? '';
    expect(block).toContain('<details class="p4-acc p4-review"><summary>Answers &amp; explanations');
    expect(block).not.toMatch(/<details[^>]*\sopen/);
    expect(html.indexOf('aria-label="Made by"')).toBeLessThan(html.indexOf('aria-label="Answers and explanations"'));
    for (const a of ANSWERS) expect(block).toContain(`<p><b>Answer:</b> ${a.answer}</p>`);
  });

  it('shows a verified explanation with its source link, a fun fact as such, else the answer alone', async () => {
    const block = /aria-label="Answers and explanations">([\s\S]*?)<\/section>/.exec(await render(ANSWERS))?.[1] ?? '';
    expect(block).toContain('BTS debuted on 13 June 2013 under Big Hit Entertainment. <a href="https://en.wikipedia.org/wiki/BTS" rel="nofollow noopener" target="_blank">Source</a>');
    expect(block).toContain('<p class="p4-fun"><b>Fun fact:</b> RM has led the group since debut.</p>');
    expect(block).toMatch(/<li><p><b>3\.<\/b> BTS has seven members\.<\/p><p><b>Answer:<\/b> True<\/p><\/li>/);
  });

  it('changes the questions block note to the owner wording only when the block exists', async () => {
    expect(await render(ANSWERS)).toContain('A preview of every question in this BTS quiz. Try it first. Answers and explanations are at the bottom of the page (spoilers).');
    const without = await render(null);
    expect(without).toContain('A preview of every question in this BTS quiz. The correct answers are revealed only when you play.');
    expect(without).not.toContain('Answers and explanations');
    expect(await render([])).not.toContain('aria-label="Answers and explanations"');
  });
});
