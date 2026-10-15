// SEO Mission 2, part A: the "{Group} games" section of the group hub (hub-growth.tsx), the
// target of the "K-pop games by group" grid of /kpop-games (/<slug>-quiz#games). Rendered
// server side with the hub's reads mocked: every game of the group, uncapped, a link to
// /kpop-games with the exact anchor "K-pop games", and nothing under two games.

import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HubGrowthData } from '@/lib/ux-v1/p3/growth-data';

const state = vi.hoisted(() => ({ data: null as unknown }));

vi.mock('next/link', async () => {
  const { createElement: h } = await import('react');
  return { default: ({ href, children, prefetch: _p, ...rest }: { href: string; children?: React.ReactNode; prefetch?: boolean }) => h('a', { href, ...rest }, children) };
});
vi.mock('@/lib/ux-v1/p3/growth-data', () => ({ getHubGrowth: async () => state.data }));
vi.mock('./loader', () => ({ HubFansPickedLoader: () => null, HubQuizzesLoader: () => null, HubNotifyLoader: () => null }));

import { HubGrowth } from './hub-growth';

const group = { id: 7, slug: 'stray-kids', name: 'Stray Kids', fandom_name: 'STAY' };

function growth(ways: Partial<HubGrowthData['ways']>): HubGrowthData {
  return {
    ways: {
      slug: 'stray-kids', name: 'Stray Kids', quizzes: 29, songs: 21,
      nameAll: { href: '/stray-kids-name-all-members', members: 8, perfectPct: null },
      whichMember: { href: '/which-stray-kids-member-are-you', results: null },
      thisOrThat: null, live: true,
      ...ways,
    },
    fansPicked: null, recentPlays: null, btPlays: null, firstCreator: null,
  };
}

async function render(published: number, songs: number): Promise<string> {
  return renderToStaticMarkup(await HubGrowth({ group, published, songs, children: null }));
}

beforeEach(() => { state.data = growth({}); });

describe('hub: "{Group} games"', () => {
  it('lists every game of the group under #games, with the K-pop games link', async () => {
    const html = await render(29, 21);
    expect(html).toContain('id="games"');
    expect(html).toContain('<h2 id="kg-hub-h">');
    expect(html).toContain('Stray Kids games</h2>');
    expect(html).toContain('Stray Kids fans can play 5 games on kpopquiz.org, all free.');
    for (const href of ['#hub-quizzes', '/blindtest/group-stray-kids', '/stray-kids-name-all-members', '/which-stray-kids-member-are-you', '/live?playlist=stray-kids&amp;name=Stray%20Kids']) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('<a href="/kpop-games">K-pop games</a>');
    // the four "Ways to play" tiles stay as they were, above
    expect(html.indexOf('data-testid="hub-ways"')).toBeLessThan(html.indexOf('id="games"'));
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });

  it('is not rendered with fewer than two games', async () => {
    state.data = growth({ quizzes: 1, songs: 0, nameAll: null, whichMember: null, live: false });
    expect(await render(1, 0)).not.toContain('id="games"');
  });
});
