// Run O1, lot (b), lane P1: the copy of the passport (copy/anime/p1.ts) and the words built from it. Every key listed in
// the brief exists; no K-pop word, no dash, no emoji; the placeholders are filled from the registry of the site.
import { describe, expect, it } from 'vitest';

import { COPY } from '@/copy/anime/p1';

import { p1 } from './copy';
import { onboardingWords, passportWords, signInWords } from './words';

const LISTED = [
  'me.title', 'me.history', 'me.wholePassport',
  'u.since', 'u.also', 'u.joined', 'u.followers', 'u.xpTo', 'u.streak', 'u.mastered', 'u.made', 'u.plays', 'u.follow', 'u.seriesMastered',
  'team.chip', 'team.profileLine',
  'settings.profile', 'settings.displayName', 'settings.photo', 'settings.bio', 'settings.header', 'settings.anime', 'settings.yourSeries',
  'settings.oshi', 'settings.watchingSince', 'settings.look', 'settings.notifications', 'settings.appearance', 'settings.account',
  'account.passportRow', 'account.signOutEverywhere', 'account.signOutHere',
  'oshi.pick', 'oshi.custom', 'oshi.refusedSpoiler',
  'signin.saveScore', 'signin.body', 'signin.google', 'signin.emailDivider', 'signin.emailPlaceholder', 'signin.emailCta', 'signin.sent',
  'signin.network', 'signin.privacy',
  'onboarding.usernameTitle', 'onboarding.usernameHint', 'onboarding.usernameTaken',
];

describe('copy/anime/p1.ts', () => {
  const keys = Object.keys(COPY);
  it('has every key of the brief (a plural key as its .one and .other)', () => {
    for (const k of LISTED) expect(keys.some((x) => x === k || x === `${k}.one` || x === `${k}.other`), k).toBe(true);
  });
  it('has no keys of the refused welcome cards (CR-002 to CR-006)', () => {
    // anime.p1.welcome, anime.p1.appear, anime.p1.keep and anime.p1.oshi.rowTitle: refused for O1 (LEDGER D-027)
    expect(keys.filter((k) => /^(welcome|appear|keep)(\.|$)/.test(k) || k === 'oshi.rowTitle')).toEqual([]);
  });
  it('keys follow the pattern, values are strings without a K-pop word, a dash or an emoji', () => {
    for (const [k, v] of Object.entries(COPY)) {
      expect(k).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/);
      expect(typeof v).toBe('string');
      expect(v).not.toMatch(/k-?pop/i);
      expect(v).not.toMatch(/[\u2013\u2014]/);
      expect(v).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe('the words of a world site', () => {
  it('are undefined on kpop (nothing of this folder reaches a kpop render)', () => {
    expect(passportWords('kpop')).toBeUndefined();
    expect(signInWords('kpop')).toBeUndefined();
    expect(onboardingWords('kpop')).toBeUndefined();
  });
  it('say OtakuQuiz and Bunnyverse from the registry, never K-pop', () => {
    expect(p1('signin.title', {}, 'anime')).toBe('Sign in to OtakuQuiz');
    expect(p1('signin.network', {}, 'anime')).toContain('Bunnyverse');
    expect(p1('account.signOutHere', {}, 'anime')).toBe('Sign out of OtakuQuiz only');
    expect(p1('signin.title', {}, 'hub')).toBe('Sign in to Bunnyverse');
    const all = JSON.stringify([passportWords('anime'), signInWords('anime'), onboardingWords('anime'), passportWords('hub'), signInWords('hub')]);
    // Bunnyverse (owner, 2026-10-28, reverses D-099): bunnyverse.org signs in with Google and Discord. Discord is named
    // only as a sign-in method ("Google or Discord") and as the label of its button, nowhere else.
    expect(signInWords('anime')?.discord).toBe('Continue with Discord');
    expect(signInWords('hub')?.discord).toBe('Continue with Discord');
    expect(all.replaceAll('Google or Discord', '').replaceAll('"discord":"Continue with Discord"', '')).not.toMatch(/k-?pop|discord|stan\b/i);
    expect(passportWords('anime')?.tagIcon).toBe('star');
    expect(passportWords('hub')?.tagIcon).toBe('heart');
  });
  it('the email link lands on the registry landing of the site', () => {
    expect(signInWords('anime')?.emailLanding).toBe('/auth/confirm');
    expect(signInWords('hub')?.emailLanding).toBe('/auth/confirm');
  });
});
