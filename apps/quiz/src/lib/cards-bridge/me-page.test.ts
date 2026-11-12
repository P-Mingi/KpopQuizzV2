// Bunnyverse Cards, review 1 finding 7: the Collection section of kpopquiz.org /me is drawn in the UX_V1 passport too (it sat after the
// UX_V1 return, so the live passport never showed it). With the bridges off the page returns the element it returned before.
import { createElement, isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ collection: null as React.ReactElement | null, ux: true, calls: [] as string[] }));

const thenable = (data: unknown) => {
  const q: Record<string, unknown> = {};
  for (const k of ['select', 'order', 'eq']) q[k] = () => q;
  q.then = (res: (v: unknown) => void) => res({ data, error: null });
  return q;
};
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: () => thenable([]) }),
  createServiceRoleClient: () => ({}),
}));
vi.mock('next/navigation', () => ({ redirect: () => { throw new Error('redirect'); }, notFound: () => { throw new Error('404'); } }));
vi.mock('@/lib/badges/award', () => ({ computeMetrics: async () => null, grantEarnedTiers: async () => [] }));
vi.mock('@/lib/db/queries/profiles', () => ({ getProfileById: async () => ({ id: 'u1', username: 'fan', xp: 0, created_at: '2026-01-01T00:00:00Z' }) }));
vi.mock('@/lib/db/queries/quizzes', () => ({ getQuizzesByCreator: async () => [] }));
vi.mock('@/lib/passport', () => ({
  readPassportSpine: async () => null, readPassportGroupStats: async () => [], readCollectionProgress: async () => ({ groups_mastered: 0, groups_total: 0, eras: [] }),
  computeNearMastery: () => [], computeClimbs: () => [], computeMilestones: () => [], snapshotIfStale: async () => undefined,
}));
vi.mock('@/lib/ux-v1', () => ({ get UX_V1() { return m.ux; } }));
vi.mock('@/components/profile/ux-v1/passport', () => ({ UxPassport: () => null }));
vi.mock('@/lib/ux-v1/p10/build-passport', () => ({ buildPassport: () => ({ username: 'fan', mode: 'personal' }) }));
vi.mock('@/lib/ux-v1/p10/passport-data', () => ({
  readFandomName: async () => null, readAverage: async () => null, readHistory: async () => null, readWar: async () => null, readTeamIdentity: async () => null,
}));
vi.mock('@/lib/cards-bridge/collection', () => ({ loadCollectionKpop: async (id: string) => { m.calls.push(id); return m.collection; } }));

import MyPassportPage from '@/app/(site)/me/page';
import { UxPassport } from '@/components/profile/ux-v1/passport';

beforeEach(() => { m.collection = null; m.ux = true; m.calls = []; });

describe('kpopquiz.org /me with UX_V1 on', () => {
  it('draws the Collection section in the passport footer when the bridges give one', async () => {
    m.collection = createElement('section', { 'data-testid': 'cards-collection' }, 'Collection');
    const el = await MyPassportPage();
    expect(isValidElement(el)).toBe(true);
    expect(el.type).toBe(UxPassport);
    expect((el.props as { footer?: unknown }).footer).toBe(m.collection);
    expect(m.calls).toEqual(['u1']);
  });
  it('with the bridges off the element is the one of before: UxPassport with the built props and no footer', async () => {
    const el = await MyPassportPage();
    expect(el.type).toBe(UxPassport);
    expect(el.props).toEqual({ username: 'fan', mode: 'personal' });
  });
});
