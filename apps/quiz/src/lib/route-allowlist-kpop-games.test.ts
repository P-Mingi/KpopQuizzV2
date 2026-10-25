import { describe, expect, it } from 'vitest';

import { isKnownRouteWith } from './route-allowlist';

// SEO Mission 2, part A: /kpop-games is a public page with every flag combination (the
// middleware would 301 an unknown route to the home page).

describe('route allowlist: /kpop-games', () => {
  it('is known with the flags on and off', () => {
    for (const flags of [{ v1: false, v12: false }, { v1: true, v12: false }, { v1: true, v12: true }]) {
      expect(isKnownRouteWith('/kpop-games', flags)).toBe(true);
    }
  });
});
