// Run O1, lot (c), lane B6: GET /api/n/me (apis.md 4.1) with the reads answered by the test.
import { describe, expect, it } from 'vitest';

import { buildNetMe, handleMe } from './me';

import type { MyPassportRow } from '@/lib/passport/types';
import type { MeSource } from './me';

const row = (site_id: MyPassportRow['site_id'], over: Partial<MyPassportRow> = {}): MyPassportRow => ({
  site_id, joined_at: '2026-02-01T00:00:00Z', joined_via: 'signup', via_code: null, activated_at: '2026-02-02T00:00:00Z', xp: 0, plays: 0,
  daily_streak: 0, quizzes_created: 0, show_elsewhere: true, ...over,
});

const source = (over: Partial<MeSource> = {}): MeSource => ({
  userId: async () => 'u1',
  passport: async () => [row('anime', { xp: 900, plays: 5 }), row('kpop', { xp: 100, plays: 12, activated_at: null })],
  prefs: async () => null,
  ...over,
});

describe('buildNetMe', () => {
  it('has the defaults of a viewer with no passport_prefs row, sites in SITE_IDS order', () => {
    const me = buildNetMe([row('anime', { xp: 900, plays: 5 }), row('kpop', { xp: 100, plays: 12 })], null);
    expect(me.sites.map((s) => s.id)).toEqual(['kpop', 'anime']);
    expect(me.sites[1]).toMatchObject({ id: 'anime', plays: 5, joinedAt: '2026-02-01T00:00:00Z', activated: true });
    expect(me.sites[1]!.level).toBeGreaterThanOrEqual(1);
    expect(me).toMatchObject({ worlds: {}, suggestions: true, dismissed: {}, welcomed: [], yourSitesMenu: 'auto' });
  });
  it('reads the prefs row and drops what it does not know', () => {
    const me = buildNetMe([row('kpop')], {
      worlds: { anime: 'yes', hub: 'no', mars: 'yes', kpop: 'maybe' },
      crossover_suggestions: false,
      dismissed: { menu: '2026-12-01T00:00:00Z', nope: '2026-12-01T00:00:00Z', xfact: 5 },
      welcomed_sites: ['anime', 'mars'],
      your_sites_menu: 'hide',
    });
    expect(me.worlds).toEqual({ anime: 'yes', hub: 'no' });
    expect(me.suggestions).toBe(false);
    expect(me.dismissed).toEqual({ menu: '2026-12-01T00:00:00Z' });
    expect(me.welcomed).toEqual(['anime']);
    expect(me.yourSitesMenu).toBe('hide');
  });
  it('an activated_at of null is not activated; a bad menu mode is auto', () => {
    const me = buildNetMe([row('kpop', { activated_at: null })], { your_sites_menu: 'weird' });
    expect(me.sites[0]!.activated).toBe(false);
    expect(me.yourSitesMenu).toBe('auto');
  });
});

describe('handleMe', () => {
  it('401 unauthenticated for a guest, never cached', async () => {
    const res = await handleMe(source({ userId: async () => null }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });
  it('200 NetMe, private and no-store', async () => {
    const res = await handleMe(source());
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const body = await res.json() as { sites: { id: string }[]; suggestions: boolean };
    expect(body.sites.map((s) => s.id)).toEqual(['kpop', 'anime']);
    expect(body.suggestions).toBe(true);
  });
  it('a failing read is a 503 without detail, and asks nothing else of a guest', async () => {
    let asked = false;
    const guest = await handleMe(source({ userId: async () => null, passport: async () => { asked = true; return []; } }));
    expect(guest.status).toBe(401);
    expect(asked).toBe(false);
    expect((await handleMe(source({ passport: async () => null }))).status).toBe(503);
    const thrown = await handleMe(source({ prefs: async () => { throw new Error('secret detail'); } }));
    expect(thrown.status).toBe(503);
    expect(JSON.stringify(await thrown.json())).not.toContain('secret');
  });
});
