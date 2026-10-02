// Shared read-only helpers for the G2 catalogue scripts. ANON key only: nothing here can write
// past row level security, and no script in this folder calls insert, update, upsert or delete.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

export function readEnv(): Record<string, string> {
  const file = readFileSync(new URL('../../../.env.local', import.meta.url), 'utf8');
  return Object.fromEntries(file.split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
  }));
}

export function anonDb(): SupabaseClient {
  const env = readEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing from .env.local');
  return createClient(url, key, { auth: { persistSession: false } });
}

type Ranged = { range: (a: number, b: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }> };
/** Paginate past PostgREST's 1000-row cap. `make` must build a fresh, ordered query each call. */
export async function pageAll<T>(make: () => Ranged): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make().range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out;
}

/** SQL literal: quoted string (single quotes doubled), number, boolean or NULL. */
export function lit(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${v.replace(/'/g, "''")}'`;
}
