import { describe, expect, it } from 'vitest';

import { DAILY_HUB_DESCRIPTION, DAILY_HUB_TITLE, dailyHubAnswer, dailyHubOn } from './daily-hub';

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

describe('daily hub copy (kpopquiz-seo)', () => {
  it('title fits 60 with the suffix, description 120 to 160, no dash', () => {
    expect(DAILY_HUB_TITLE.length + ' | KpopQuiz'.length).toBeLessThanOrEqual(60);
    expect(DAILY_HUB_DESCRIPTION.length).toBeGreaterThanOrEqual(120);
    expect(DAILY_HUB_DESCRIPTION.length).toBeLessThanOrEqual(160);
    expect(DAILY_HUB_TITLE + DAILY_HUB_DESCRIPTION).not.toMatch(/[–—]/);
  });
  it('the answer block is 40 to 60 words, with the dated number only when it is real', () => {
    const a = dailyHubAnswer({ date: '2026-11-09', questions: 10 });
    expect(words(a)).toBeGreaterThanOrEqual(40);
    expect(words(a)).toBeLessThanOrEqual(60);
    expect(a).toContain('On November 9, 2026, the daily K-pop quiz has 10 questions.');
    const b = dailyHubAnswer({ date: '2026-11-09', questions: null });
    expect(b).not.toMatch(/\d/);
    expect(words(b)).toBeGreaterThanOrEqual(35);
  });
  it('the flag is off by default', () => {
    expect(dailyHubOn({})).toBe(false);
    expect(dailyHubOn({ DAILY_HUB: '1' })).toBe(true);
  });
});
