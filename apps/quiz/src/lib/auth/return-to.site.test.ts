// Run O1, lot (c) part 2 (B3): safeReturnTo with the optional third parameter `site` (the origin of the check is
// that site's registry url). Without it the answer is today's (return-to.test.ts, untouched, pins that).
import { describe, expect, it } from 'vitest';

import { REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { PassportServerFns } from '@/lib/passport/types';

import { safeReturnTo } from './return-to';

const HOSTILE = [
  'https://evil.tld', 'http://evil.tld/path', '//evil.tld', '/\\evil.tld', '\\\\evil.tld', '/\\/evil.tld', '/\t/evil.tld',
  '/\n/evil.tld', 'javascript:alert(1)', 'data:text/html,x', '/%0d%0a//evil.tld'.replace('%0d%0a', '\r\n'), 'evil.tld/path', '',
];

describe('safeReturnTo(raw, fallback, site)', () => {
  it('satisfies the contract signature (a drift fails tsc)', () => {
    const contract: PassportServerFns['safeReturnTo'] = safeReturnTo;
    expect(contract).toBe(safeReturnTo);
  });

  it('keeps a same-site path, with its query and hash, for every site', () => {
    for (const site of SITE_IDS) {
      expect(safeReturnTo('/', '/', site)).toBe('/');
      expect(safeReturnTo('/q/bts-quiz', '/', site)).toBe('/q/bts-quiz');
      expect(safeReturnTo('/quizzes?x=1#top', '/', site)).toBe('/quizzes?x=1#top');
    }
  });

  it('refuses another site, whatever the spelling, and gives the fallback', () => {
    for (const site of SITE_IDS) {
      for (const hostile of HOSTILE) {
        expect(safeReturnTo(hostile, '/safe', site)).toBe('/safe');
      }
      // an absolute url of the very same site is not a path either
      expect(safeReturnTo(`${REGISTRY[site].url}/x`, '/safe', site)).toBe('/safe');
    }
  });

  it('keeps the bounds of today: 2048 characters, a leading slash, no control character', () => {
    const long = `/${'a'.repeat(2047)}`;
    expect(safeReturnTo(long, '/f', 'anime')).toBe(long);
    expect(safeReturnTo(`${long}a`, '/f', 'anime')).toBe('/f');
    expect(safeReturnTo(null, '/f', 'hub')).toBe('/f');
    expect(safeReturnTo(undefined, '/f', 'hub')).toBe('/f');
    expect(safeReturnTo('/a\u0001b', '/f', 'anime')).toBe('/f');
  });

  it('answers the same as the call without a site for every input (the origin cannot change a path)', () => {
    const inputs = ['/', '/a/b?c=d#e', '/%2F%2Fevil.tld', '/a b', '/..//x', '/./x', ...HOSTILE];
    for (const site of SITE_IDS) {
      for (const raw of inputs) expect(safeReturnTo(raw, '/f', site)).toBe(safeReturnTo(raw, '/f'));
    }
  });
});
