// V12 (A1, request G4 R2): /live and /join light Blindtest in the top bar and the tab
// bar with the flag on (prototype NAVMAP / TABMAP `livegame: 'blindtest'`). With the
// flag off (v11 only) nothing is active there, as before.

import { describe, expect, it } from 'vitest';

import { activeNav, activeTab } from './nav';

const LIVE = ['/live', '/live/', '/live/ABCD', '/live/ABCD/host', '/join', '/join/ABCD', '/pt/live', '/live?playlist=gg&name=GG'];
const NOT_LIVE = ['/lives', '/livestream', '/joined', '/join-us', '/x/live', '/kpop-live-quiz'];

describe('live room nav (G4 R2)', () => {
  it('flag on: Blindtest is active on every live and join path', () => {
    for (const p of LIVE) {
      expect(activeNav(p, true), p).toBe('blindtest');
      expect(activeTab(p, true), p).toBe('blindtest');
    }
  });

  it('flag off: the v11 answer is unchanged (nothing active)', () => {
    for (const p of LIVE) {
      expect(activeNav(p, false), p).toBeNull();
      expect(activeTab(p, false), p).toBeNull();
    }
  });

  it('look-alike paths are not caught, flag on or off', () => {
    for (const p of NOT_LIVE) {
      for (const v12 of [true, false]) {
        expect(activeNav(p, v12), `${p} ${v12}`).toBe(activeNav(p, false));
        expect(activeTab(p, v12), `${p} ${v12}`).toBe(activeTab(p, false));
      }
    }
    expect(activeNav('/kpop-live-quiz', true)).toBe('groups');
  });
});
