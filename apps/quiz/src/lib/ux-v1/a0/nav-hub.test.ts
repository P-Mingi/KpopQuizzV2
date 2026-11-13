import { describe, expect, it } from 'vitest';

import { REGISTRY } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';

import { activeNav, activeTab, NAV_ITEMS, navItemsFor, TAB_ITEMS, tabItemsFor } from './nav';

// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): the hub branch of the navigation. Every hub page carries the tabs of the
// hub home (Home, Quizzes, Community; no Blind test tab since the owner's decision of 2026-11-07), each leading to a section of the home; the tab bar adds You (the passport page). The kpop
// arrays are not touched (their own test keeps them as they are).

const known = (href: string): boolean => isKnownRouteFor('hub', href.split(/[?#]/)[0]!, { v1: true, v12: true });

describe('the hub navigation', () => {
  // Owner request 2026-11-13 (the passport page lacked it): Daily games, second like on the home, on every hub page while the Burrow is
  // open (the dailyGuess feature on, its pages served). Before, this test said no Burrow tab: its pages did not exist yet.
  it('top bar: Home, Daily games, Quizzes and Community, the tabs of the hub home; no Blind test tab (owner, 2026-11-07)', () => {
    expect(navItemsFor(REGISTRY.hub).map((it) => [it.key, it.label, it.href, it.icon])).toEqual([
      ['home', 'Home', '/', 'home'],
      ['daily', 'Daily games', '/daily', 'grid'],
      ['quizzes', 'Quizzes', '/#hot', 'layers'],
      ['community', 'Community', '/#community', 'msg'],
    ]);
  });

  it('tab bar: the same four (Daily games reads Daily there), then You on the passport page; no Blind test tab (owner, 2026-11-07)', () => {
    expect(tabItemsFor(REGISTRY.hub).map((it) => [it.key, it.label, it.href, it.icon])).toEqual([
      ['home', 'Home', '/', 'home'],
      ['daily', 'Daily', '/daily', 'grid'],
      ['quizzes', 'Quizzes', '/#hot', 'layers'],
      ['community', 'Community', '/#community', 'users'],
      ['you', 'You', '/passport', 'user'],
    ]);
  });

  it('every hub door is a route of the hub, never a kpop path', () => {
    for (const it of [...navItemsFor(REGISTRY.hub), ...tabItemsFor(REGISTRY.hub)]) {
      expect(known(it.href), it.href).toBe(true);
      expect(['/quizzes', '/blindtest', '/community', '/groups', '/leaderboard', '/profile']).not.toContain(it.href);
    }
  });

  it('no Daily games door while the Burrow is closed (the dailyGuess feature off): never a door to a 404', () => {
    const closed = { ...REGISTRY.hub, features: { ...REGISTRY.hub.features, dailyGuess: false } };
    expect(navItemsFor(closed).map((it) => it.key)).toEqual(['home', 'quizzes', 'community']);
    expect(tabItemsFor(closed).map((it) => it.key)).toEqual(['home', 'quizzes', 'community', 'you']);
  });

  it('lights Daily games on the pages of the Burrow and their French twins, and nothing else on the passport page', () => {
    const hub = REGISTRY.hub;
    for (const p of ['/daily', '/kpopdle', '/otakudle', '/otakudle/one-piece', '/fr/daily', '/fr/kpopdle']) expect(activeNav(p, false, 'member', hub), p).toBe('daily');
    expect(activeTab('/kpopdle', false, 'member', hub)).toBe('daily');
    expect(activeNav('/passport', false, 'member', hub)).toBeNull();
    expect(activeTab('/passport', false, 'member', hub)).toBe('you');
    // kpopquiz.org keeps its answer for its own /kpopdle (no Daily games door there)
    expect(activeNav('/kpopdle', false, 'member', REGISTRY.kpop)).toBeNull();
  });

  it('leaves the kpop arrays as they are (the same arrays, untouched by the hub branch)', () => {
    expect(navItemsFor(REGISTRY.kpop)).toBe(NAV_ITEMS);
    expect(tabItemsFor(REGISTRY.kpop)).toBe(TAB_ITEMS);
    expect(NAV_ITEMS.map((it) => it.href)).not.toContain('/#hot');
  });
});
