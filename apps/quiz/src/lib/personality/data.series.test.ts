// Run O1, lane PERS: the readers of lib/personality/data.ts on the anime build (the series' own quiz) and on the kpop build (today's
// queries, unchanged). A recording client says which table was read with which filter.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { recordingDb } from '@/lib/site/test-recorder';

import type { RecordedQuery } from '@/lib/site/test-recorder';

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => state.db }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); state.db = null; });

function online(site: 'kpop' | 'anime'): void {
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:9');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'o1-test-anon');
}

const GROUP = { id: 7, slug: 'death-note', name: 'Death Note', fandom_name: null };
const profile = (n: number): Record<string, unknown> => ({
  member_name: `Character ${n}`, member_slug: `character-${n}`, ord: n,
  axes: { energy: 10 * n, chaos: 10, care: 10, craft: 10, heart: 10, spotlight: 10 },
  trait_lines: [`You are number ${n}.`, 'You are fine.'],
  characters: { role: 'main', affiliation: 'Team' },
});
const question = (ord: number): Record<string, unknown> => ({
  ord, question: `Question ${ord}?`,
  options: [{ text: 'A', weights: { energy: 0 } }, { text: 'B', weights: { energy: 5 } }],
});
const sixProfiles = [1, 2, 3, 4, 5, 6].map(profile);
const eightQuestions = [85, 86, 87, 88, 89, 90, 91, 92].map(question);

/** What each of the three tables answers. */
const db = (over: Record<string, unknown> = {}): ReturnType<typeof recordingDb> => recordingDb({
  groups: GROUP, personality_profiles: sixProfiles, personality_questions: eightQuestions, ...over,
});
const ops = (q: RecordedQuery | undefined): Array<[string, unknown[]]> => (q?.ops ?? []).map(([m, a]) => [m, [...a]]);
const of = (d: ReturnType<typeof recordingDb>, table: string): RecordedQuery | undefined => d.queries.find((q) => q.table === table);

