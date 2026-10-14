import { describe, expect, it } from 'vitest';

import { shownSpellings } from './about';

// The line-up below a Name them all game (owner, 2026-10-13: SEO): each member with the
// other answers the game accepts, never the display name twice.

describe('shownSpellings', () => {
  it('drops the display name and repeats, keeps the order, caps the list', () => {
    expect(shownSpellings('Bang Chan', ['Chan', 'bang chan', 'Chris', 'Christopher Bang', 'chan', '방찬', 'Channie'])).toEqual(['Chan', 'Chris', 'Christopher Bang', '방찬']);
  });
  it('a member with no other spelling shows none', () => {
    expect(shownSpellings('Felix', [' ', 'FELIX'])).toEqual([]);
  });
});
