// V12 F5a: the REAL quiz page (components/quiz/ux-v1/quiz-page.tsx) rendered server
// side. An editorial creator gets the team avatar, the Team pill and no "Lv" in the
// "by" line and the "Made by" box; a fan creator keeps the v11 lines. With the v12
// flag off the same props (even one carrying team) render byte for byte like v11.
// The client islands are stubbed (they render nothing here; the page around them is
// what changes).

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { P4QuizPageProps } from '@/components/quiz/ux-v1/quiz-page';

vi.mock('@/components/quiz/ux-v1/islands', () => {
  const none = (): null => null;
  return {
    P4Run: ({ children }: { children: React.ReactNode }) => children,
    P4StartActions: none, P4StickyStart: none, P4HofMine: none, P4Follow: none, P4ReportButton: none,
  };
});
vi.mock('@/components/quiz/quiz-owner-actions', () => ({ QuizOwnerActions: (): null => null }));

async function render(v12: boolean, creatorTeam: boolean): Promise<string> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  const { P4QuizPage } = await import('@/components/quiz/ux-v1/quiz-page');
  const props = {
    run: { timerOn: false, timerSeconds: 0 },
    quiz: {
      id: 'q1', slug: 'bts-quiz-x', title: 'BTS quiz', quizType: 'multiple_choice', difficulty: 'easy', questionCount: 8, playCount: 120,
      groupName: 'BTS', groupSlug: 'bts', creatorId: 'c1', creatorUsername: 'kpophistory', creatorXp: 14363, creatorAvatarUrl: null, cover: null,
    },
    crumbs: [{ label: 'Home', href: '/' }, { label: 'BTS quiz' }],
    breadcrumbJsonLd: {}, quizJsonLd: {}, intro: 'Intro.', creatorNote: null, introAvg: null, perQuestionScore: true,
    extra: { fastestTimeSeconds: null, perfectScoreCount: 0 }, passRate: null, counts: { likes: 0, reactions: 0, comments: 0 },
    inThisQuiz: null, prompts: [], review: [], dyk: null, triviaAvailable: false, fandomName: 'ARMY', hof: [], related: [],
    groupQuizCount: null, articleLinks: [],
    creator: { username: 'kpophistory', avatarUrl: 'https://example.com/a.png', xp: 14363, quizzes: 46, playsReceived: 900, ...(creatorTeam ? { team: true as const } : {}) },
  } as unknown as P4QuizPageProps;
  return renderToStaticMarkup(createElement(P4QuizPage, props));
}

const author = (html: string): string => /<div class="p4-author">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
const madeBy = (html: string): string => /<div class="p4-madeby">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? '';

afterEach(() => { vi.unstubAllEnvs(); });

describe('quiz page author line and Made by box (F5a)', () => {
  it('flag on, editorial creator: team avatar, Team pill, no level anywhere', async () => {
    const html = await render(true, true);
    for (const part of [author(html), madeBy(html)]) {
      expect(part).toContain('ux-ava-team');
      expect(part).toContain('class="ux-teamtag"');
      expect(part).toContain('>Team<');
      expect(part).toContain('href="/u/kpophistory"');
      expect(part).not.toMatch(/Lv \d/);
      expect(part).not.toContain('<img');
    }
    expect(madeBy(html)).toContain('46 quizzes · 900 plays');
    expect(html).not.toMatch(/Lv \d/);
  });

  it('flag on, fan creator: the v11 lines (Lv and title, photo), no Team pill', async () => {
    const html = await render(true, false);
    expect(author(html)).toMatch(/· Lv \d+ /);
    expect(madeBy(html)).toMatch(/Lv \d+ .* · 46 quizzes · 900 plays/);
    expect(html).not.toContain('ux-teamtag');
    expect(html).toContain('<img');
  });

  it('flag off: identical HTML whether or not the creator carries team (v11, byte for byte)', async () => {
    const plain = await render(false, false);
    const team = await render(false, true);
    expect(team).toBe(plain);
    expect(plain).not.toContain('ux-teamtag');
    expect(author(plain)).toMatch(/· Lv \d+ /);
  });

  it('flag on with a fan creator renders exactly the flag-off page', async () => {
    expect(await render(true, false)).toBe(await render(false, false));
  });
});