describe('anime build: the quiz of a series', () => {
  it('reads the group, its active profiles with their character, and the eight questions of its band, all scoped to anime', async () => {
    online('anime');
    const d = db();
    state.db = d;
    const { getWmaData } = await import('./data');
    const got = await getWmaData('death-note');
    expect(got?.group).toEqual({ id: 7, slug: 'death-note', name: 'Death Note', fandom: null });
    expect(got?.questions).toHaveLength(8);
    expect(got?.profiles.map((p) => p.id)).toEqual(['character-1', 'character-2', 'character-3', 'character-4', 'character-5', 'character-6']);
    expect(got?.profiles[0]).toMatchObject({ lines: ['You are number 1.', 'You are fine.'], role: 'main', affiliation: 'Team' });

    expect(d.scopedTo('groups', 'anime')).toBe(true);
    expect(d.scopedTo('personality_profiles', 'anime')).toBe(true);
    expect(d.scopedTo('personality_questions', 'anime')).toBe(true);
    expect(ops(of(d, 'personality_profiles'))).toEqual([
      ['select', ['member_name, member_slug, axes, ord, trait_lines, characters(role, affiliation)']],
      ['eq', ['site_id', 'anime']], ['eq', ['group_id', 7]], ['eq', ['active', true]], ['order', ['ord']], ['limit', [100]],
    ]);
    // group 7: ord 85 to 96
    expect(ops(of(d, 'personality_questions'))).toEqual([
      ['select', ['ord, question, options']], ['eq', ['site_id', 'anime']], ['eq', ['active', true]], ['gte', ['ord', 85]], ['lte', ['ord', 96]], ['order', ['ord']], ['limit', [12]],
    ]);
  });

  it('is a 404 (null) below six profiles, below eight questions, for an unknown series and for a bad slug', async () => {
    online('anime');
    const { getWmaData } = await import('./data');
    state.db = db({ personality_profiles: sixProfiles.slice(0, 5) });
    expect(await getWmaData('death-note')).toBeNull();
    state.db = db({ personality_questions: eightQuestions.slice(0, 7) });
    expect(await getWmaData('death-note')).toBeNull();
    state.db = db({ groups: null });
    expect(await getWmaData('death-note')).toBeNull();
    const d = db();
    state.db = d;
    expect(await getWmaData('Death Note; drop')).toBeNull();
    expect(d.queries).toHaveLength(0);
  });

  it('a profile without a text is not a result: five good rows and one empty make five, so no page', async () => {
    online('anime');
    state.db = db({ personality_profiles: [...sixProfiles.slice(0, 5), { ...profile(6), trait_lines: [] }] });
    const { getWmaData } = await import('./data');
    expect(await getWmaData('death-note')).toBeNull();
  });

  it('a read error is a 404, never a throw (the page fails closed)', async () => {
    online('anime');
    const failing = new Proxy({}, { get: (_t, prop) => (prop === 'then' ? (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(ok) : () => failing) });
    state.db = { from: () => failing };
    const { getWmaData, getSeriesWmaData } = await import('./data');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await getWmaData('death-note')).toBeNull();
    expect(await getSeriesWmaData('death-note')).toBeNull();
    log.mockRestore();
  });

  it('with no database settings it answers null without a read', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    const d = db();
    state.db = d;
    const { getWmaData } = await import('./data');
    expect(await getWmaData('death-note')).toBeNull();
    expect(d.queries).toHaveLength(0);
  });

  it('the series with a quiz are those with six active profiles (kpop needs two)', async () => {
    const rows = [
      ...[1, 2, 3, 4, 5, 6].map(() => ({ group_id: 1, groups: { slug: 'death-note' } })),
      ...[1, 2].map(() => ({ group_id: 2, groups: [{ slug: 'naruto' }] })),
    ];
    online('anime');
    state.db = recordingDb({ personality_profiles: rows });
    const anime = await import('./data');
    expect(await anime.getWmaGroupSlugs()).toEqual(['death-note']);
    vi.resetModules();
    online('kpop');
    state.db = recordingDb({ personality_profiles: rows });
    const kpop = await import('./data');
    expect(await kpop.getWmaGroupSlugs()).toEqual(['death-note', 'naruto']);
  });
});

describe('kpop build: today\'s reads, unchanged', () => {
  it('Which member are you reads the shared ten questions unscoped, the group and its members, and never a band', async () => {
    online('kpop');
    const d = recordingDb({
      groups: { id: 3, slug: 'stray-kids', name: 'Stray Kids', fandom_name: 'STAY' },
      personality_profiles: [
        { member_name: 'Bang Chan', member_slug: 'bang-chan', ord: 1, axes: { energy: 55, chaos: 30, care: 5, craft: 80, heart: 25, spotlight: 55 } },
        { member_name: 'Lee Know', member_slug: 'lee-know', ord: 2, axes: { energy: 30, chaos: 55, care: 40, craft: 20, heart: 75, spotlight: 60 } },
      ],
      personality_questions: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(question),
    });
    state.db = d;
    const { getWmaData } = await import('./data');
    const got = await getWmaData('stray-kids');
    expect(got?.group.fandom).toBe('STAY');
    expect(got?.questions).toHaveLength(8);
    expect(got?.profiles.map((p) => p.id)).toEqual(['bang-chan', 'lee-know']);
    expect(got?.profiles[0]).not.toHaveProperty('lines');
    expect(ops(of(d, 'personality_questions'))).toEqual([['select', ['ord, question, options']], ['eq', ['active', true]], ['order', ['ord']], ['limit', [100]]]);
    expect(ops(of(d, 'personality_profiles'))).toEqual([
      ['select', ['member_name, member_slug, axes, ord']], ['eq', ['group_id', 3]], ['eq', ['active', true]], ['order', ['ord']], ['limit', [100]],
    ]);
    expect(ops(of(d, 'groups'))).toEqual([['select', ['id, slug, name, fandom_name']], ['eq', ['slug', 'stray-kids']], ['maybeSingle', []]]);
  });
});
