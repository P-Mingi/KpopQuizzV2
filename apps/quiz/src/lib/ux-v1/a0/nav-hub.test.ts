import { describe, expect, it } from 'vitest';

import { REGISTRY } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';

import { NAV_ITEMS, navItemsFor, TAB_ITEMS, tabItemsFor } from './nav';

// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): the hub branch of the navigation. Every hub page carries the tabs of the
// hub home (Home, Quizzes, Blind test, Community), each leading to a section of the home; the tab bar adds You (the passport page). The kpop
// arrays are not touched (their own test keeps them as they are).

const known = (href: string): boolean => isKnownRouteFor('hub', href.split(/[?#]/)[0]!, { v1: true, v12: true });

describe('the hub navigation', () => {
  it('top bar: Home, Quizzes, Blind test and Community, the sections of the hub home', () => {
    expect(navItemsFor(REGISTRY.hub).map((it) => [it.key, it.label, it.href, it.icon])).toEqual([
      ['home', 'Home', '/', 'home'],
      ['quizzes', 'Quizzes', '/#hot', 'layers'],
      ['blindtest', 'Blind test', '/#today', 'music'],
      ['community', 'Community', '/#fans', 'msg'],
    ]);
  });

  it('tab bar: the same four, then You on the passport page', () => {
    expect(tabItemsFor(REGISTRY.hub).map((it) => [it.key, it.label, it.href, it.icon])).toEqual([
      ['home', 'Home', '/', 'home'],
      ['quizzes', 'Quizzes', '/#hot', 'layers'],
      ['blindtest', 'Blind test', '/#today', 'music'],
      ['community', 'Community', '/#fans', 'users'],
      ['you', 'You', '/passport', 'user'],
    ]);
  });

  it('every hub door is a route of the hub, never a kpop path, and no Burrow tab before its pages exist', () => {
    for (const it of [...navItemsFor(REGISTRY.hub), ...tabItemsFor(REGISTRY.hub)]) {
      expect(known(it.href), it.href).toBe(true);
      expect(['/quizzes', '/blindtest', '/community', '/groups', '/leaderboard', '/profile']).not.toContain(it.href);
    }
    expect([...navItemsFor(REGISTRY.hub), ...tabItemsFor(REGISTRY.hub)].map((it) => it.href)).not.toContain('/daily');
  });

  it('leaves the kpop arrays as they are (the same arrays, untouched by the hub branch)', () => {
    expect(navItemsFor(REGISTRY.kpop)).toBe(NAV_ITEMS);
    expect(tabItemsFor(REGISTRY.kpop)).toBe(TAB_ITEMS);
    expect(NAV_ITEMS.map((it) => it.href)).not.toContain('/#hot');
  });
});
