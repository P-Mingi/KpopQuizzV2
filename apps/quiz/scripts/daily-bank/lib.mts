// Shared helpers of the daily quiz bank scripts (Mission U, owner 2026-10-15). Local tools:
// they read the database with the service role key from apps/quiz/.env.local, READ ONLY,
// and never write to it. The owner applies the generated SQL himself. Kpop only (lot 2, owner
// 2026-10-25): every read goes through src/lib/daily-bank/kpop-scope.ts (site_id = 'kpop', then
// checked row by row), so a row of another site stops the run.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type { LotQuiz } from '../../src/lib/daily-bank/lot-sql';
import type { ScopeDb } from '../../src/lib/daily-bank/kpop-scope';

export type { LotQuiz, McQuestion, TfQuestion } from '../../src/lib/daily-bank/lot-sql';

const APP = resolve(new URL('.', import.meta.url).pathname, '../..');

export function env(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of readFileSync(resolve(APP, '.env.local'), 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trim().startsWith('#')) out[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
  return out;
}

/**
 * A read-only service role client (local scripts only; the key never leaves .env.local). Typed as
 * the narrow ScopeDb: reads go through kpopRows, never a bare from().
 */
export function readClient(): ScopeDb {
  const e = env();
  const url = e.NEXT_PUBLIC_SUPABASE_URL;
  const key = e.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed in apps/quiz/.env.local');
  return createClient(url, key, { auth: { persistSession: false } }) as unknown as ScopeDb;
}

export function loadLots(paths: string[]): LotQuiz[] {
  return paths.flatMap((p) => JSON.parse(readFileSync(resolve(p), 'utf8')) as LotQuiz[]);
}

/** Normalized text for duplicate checks: lowercase, letters and digits only, single spaces. */
export function norm(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
