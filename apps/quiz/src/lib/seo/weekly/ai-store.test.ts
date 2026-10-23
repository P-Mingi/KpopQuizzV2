import { describe, expect, it } from 'vitest';

import { monthStart, saveAiImport, validateImportPayload } from './ai-store';

import type { SupabaseClient } from '@supabase/supabase-js';

describe('monthStart', () => {
  it('accepts YYYY-MM and YYYY-MM-01 only', () => {
    expect(monthStart('2026-09')).toBe('2026-09-01');
    expect(monthStart('2026-09-01')).toBe('2026-09-01');
    expect(monthStart('2026-13')).toBeNull();
    expect(monthStart('2026-09-15')).toBeNull();
    expect(monthStart(202609)).toBeNull();
  });
});

describe('validateImportPayload', () => {
  const ok = { month: '2026-09', queries: [{ query: 'kpop games', intent: 'Media', topic: 'Gaming', citations: 453, share: 0.0513 }], pages: [{ url: 'https://kpopquiz.org/bts-quiz', citations: 10, share: null }] };

  it('keeps well-formed rows', () => {
    expect(validateImportPayload(ok)).toEqual({ month: '2026-09-01', queries: ok.queries, pages: ok.pages });
  });

  it('refuses bad months, bad numbers, shares above 1, duplicates and empty uploads', () => {
    expect(validateImportPayload({ ...ok, month: 'sept' })).toEqual({ error: 'Mois invalide (attendu AAAA-MM).' });
    expect(validateImportPayload({ ...ok, queries: [{ query: 'x', citations: -1, share: null }] })).toHaveProperty('error');
    expect(validateImportPayload({ ...ok, queries: [{ query: 'x', citations: 1.5, share: null }] })).toHaveProperty('error');
    expect(validateImportPayload({ ...ok, queries: [{ query: 'x', citations: 1, share: 25 }] })).toHaveProperty('error');
    expect(validateImportPayload({ ...ok, queries: [ok.queries[0], ok.queries[0]] })).toHaveProperty('error');
    expect(validateImportPayload({ month: '2026-09', queries: [], pages: [] })).toEqual({ error: 'Aucune ligne à enregistrer.' });
    expect(validateImportPayload('nope')).toHaveProperty('error');
  });
});

describe('saveAiImport', () => {
  function fakeDb(missing: boolean) {
    const ops: string[] = [];
    const error = missing ? { code: '42P01', message: 'relation does not exist' } : null;
    const db = {
      from(table: string) {
        return {
          delete: () => ({ eq: (_c: string, v: string) => { ops.push(`delete ${table} ${v}`); return Promise.resolve({ error }); } }),
          insert: (rows: unknown[]) => { ops.push(`insert ${table} ${rows.length}`); return Promise.resolve({ error }); },
        };
      },
    };
    return { db: db as unknown as SupabaseClient, ops };
  }

  it('replaces the month of each uploaded tab (fake client, no database)', async () => {
    const { db, ops } = fakeDb(false);
    const r = await saveAiImport(db, { month: '2026-09-01', queries: [{ query: 'a', intent: '', topic: '', citations: 1, share: null }], pages: [] });
    expect(r).toEqual({ ok: true, rows: 1 });
    expect(ops).toEqual(['delete seo_bing_ai_queries 2026-09-01', 'insert seo_bing_ai_queries 1']);
  });

  it('says table_missing before the migration', async () => {
    const { db } = fakeDb(true);
    const r = await saveAiImport(db, { month: '2026-09-01', queries: [{ query: 'a', intent: '', topic: '', citations: 1, share: null }], pages: [] });
    expect(r).toEqual({ ok: false, reason: 'table_missing', detail: 'seo_bing_ai_queries' });
  });
});
