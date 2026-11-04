// Surprise me on the kpopquiz.org home (owner, 2026-11-04): the pick shows the picture of its group (groups.logo_url) in place of the initials.
// The logos come in one more read, apart from the quiz read (surprise-kpop.test.ts keeps pinning that one): the groups table joined on the
// group name, past the 1000 row cap; a group with no usable logo, or a failed read, leaves the card exactly as it was.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeDb, ORIGINS, quizRow } from './test-support';
import { groupLogoOf } from './util';

import type { HubSurpriseCard } from './types';

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

const LOGO = 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/group-logos/loossemble.jpg';
const card = (id: string, group: string): HubSurpriseCard => ({ id, site: 'kpop', siteName: 'KpopQuiz', tile: group.slice(0, 2).toUpperCase(), title: `Quiz ${id}`, group, href: `${ORIGINS.kpop}/q/${id}` });

describe('groupLogoOf: the logo a tile can draw', () => {
  it('takes an https URL on a host the site serves, and a path of the site itself, trimmed', () => {
    expect(groupLogoOf(LOGO)).toBe(LOGO);
    expect(groupLogoOf(`  ${LOGO}  `)).toBe(LOGO);
    expect(groupLogoOf('/logos/blackpink.svg')).toBe('/logos/blackpink.svg');
  });

  it('gives null for no logo, a blank one, another host, a protocol-relative URL, plain http and anything that is not a picture address', () => {
    for (const bad of [null, undefined, '', '   ', 'https://elsewhere.example/x.png', '//rdkgouofytwfdpbxbzio.supabase.co/x.png', 'http://rdkgouofytwfdpbxbzio.supabase.co/x.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', 'loossemble.jpg']) {
      expect(groupLogoOf(bad), String(bad)).toBeNull();
    }
  });
});

describe('withGroupLogos', () => {
  it('gives each card the logo of its group, and leaves the others as they were: no logo key at all', async () => {
    const { withGroupLogos } = await import('./surprise-kpop');
    const db = fakeDb({
      groups: [
        { id: 1, name: 'Loossemble', logo_url: LOGO },
        { id: 2, name: 'BTS', logo_url: null },
        { id: 3, name: 'Odd Host', logo_url: 'https://elsewhere.example/x.png' },
        { id: 4, name: 'Blank', logo_url: '  ' },
        { id: 5, name: 'BLACKPINK', logo_url: '/logos/blackpink.svg' },
        { id: 6, name: 'Not In Pool', logo_url: LOGO },
      ],
    });
    const pool = [card('a', 'Loossemble'), card('b', 'BTS'), card('c', 'Odd Host'), card('d', 'Blank'), card('e', 'BLACKPINK'), card('f', 'Loossemble'), card('g', 'Unknown Group')];
    const out = await withGroupLogos(pool, db as never);
    expect(out.map((c) => c.logo ?? null)).toEqual([LOGO, null, null, null, '/logos/blackpink.svg', LOGO, null]);
    for (const c of [out[1]!, out[2]!, out[3]!, out[6]!]) expect('logo' in c).toBe(false);
    // Nothing else of a card changes, and the pool it was given is not touched.
    expect(out.map(({ logo: _logo, ...rest }) => rest)).toEqual(pool);
    expect(pool.some((c) => 'logo' in c)).toBe(false);
    expect(db.calls.map((c) => c.table)).toEqual(['groups']);
  });

  it('pages the groups past the 1000 row cap', async () => {
    const { withGroupLogos } = await import('./surprise-kpop');
    const groups = Array.from({ length: 1200 }, (_, i) => ({ id: i + 1, name: `Group ${i}`, logo_url: `${LOGO}?g=${i}` }));
    const out = await withGroupLogos([card('a', 'Group 3'), card('b', 'Group 1150')], fakeDb({ groups }) as never);
    expect(out.map((c) => c.logo)).toEqual([`${LOGO}?g=3`, `${LOGO}?g=1150`]);
  });

  it('keeps the pool as it is when the groups read fails: the tile keeps the initials, the block is not lost', async () => {
    const { withGroupLogos } = await import('./surprise-kpop');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const pool = [card('a', 'Loossemble')];
    const out = await withGroupLogos(pool, fakeDb({ groups: [] }, { failing: { groups: 'database unreachable' } }) as never);
    expect(out).toEqual(pool);
    expect('logo' in out[0]!).toBe(false);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0]!.join(' '))).toContain('database unreachable');
  });

  it('comes after the quiz read of readKpopSurprisePool, which stays as it was and carries no logo', async () => {
    const { readKpopSurprisePool, withGroupLogos } = await import('./surprise-kpop');
    const db = fakeDb({
      quizzes: [quizRow({ id: 'k-1', slug: 'k-1', group_id: 1, groups: { name: 'Loossemble', slug: 'loossemble' } }), quizRow({ id: 'k-2', slug: 'k-2', group_id: 2, groups: { name: 'BTS', slug: 'bts' } })],
      groups: [{ id: 1, name: 'Loossemble', logo_url: LOGO }, { id: 2, name: 'BTS', logo_url: null }],
    });
    const pool = (await readKpopSurprisePool(ORIGINS, new Date('2026-11-04T12:00:00Z'), db as never))!;
    expect(pool).toHaveLength(2);
    expect(pool.every((c) => !('logo' in c))).toBe(true);
    expect(db.calls.map((c) => c.table)).toEqual(['quizzes']);
    const out = await withGroupLogos(pool, db as never);
    expect(Object.fromEntries(out.map((c) => [c.group, c.logo ?? null]))).toEqual({ Loossemble: LOGO, BTS: null });
    expect(db.calls.map((c) => c.table)).toEqual(['quizzes', 'groups']);
  });
});
