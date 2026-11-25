// Owner request 2026-11-25 (kpopquiz.org): Groups under Quizzes, Leaderboard under Community. The tree keeps every URL; the other sites keep the flat bar.
import { describe, expect, it } from 'vitest';

import { REGISTRY } from '@/lib/site/registry';

import { NAV_ITEMS, activeNav, navItemsFor, navTreeFor } from './nav';

describe('navTreeFor', () => {
  it('kpop: Quizzes holds Groups, Community holds Leaderboard, every URL unchanged', () => {
    const tree = navTreeFor(REGISTRY.kpop);
    expect(tree.map((n) => n.key)).toEqual(['home', 'quizzes', 'blindtest', 'community']);
    expect(tree.find((n) => n.key === 'quizzes')!.children.map((c) => [c.key, c.href])).toEqual([['groups', '/groups']]);
    expect(tree.find((n) => n.key === 'community')!.children.map((c) => [c.key, c.href])).toEqual([['leaderboard', '/leaderboard']]);
    const hrefs = tree.flatMap((n) => [n.href, ...n.children.map((c) => c.href)]).sort();
    expect(hrefs).toEqual(NAV_ITEMS.map((i) => i.href).sort());
  });

  it('the other sites keep their flat list, no children', () => {
    for (const site of [REGISTRY.anime, REGISTRY.hub]) {
      const tree = navTreeFor(site);
      expect(tree.map((n) => n.key)).toEqual(navItemsFor(site).map((i) => i.key));
      expect(tree.every((n) => n.children.length === 0)).toBe(true);
    }
  });

  it('a sub-page of Groups or Leaderboard is still known to its own key (the group, then the parent, lights in the bar)', () => {
    expect(activeNav('/groups', false, 'member', REGISTRY.kpop)).toBe('groups');
    expect(activeNav('/groups/bts', false, 'member', REGISTRY.kpop)).toBe('groups');
    expect(activeNav('/bts-quiz', false, 'member', REGISTRY.kpop)).toBe('groups');
    expect(activeNav('/leaderboard', false, 'member', REGISTRY.kpop)).toBe('leaderboard');
    expect(activeNav('/leaderboard/weekly', false, 'member', REGISTRY.kpop)).toBe('leaderboard');
  });
});
