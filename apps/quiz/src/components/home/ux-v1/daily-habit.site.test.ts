// Audit 01 P0-2: the quiz of the day card is one link with from=home, the phone chip is in the guest header, and a header with no
// quiz of the day is byte for byte the one of before.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => null }));
vi.mock('./islands', () => ({ QotdNote: () => null, QotdStatus: () => null }));

import { HomeHeader } from './home-header';
import { QotdRow } from './qotd-row';

const QOTD = { id: 'q1', slug: 'the-quiz', title: 'The quiz', quizType: 'multiple_choice', difficulty: 'easy', questionCount: 10, averagePct: null, time: null, featuredDate: '2026-11-09', servedDate: '2026-11-09' };

describe('home daily CTA', () => {
  it('the card has one Play link, with from=home, and no nested link', () => {
    const html = renderToString(h(QotdRow, { qotd: QOTD }));
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="/q/the-quiz?daily=quiz&amp;from=home"');
  });
  it('the guest header carries the phone chip, and keeps the owner-locked copy', () => {
    const html = renderToString(h(HomeHeader, { daily: { slug: 'the-quiz', title: 'The quiz' } }));
    expect(html).toContain('p1-dchip');
    expect(html).toContain('href="/q/the-quiz?daily=quiz&amp;from=home"');
    expect(html).toContain('Browse K-pop quizzes');
    expect(html).toContain('Prove it. Play K-pop quizzes and see where you rank.');
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
  });
  it('no quiz of the day: no chip, the header of before', () => {
    expect(renderToString(h(HomeHeader))).not.toContain('p1-dchip');
  });
});
