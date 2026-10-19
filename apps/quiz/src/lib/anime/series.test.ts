import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => { throw new Error('no network in a unit test'); } }));

import { loadRelatedSeries, loadSeriesHub, getSeriesHub } from './series';
import { FIXTURE_SLUGS, fakeDb, hubFromFixture, tablesOf } from './test-support';

describe('loadSeriesHub', () => {
  for (const slug of FIXTURE_SLUGS) {
    it(`loads the ${slug} fixture whole`, async () => {
      const source = hubFromFixture(slug, { picks: { 1: 42 } });
      const hub = await loadSeriesHub(fakeDb(tablesOf(source)), slug);
      expect(hub).not.toBeNull();
      expect(hub!.series.title_en).toBe(source.series.title_en);
      expect(hub!.arcs.map((a) => a.ord)).toEqual(source.arcs.map((a) => a.ord));
      expect(hub!.characters).toHaveLength(source.characters.length);
      expect(hub!.themes).toHaveLength(source.themes.length);
      expect(hub!.quizzes).toHaveLength(5);
      expect(hub!.group.quiz_count).toBe(5);
      expect(hub!.oshiCounts).toEqual({ 1: 42 });
    });
  }

  it('reads every table of the brief and nothing else', async () => {
    const db = fakeDb(tablesOf(hubFromFixture('death-note')));
    await loadSeriesHub(db, 'death-note');
    expect([...new Set(db.calls)].sort()).toEqual(['arcs', 'characters', 'entity_sources', 'favourite_character_counts', 'groups', 'quizzes', 'series', 'series_themes', 'trivia']);
  });

  it('orders the themes op, ed, insert and by number', async () => {
    const source = hubFromFixture('death-note');
    const themes = [
      { ...source.themes[0]!, id: 1, kind: 'insert' as const, number: 1 },
      { ...source.themes[0]!, id: 2, kind: 'ed' as const, number: 2 },
      { ...source.themes[0]!, id: 3, kind: 'op' as const, number: 2 },
      { ...source.themes[0]!, id: 4, kind: 'op' as const, number: 1 },
      { ...source.themes[0]!, id: 5, kind: 'ed' as const, number: 1 },
    ];
    const hub = await loadSeriesHub(fakeDb({ ...tablesOf(source), series_themes: { data: themes } }), 'death-note');
    expect(hub!.themes.map((t) => `${t.kind}${t.number}`)).toEqual(['op1', 'op2', 'ed1', 'ed2', 'insert1']);
  });

  it('returns null for a slug with no group row', async () => {
    expect(await loadSeriesHub(fakeDb({ ...tablesOf(hubFromFixture('death-note')), groups: { data: [] } }), 'nothing')).toBeNull();
  });

  it('returns null for a group that is not a published series', async () => {
    const source = hubFromFixture('death-note');
    expect(await loadSeriesHub(fakeDb({ ...tablesOf(source), series: { data: [] } }), 'death-note')).toBeNull();
    expect(await loadSeriesHub(fakeDb({ ...tablesOf(source), series: { data: { ...source.series, published: false } } }), 'death-note')).toBeNull();
  });

  // Before SQL 011 is applied none of the series tables exists: every read answers an error, and the page must 404.
  it('returns null, and does not throw, when the tables are missing', async () => {
    const missing = { error: { message: 'relation "public.series" does not exist' } };
    const source = hubFromFixture('death-note');
    for (const table of ['series', 'arcs', 'characters', 'series_themes', 'entity_sources', 'favourite_character_counts', 'trivia', 'quizzes']) {
      const hub = await loadSeriesHub(fakeDb({ ...tablesOf(source), [table]: missing }), 'death-note');
      expect(hub, table).toBeNull();
    }
    expect(await loadSeriesHub(fakeDb({ groups: missing }), 'death-note')).toBeNull();
  });

  it('returns null when the client itself throws', async () => {
    const boom = { from: () => { throw new Error('network down'); } };
    expect(await loadSeriesHub(boom, 'death-note')).toBeNull();
  });

  it('getSeriesHub answers null when the server client cannot even be built', async () => {
    expect(await getSeriesHub('death-note')).toBeNull();
  });
});

describe('loadRelatedSeries', () => {
  it('lists the other published series, the busiest first, and leaves the current one out', async () => {
    const db = fakeDb({
      series: { data: [{ group_id: 1 }, { group_id: 2 }, { group_id: 3 }] },
      groups: { data: [{ id: 2, slug: 'one-piece', name: 'One Piece', quiz_count: 9 }, { id: 3, slug: 'spy-x-family', name: 'Spy x Family', quiz_count: 12 }] },
    });
    expect(await loadRelatedSeries(db, 1)).toEqual([
      { slug: 'spy-x-family', name: 'Spy x Family', quizzes: 12 },
      { slug: 'one-piece', name: 'One Piece', quizzes: 9 },
    ]);
  });
  it('is [] when the tables are missing', async () => {
    expect(await loadRelatedSeries(fakeDb({ series: { error: { message: 'missing' } } }), 1)).toEqual([]);
  });
});
