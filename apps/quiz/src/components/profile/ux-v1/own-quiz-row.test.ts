import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));

import { OwnQuizRows } from './own-quiz-row';

import type { QuizCardData } from '@/lib/db/types';

// "Your quizzes" on /me (owner, 2026-10-14): every row of the owner's list carries Edit and
// Delete; the rest of the row still opens the quiz.

const quiz = {
  id: '00c13d5c-ff92-4b82-9e8d-2814fd25b171', slug: 'can-you-recognize-these-k-pop-idols-', title: 'Can You Recognize These K-pop Idols ?',
  cover_image_url: null, group_slug: 'ive', status: 'published', play_count: 113, like_count: 4,
  total_score_sum: 0, total_completions: 0, question_count: 10, quiz_type: 'image',
} as unknown as QuizCardData;

describe('OwnQuizRows', () => {
  it('a row opens the quiz and carries Edit (owner editor) and Delete', () => {
    const html = renderToStaticMarkup(createElement(OwnQuizRows, { quizzes: [quiz] }));
    expect(html).toContain('href="/q/can-you-recognize-these-k-pop-idols-"');
    expect(html).toContain('href="/quiz/00c13d5c-ff92-4b82-9e8d-2814fd25b171/edit"');
    expect(html).toMatch(/<button[^>]*aria-label="Delete Can You Recognize These K-pop Idols \?"[^>]*>Delete<\/button>/);
    // the buttons are not inside the quiz link (no interactive element nested in an <a>)
    expect(html).not.toMatch(/<a [^>]*href="\/q\/[^"]*"[^>]*>(?:(?!<\/a>).)*<button/);
  });
});
