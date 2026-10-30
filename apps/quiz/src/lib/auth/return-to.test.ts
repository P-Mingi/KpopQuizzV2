import { describe, expect, it } from 'vitest';

import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  it('keeps a same-site path, with its query and hash', () => {
    expect(safeReturnTo('/')).toBe('/');
    expect(safeReturnTo('/q/bts-quiz')).toBe('/q/bts-quiz');
    expect(safeReturnTo('/quiz/abc/edit?step=2#top')).toBe('/quiz/abc/edit?step=2#top');
    expect(safeReturnTo('/create?resume=1')).toBe('/create?resume=1');
    expect(safeReturnTo('/verse/bts/essays/write')).toBe('/verse/bts/essays/write');
  });

  it('falls back to the home when nothing is given', () => {
    expect(safeReturnTo(null)).toBe('/');
    expect(safeReturnTo(undefined)).toBe('/');
    expect(safeReturnTo('')).toBe('/');
    expect(safeReturnTo(null, '/quizzes')).toBe('/quizzes');
  });

  it('refuses another site, whatever the spelling', () => {
    for (const hostile of [
      'https://evil.tld',
      'http://evil.tld/path',
      '//evil.tld',
      '/\\evil.tld',
      '\\\\evil.tld',
      '/\\/evil.tld',
      '/\t/evil.tld',
      '/\n/evil.tld',
      '%2F%2Fevil.tld',
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'evil.tld',
      ' //evil.tld',
      'https:evil.tld',
      '///evil.tld',
    ]) {
      expect(safeReturnTo(hostile), hostile).toBe('/');
    }
  });

  it('what searchParams.get() hands over for an encoded host is refused too', () => {
    // ?returnTo=%2F%2Fevil.tld is decoded once by URLSearchParams before it reaches us.
    const decoded = new URL('https://kpopquiz.org/auth/callback?returnTo=%2F%2Fevil.tld').searchParams.get('returnTo');
    expect(decoded).toBe('//evil.tld');
    expect(safeReturnTo(decoded)).toBe('/');
    // Double encoding leaves a string that does not start with a slash.
    const twice = new URL('https://kpopquiz.org/auth/callback?returnTo=%252F%252Fevil.tld').searchParams.get('returnTo');
    expect(safeReturnTo(twice)).toBe('/');
  });

  it('an encoded slash inside a path stays on the site', () => {
    const out = safeReturnTo('/%2F%2Fevil.tld');
    expect(new URL(out, 'https://kpopquiz.org').origin).toBe('https://kpopquiz.org');
  });

  it('every accepted value resolves to the site', () => {
    for (const v of ['/a', '/a/b?c=d', '/@user', '/a:b', '/?returnTo=//evil.tld']) {
      expect(new URL(safeReturnTo(v), 'https://kpopquiz.org').origin).toBe('https://kpopquiz.org');
    }
  });

  // Security fix (Bunnyverse review, 2026-10-28): dot segments that normalise into a protocol-relative path. Before the fix
  // '/.//evil.com' came back as '//evil.com' (the "Just let me play as a guest" link of /login, the onboarding redirect).
  it('refuses a path whose normalised form is protocol-relative (dot segments, encoded dots, backslash variants)', () => {
    for (const hostile of [
      '/.//evil.com', '/a/..//evil.com', '/%2e//evil.com', '/%2E//evil.com', '/././/evil.com', '/a/b/../..//evil.com',
      '/.%2e//evil.com', '/%2e%2e//evil.com', '/..//evil.com', '/.//evil.com/x?y=1#z', '/.//\\evil.com', '/./\\evil.com',
      '/.\\/evil.com', '/%2e/\\evil.com', '/.//%5cevil.com',
    ]) {
      expect(safeReturnTo(hostile), hostile).toBe('/');
      expect(safeReturnTo(hostile, '/safe', 'anime'), hostile).toBe('/safe');
      expect(safeReturnTo(hostile, '/safe', 'hub'), hostile).toBe('/safe');
    }
  });

  it('a dot segment that stays inside the site is still normalised and kept', () => {
    expect(safeReturnTo('/./q/x')).toBe('/q/x');
    expect(safeReturnTo('/a/../q/x?y=1')).toBe('/q/x?y=1');
    expect(safeReturnTo('/%2e/daily')).toBe('/daily');
    for (const v of ['/./q/x', '/a/../q', '/%2e/daily', '/.//evil.com', '/a/..//evil.com']) {
      const out = safeReturnTo(v);
      expect(out.startsWith('//')).toBe(false);
      expect(new URL(out, 'https://kpopquiz.org').origin).toBe('https://kpopquiz.org');
    }
  });

  it('an over-long value is refused', () => {
    expect(safeReturnTo('/' + 'a'.repeat(3000))).toBe('/');
  });
});
