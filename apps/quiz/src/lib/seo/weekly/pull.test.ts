import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { runWeeklyPull } from './pull';
import { gscRecords, rowKey } from './store';

import type { FetchLike } from './google-auth';
import type { SupabaseClient } from '@supabase/supabase-js';

// A minimal stand-in for the Supabase client: records writes, and answers "table missing"
// (PostgREST PGRST205) for the tables listed. No database is touched.
function fakeDb(missing: string[] = []) {
  const writes: Array<{ table: string; op: 'upsert' | 'insert'; rows: Record<string, unknown>[]; onConflict?: string | undefined }> = [];
  const db = {
    from(table: string) {
      const error = missing.includes(table) ? { code: 'PGRST205', message: `Could not find the table 'public.${table}'` } : null;
      const builder = {
        select: () => builder,
        in: () => Promise.resolve({ data: [], error }),
        limit: () => Promise.resolve({ data: [], error }),
        upsert: (rows: Record<string, unknown>[], opts?: { onConflict?: string }) => {
          writes.push({ table, op: 'upsert', rows, onConflict: opts?.onConflict });
          return Promise.resolve({ error });
        },
        insert: (row: Record<string, unknown>) => {
          writes.push({ table, op: 'insert', rows: [row] });
          return Promise.resolve({ error });
        },
      };
      return builder;
    },
  };
  return { db: db as unknown as SupabaseClient, writes };
}

const noNetwork: FetchLike = async (url) => {
  throw new Error(`unexpected request to ${new URL(url).host}`);
};

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KEY_JSON = JSON.stringify({ client_email: 'reader@test-project.iam.example.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() });

// Monday 19 October 2026, 10:00 UTC (03:00 in Pacific time, already Monday there).
const NOW = new Date('2026-10-19T10:00:00Z');

describe('runWeeklyPull: fail soft', () => {
  it('no keys: both sources skipped, no request made, the runs logged', async () => {
    const { db, writes } = fakeDb();
    const lines: string[] = [];
    const out = await runWeeklyPull({ db, fetchImpl: noNetwork, now: NOW, env: {}, log: (l) => lines.push(l) });
    expect(out.gsc).toEqual({ status: 'skipped', rows: 0, detail: 'no GSC_SERVICE_ACCOUNT_JSON' });
    expect(out.bing).toEqual({ status: 'skipped', rows: 0, detail: 'no BING_WEBMASTER_API_KEY' });
    expect(writes.filter((w) => w.table === 'seo_weekly_runs')).toHaveLength(2);
    expect(lines).toEqual(['[seo-weekly-data] gsc skipped: 0 rows. no GSC_SERVICE_ACCOUNT_JSON', '[seo-weekly-data] bing skipped: 0 rows. no BING_WEBMASTER_API_KEY']);
  });

  it('keys but no tables (migration not applied): skipped before any API call', async () => {
    const { db, writes } = fakeDb(['seo_gsc_weekly', 'seo_bing_weekly', 'seo_bing_links', 'seo_weekly_runs']);
    const out = await runWeeklyPull({ db, fetchImpl: noNetwork, now: NOW, env: { GSC_SERVICE_ACCOUNT_JSON: KEY_JSON, BING_WEBMASTER_API_KEY: 'k' }, log: () => {} });
    expect(out.gsc.status).toBe('skipped');
    expect(out.gsc.detail).toBe('table seo_gsc_weekly missing (migration not applied)');
    expect(out.bing.detail).toBe('table seo_bing_weekly missing (migration not applied)');
    expect(writes.filter((w) => w.op === 'upsert')).toHaveLength(0);
  });

  it('no database client: skipped', async () => {
    const out = await runWeeklyPull({ db: null, fetchImpl: noNetwork, now: NOW, env: { GSC_SERVICE_ACCOUNT_JSON: KEY_JSON, BING_WEBMASTER_API_KEY: 'k' }, log: () => {} });
    expect(out.gsc.detail).toBe('no database client');
    expect(out.bing.detail).toBe('no database client');
  });
});

describe('runWeeklyPull: Search Console (fake fetch, no network)', () => {
  it('signs in, pulls the last two ISO weeks in Pacific dates and upserts them', async () => {
    const { db, writes } = fakeDb();
    const bodies: Array<{ startDate: string; endDate: string }> = [];
    const fake: FetchLike = async (url, init) => {
      if (url === 'https://oauth2.googleapis.com/token') return { status: 200, ok: true, json: async () => ({ access_token: 'tok' }), text: async () => '' };
      expect(init?.headers?.Authorization).toBe('Bearer tok');
      bodies.push(JSON.parse(init!.body!));
      return { status: 200, ok: true, json: async () => ({ rows: [{ keys: ['bts quiz', 'https://kpopquiz.org/bts-quiz', 'fra', 'MOBILE'], clicks: 3, impressions: 40, ctr: 0.075, position: 6 }] }), text: async () => '' };
    };
    const out = await runWeeklyPull({ db, fetchImpl: fake, now: NOW, env: { GSC_SERVICE_ACCOUNT_JSON: KEY_JSON }, log: () => {} });
    expect(out.gsc).toEqual({ status: 'ok', rows: 2, detail: '2026-10-12: 1, 2026-10-05: 1' });
    expect(bodies.map((b) => [b.startDate, b.endDate])).toEqual([['2026-10-12', '2026-10-18'], ['2026-10-05', '2026-10-11']]);
    const up = writes.filter((w) => w.table === 'seo_gsc_weekly');
    expect(up.map((w) => w.onConflict)).toEqual(['week_start,row_key', 'week_start,row_key']);
    expect(up[0]!.rows[0]).toMatchObject({ week_start: '2026-10-12', query: 'bts quiz', country: 'fra', device: 'MOBILE', clicks: 3, row_key: rowKey('bts quiz', 'https://kpopquiz.org/bts-quiz', 'fra', 'MOBILE') });
  });

  it('an API error is an error line, and Bing still runs', async () => {
    const { db } = fakeDb();
    const fake: FetchLike = async (url) => {
      if (url.includes('oauth2')) return { status: 200, ok: true, json: async () => ({ access_token: 'tok' }), text: async () => '' };
      if (url.includes('searchconsole')) return { status: 403, ok: false, json: async () => ({ error: { status: 'PERMISSION_DENIED' } }), text: async () => '' };
      return { status: 200, ok: true, json: async () => ({ d: [] }), text: async () => '' };
    };
    const out = await runWeeklyPull({ db, fetchImpl: fake, now: NOW, env: { GSC_SERVICE_ACCOUNT_JSON: KEY_JSON, BING_WEBMASTER_API_KEY: 'k' }, log: () => {} });
    expect(out.gsc).toEqual({ status: 'error', rows: 0, detail: 'Search Console HTTP 403 PERMISSION_DENIED' });
    expect(out.bing.status).toBe('ok');
  });
});

describe('store records', () => {
  it('one record per key: a repeated row replaces, never doubles', () => {
    const r = { query: 'q', page: 'p', country: 'fra', device: 'MOBILE', clicks: 1, impressions: 2, ctr: null, position: null };
    expect(gscRecords('2026-10-05', [r, { ...r, clicks: 5 }])).toHaveLength(1);
    expect(gscRecords('2026-10-05', [r, { ...r, clicks: 5 }])[0]!.clicks).toBe(5);
    expect(rowKey('a', 'b')).toMatch(/^[0-9a-f]{40}$/);
    expect(rowKey('a', 'b')).not.toBe(rowKey('ab', ''));
  });
});
