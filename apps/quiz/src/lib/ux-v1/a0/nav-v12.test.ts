// V12 follow-up (requests G3 R8, G6 R3, G5 R3): the active nav item on the new V12
// pages, flag on only. The v11 route map is tested in a0.test.ts and is not touched:
// here every v11 path is asked again with the flag on and with it off.

import { describe, expect, it } from 'vitest';

import { LANDING_LANGS, LANDING_PATH } from '@/lib/growth/bt-landing';
import { prettyPath } from '@/lib/name-all/round';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { BRIDGE_PATH } from '@/lib/personality/bridge';
import { whichMemberPath } from '@/lib/personality/view';

import { activeNav, activeTab } from './nav';

// The v11 table of a0.test.ts, plus hubs that look like the new URLs.
const V11: Array<[string, string | null, string | null]> = [
  ['/', 'home', 'home'],
  ['/quizzes', 'quizzes', 'quizzes'],
  ['/quizzes/popular-this-week', 'quizzes', 'quizzes'],
  ['/q/some-quiz', 'quizzes', 'quizzes'],
  ['/groups', 'groups', 'quizzes'],
  ['/bts-quiz', 'groups', 'quizzes'],
  ['/twice-trivia', 'groups', 'quizzes'],
  ['/blindtest', 'blindtest', 'blindtest'],
  ['/blindtest/ranked', 'blindtest', 'blindtest'],
  ['/blindtest/tiktok-viral', 'blindtest', 'blindtest'],
  ['/community', 'community', 'community'],
  ['/leaderboard', 'leaderboard', 'community'],
  ['/profile', null, 'you'],
  ['/u/someone', null, 'you'],
  ['/settings', null, 'you'],
  ['/notifications', null, 'you'],
  ['/create', null, null],
  ['/pt/quizzes', 'quizzes', 'quizzes'],
  ['/pt', 'home', 'home'],
  ['/quizzesx', null, null],
  ['/kpop-quiz-2026', null, null],
  ['/guess-the-kpop-idol', null, null],
];

const LANDINGS = LANDING_LANGS.map((l) => LANDING_PATH[l]);
const NAME_ALL = NAME_ALL_GROUPS.map((g) => prettyPath(g));
const WMA = ['stray-kids', 'bts', 'g-i-dle', 'le-sserafim'].map((g) => whichMemberPath(g));

describe('nav model, V12 pages', () => {
  it('the fixtures are the real paths', () => {
    expect(LANDINGS).toEqual(['/guess-the-kpop-song', '/fr/blind-test-kpop', '/es/adivina-la-cancion-kpop', '/id/tebak-lagu-kpop']);
    expect(NAME_ALL).toHaveLength(17);
    expect(NAME_ALL).toContain('/stray-kids-name-all-members');
    expect(WMA[0]).toBe('/which-stray-kids-member-are-you');
    expect(BRIDGE_PATH).toBe('/kpop-demon-hunters-quiz');
  });

  it.each(V11)('v11 path %s answers the same with the flag on and off', (p, nav, tab) => {
    for (const v12 of [true, false]) {
      expect(activeNav(p, v12)).toBe(nav);
      expect(activeTab(p, v12)).toBe(tab);
    }
  });

  it.each(LANDINGS)('G3 R8: %s lights Blindtest (top bar and tab bar)', (p) => {
    expect(activeNav(p, true)).toBe('blindtest');
    expect(activeTab(p, true)).toBe('blindtest');
    expect(activeNav(`${p}/`, true)).toBe('blindtest');
    expect(activeNav(`${p}?c=abc`, true)).toBe('blindtest');
  });

  it.each(NAME_ALL)('G6 R3: %s lights Groups (top bar) and Quizzes (tab bar)', (p) => {
    expect(activeNav(p, true)).toBe('groups');
    expect(activeTab(p, true)).toBe('quizzes');
  });

  it('G6 R3 and G5 R3: the internal routes answer like their pretty URL', () => {
    for (const p of ['/name-all/stray-kids', '/personality/bts']) {
      expect(activeNav(p, true)).toBe('groups');
      expect(activeTab(p, true)).toBe('quizzes');
    }
  });

  it.each(WMA)('G5 R3: %s lights Groups (top bar) and Quizzes (tab bar)', (p) => {
    expect(activeNav(p, true)).toBe('groups');
    expect(activeTab(p, true)).toBe('quizzes');
  });

  it('G5 R3: the bridge quiz lights Blindtest, not Groups', () => {
    expect(activeNav(BRIDGE_PATH, true)).toBe('blindtest');
    expect(activeTab(BRIDGE_PATH, true)).toBe('blindtest');
  });

  it('flag off: every one of these paths answers exactly as v11 does today', () => {
    // v11 has no rule for the landings, Name them all or Which member (no item lit);
    // the bridge quiz URL ends with -quiz, so the v11 hub rule lights Groups / Quizzes.
    for (const p of [...LANDINGS, ...NAME_ALL, ...WMA, '/name-all/stray-kids', '/personality/bts']) {
      expect(activeNav(p, false), p).toBeNull();
      expect(activeTab(p, false), p).toBeNull();
    }
    expect(activeNav(BRIDGE_PATH, false)).toBe('groups');
    expect(activeTab(BRIDGE_PATH, false)).toBe('quizzes');
  });

  it('the default argument is the flag: unset in the test run, so v11 answers', () => {
    expect(process.env.NEXT_PUBLIC_UX_V12 ?? '').toBe('');
    expect(activeNav('/guess-the-kpop-song')).toBeNull();
    expect(activeTab('/stray-kids-name-all-members')).toBeNull();
    expect(activeNav(BRIDGE_PATH)).toBe('groups');
  });

  it('near misses stay unlit with the flag on', () => {
    for (const p of ['/guess-the-kpop-song/extra', '/fr', '/fr/other', '/x/stray-kids-name-all-members', '/which-member-are-you', '/-name-all-members']) {
      expect(activeNav(p, true), p).toBeNull();
      expect(activeTab(p, true), p).toBeNull();
    }
  });
});
