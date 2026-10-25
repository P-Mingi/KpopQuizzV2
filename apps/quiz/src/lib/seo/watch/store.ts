// Shared plumbing of the monitoring jobs: the service-role client and the "not applied yet"
// test. Server only. Every table and function of docs/pending-migrations/seo-watch.sql may be
// missing until the owner applies it, and the code must then keep working (fail soft).

import { createClient } from '@supabase/supabase-js';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Untyped schema on purpose: these tables are not in generated types until the SQL is applied. */
export type Svc = SupabaseClient;

/** The service-role client, or null when it is not configured (local without keys, CI, tests). */
export function serviceClientOrNull(env: Record<string, string | undefined> = process.env): Svc | null {
  if (env.VITEST) return null;
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === 'not-a-credential-ci-placeholder') return null;
  try {
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as Svc;
  } catch {
    return null;
  }
}

const MISSING_CODES = new Set(['42P01', '42883', 'PGRST202', 'PGRST205']);

/** True when a PostgREST error says the table or function does not exist (migration not applied). */
export function isMissingRelation(err: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!err) return false;
  if (err.code && MISSING_CODES.has(err.code)) return true;
  return /could not find the (table|function)|does not exist|schema cache/i.test(err.message ?? '');
}
