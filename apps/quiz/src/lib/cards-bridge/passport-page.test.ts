// Bunnyverse Cards, review 1 finding 13: the hub /passport makes no extra session read with the bridges off (the element is the one of
// before), and the Kpopdle game loads the bonus line only through a dynamic import behind the public flag.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })), collection: vi.fn(async () => null as React.ReactElement | null) }));

vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => ({ auth: { getUser: m.getUser } }) }));
vi.mock('next/navigation', () => ({ redirect: () => { throw new Error('redirect'); } }));
vi.mock('@/lib/site/hub/passport-page', () => ({ readCommonPassport: async () => ({ total: 10 }) }));
vi.mock('@/lib/site/hub/redirects', () => ({ ownPageTarget: async () => '/me' }));
vi.mock('@/components/hub/hub-passport', () => ({ HubPassport: () => null }));
vi.mock('@/lib/cards-bridge/collection', () => ({ loadCollectionHub: m.collection }));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), SITE_ID: 'hub' }));

import PassportPage from '@/app/sites/[site]/(hub)/passport/page';
import { HubPassport } from '@/components/hub/hub-passport';

beforeEach(() => { m.getUser.mockClear(); m.collection.mockReset(); m.collection.mockResolvedValue(null); });
afterEach(() => vi.unstubAllEnvs());

describe('hub /passport', () => {
  it('bridges off: no session read, no Collection read, the element of before', async () => {
    const el = await PassportPage();
    expect(m.getUser).not.toHaveBeenCalled();
    expect(m.collection).not.toHaveBeenCalled();
    expect(el.type).toBe(HubPassport);
    expect(el.props).toEqual({ passport: { total: 10 } });
  });
  it('bridges on: the session is read and the Collection is passed', async () => {
    vi.stubEnv('NET_CARDS', '1');
    vi.stubEnv('NET_CARDS_BRIDGES', '1');
    const section = createElement('section', null, 'Collection');
    m.collection.mockResolvedValue(section);
    const el = await PassportPage();
    expect(m.getUser).toHaveBeenCalledTimes(1);
    expect(m.collection).toHaveBeenCalledWith('u1');
    expect(el.props).toEqual({ passport: { total: 10 }, collection: section });
  });
});

describe('the Kpopdle game', () => {
  it('imports the bonus line only dynamically, behind the public flag', () => {
    const src = readFileSync('src/components/hub/dle/dle-game.tsx', 'utf8');
    expect(src).not.toMatch(/^import [^\n]*cards-bridge/m);
    expect(src).toMatch(/= CARDS_BONUS \? dynamic\(\(\) => import\('@\/components\/cards-bridge\/bonus-pack-line'\)/);
  });
});
