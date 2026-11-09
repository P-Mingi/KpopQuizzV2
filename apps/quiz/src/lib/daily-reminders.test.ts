// Audit 01 P2-10: under-15 cannot subscribe, a played day sends nothing, one a day, one-click unsubscribe, no tracking. No mail is ever sent.
import { describe, expect, it, vi } from 'vitest';

import { confirmMail, hashToken, isDue, maySubscribe, parseHour, reminderMail, remindersEnabled, sendMail, unsubscribeToken, unsubscribeValid } from './daily-reminders';

const row = (o: Partial<{ hour_utc: number; confirmed_at: string | null; last_sent_on: string | null }> = {}) => ({ hour_utc: 18, confirmed_at: '2026-11-01T10:00:00Z', last_sent_on: null, ...o });
const at18 = new Date('2026-11-09T18:05:00Z');

describe('who can subscribe', () => {
  it('needs the 15 or older box: an unticked or missing box cannot subscribe', () => {
    expect(maySubscribe({})).toBe(false);
    expect(maySubscribe({ age15: false })).toBe(false);
    expect(maySubscribe({ age15: 'true' })).toBe(false);
    expect(maySubscribe({ age15: true })).toBe(true);
  });
  it('the hour is an integer 0 to 23', () => {
    expect([parseHour(0), parseHour(23), parseHour(24), parseHour(-1), parseHour(1.5), parseHour('7')]).toEqual([0, 23, null, null, null, null]);
  });
  it('the flag is off by default', () => {
    expect(remindersEnabled({})).toBe(false);
    expect(remindersEnabled({ DAILY_REMINDERS: '1' })).toBe(true);
  });
});

describe('isDue', () => {
  it('sends at the chosen hour to a confirmed account that has not played', () => {
    expect(isDue(row(), at18, false)).toBe(true);
  });
  it('a played day sends nothing', () => {
    expect(isDue(row(), at18, true)).toBe(false);
  });
  it('at most one a day, and only the chosen hour', () => {
    expect(isDue(row({ last_sent_on: '2026-11-09' }), at18, false)).toBe(false);
    expect(isDue(row({ last_sent_on: '2026-11-08' }), at18, false)).toBe(true);
    expect(isDue(row({ hour_utc: 7 }), at18, false)).toBe(false);
  });
  it('double opt-in: nothing before the link is opened', () => {
    expect(isDue(row({ confirmed_at: null }), at18, false)).toBe(false);
  });
});

describe('the mails', () => {
  const m = reminderMail('KpopQuiz', 'https://kpopquiz.org', 'https://kpopquiz.org/api/reminders/unsubscribe?u=1&t=2');
  it('carry the one-click unsubscribe headers and no tracking', () => {
    expect(m.headers['List-Unsubscribe']).toContain('/api/reminders/unsubscribe');
    expect(m.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    expect(m.html).not.toMatch(/<img|pixel|utm_|track/i);
    expect(m.text + m.html).not.toMatch(/[–—]/);
    for (const href of m.html.match(/href="([^"]+)"/g) ?? []) expect(href).toContain('https://kpopquiz.org');
  });
  it('the confirmation mail has one link', () => {
    expect((confirmMail('KpopQuiz', 'https://kpopquiz.org/api/reminders/confirm?u=1&t=2').html.match(/href=/g) ?? []).length).toBe(1);
  });
  it('the unsubscribe token verifies for its account only, and needs a secret', () => {
    const t = unsubscribeToken('11111111-1111-1111-1111-111111111111', 's3cret')!;
    expect(unsubscribeValid('11111111-1111-1111-1111-111111111111', t, 's3cret')).toBe(true);
    expect(unsubscribeValid('22222222-2222-2222-2222-222222222222', t, 's3cret')).toBe(false);
    expect(unsubscribeValid('11111111-1111-1111-1111-111111111111', t, 'other')).toBe(false);
    expect(unsubscribeToken('x', undefined)).toBeNull();
    expect(hashToken('a')).toHaveLength(64);
  });
  it('sendMail never calls the network without a key', async () => {
    const f = vi.fn();
    expect(await sendMail('a@b.c', m, 'KpopQuiz', 'kpopquiz.org', {}, f as unknown as typeof fetch)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });
});
