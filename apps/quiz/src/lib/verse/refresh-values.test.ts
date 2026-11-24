// Verse weekly refresh (owner, 2026-11-24): the run of Monday 2026-11-23 07:00 UTC put back on BTS, TXT, IVE, ATEEZ, RIIZE, NewJeans, aespa and
// FIFTY FIFTY the US distribution label Wikidata lists first, undoing the Wikipedia corrections of L19 and L34 (Jimin showed "Columbia Records" in
// Kpopdle). What the refresh writes for one group: a corrected field is never written, and a label the group holds stays while Wikidata lists it.
import { describe, expect, it, vi } from 'vitest';

import { runVerseRefresh, refreshValues } from './refresh';

const v = (value: string) => ({ value });
// The answer of the SPARQL query for BTS: one row per combination, the labels in no fixed order.
const BTS_ROWS = [
  { inception: v('2013-06-13T00:00:00Z'), labelLabel: v('Columbia Records'), countryLabel: v('South Korea'), website: v('http://bts.ibighit.com') },
  { inception: v('2013-06-13T00:00:00Z'), labelLabel: v('BigHit Music'), countryLabel: v('South Korea'), website: v('http://bts.ibighit.com') },
  { inception: v('2013-06-13T00:00:00Z'), labelLabel: v('Def Jam Japan'), countryLabel: v('South Korea'), website: v('http://bts.ibighit.com') },
];

describe('refreshValues: what the weekly refresh writes for one group', () => {
  it('a field another source corrected (Wikipedia, official) is never written', () => {
    const out = refreshValues(BTS_ROWS, { record_label: 'BigHit Music' }, new Set(['record_label']));
    expect('record_label' in out).toBe(false);
    expect(out).toEqual({ inception_date: '2013-06-13', origin_country: 'South Korea', official_website: 'http://bts.ibighit.com' });
  });

  it('the label the group holds stays while Wikidata still lists it, whatever the order of the answer', () => {
    expect(refreshValues(BTS_ROWS, { record_label: 'BigHit Music' }, new Set()).record_label).toBe('BigHit Music');
    expect(refreshValues([...BTS_ROWS].reverse(), { record_label: 'BigHit Music' }, new Set()).record_label).toBe('BigHit Music');
  });

  it('a label Wikidata no longer lists gives way to the first one it lists, as before', () => {
    expect(refreshValues(BTS_ROWS, { record_label: 'Old Label' }, new Set()).record_label).toBe('Columbia Records');
    expect(refreshValues(BTS_ROWS, {}, new Set()).record_label).toBe('Columbia Records');
  });

  it('with no correction and no answer, the four fields are written empty, as before', () => {
    expect(refreshValues([], {}, new Set())).toEqual({ inception_date: null, record_label: null, origin_country: null, official_website: null });
  });
});

// A Supabase client double: the reads of one group and what the refresh writes.
function fakeDb(state: { sources: { field: string; source: string }[]; group: Record<string, string | null> }) {
  const writes: { table: string; op: string; value: unknown }[] = [];
  const chain = (table: string, op: string, value?: unknown) => {
    const filters: [string, string, unknown][] = [];
    const q = {
      select: () => q,
      eq: (c: string, x: unknown) => { filters.push(['eq', c, x]); return q; },
      neq: (c: string, x: unknown) => { filters.push(['neq', c, x]); return q; },
      not: () => q,
      order: () => q,
      maybeSingle: async () => ({ data: table === 'groups' ? state.group : null, error: null }),
      then: (res: (r: unknown) => unknown) => {
        if (op !== 'select') { writes.push({ table, op, value }); return Promise.resolve({ data: null, error: null }).then(res); }
        let data: unknown = [];
        if (table === 'verse_seed_ids') data = [{ group_id: 1, wikidata_qid: 'Q13580495', musicbrainz_mbid: null, groups: { slug: 'bts' } }];
        if (table === 'entity_sources') {
          const neq = filters.find((f) => f[0] === 'neq' && f[1] === 'source');
          data = state.sources.filter((s) => !neq || s.source !== neq[2]).map((s) => ({ field: s.field }));
        }
        return Promise.resolve({ data, error: null }).then(res);
      },
    };
    return q;
  };
  return {
    writes,
    from: (table: string) => ({
      select: () => chain(table, 'select'),
      update: (value: unknown) => chain(table, 'update', value),
      upsert: (value: unknown) => chain(table, 'upsert', value),
      insert: (value: unknown) => chain(table, 'insert', value),
    }),
  };
}

describe('runVerseRefresh: a corrected label is left alone in the database', () => {
  it('BTS corrected from Wikipedia: the update and the wikidata source rows leave record_label out', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ results: { bindings: BTS_ROWS } }), { status: 200 })));
    try {
      const db = fakeDb({ sources: [{ field: 'record_label', source: 'wikipedia' }, { field: 'record_label', source: 'wikidata' }], group: { record_label: 'BigHit Music' } });
      const stats = await runVerseRefresh(db as never);
      expect(stats.errors).toEqual([]);
      const update = db.writes.find((w) => w.table === 'groups' && w.op === 'update')?.value as Record<string, unknown>;
      expect(update).toEqual({ inception_date: '2013-06-13', origin_country: 'South Korea', official_website: 'http://bts.ibighit.com' });
      const upsert = db.writes.find((w) => w.table === 'entity_sources' && w.op === 'upsert')?.value as { field: string }[];
      expect(upsert.map((r) => r.field).sort()).toEqual(['inception_date', 'official_website', 'origin_country']);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
