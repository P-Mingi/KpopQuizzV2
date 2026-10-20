// Run O1, lot (b), lane P1: a small in-memory stand-in for the Supabase query builder, for the tests of this folder. It
// supports `select`, `eq`, `in`, `order`, `limit`, `maybeSingle` and awaiting the builder, over arrays of rows per table,
// and records every select string so a test can prove which columns were asked for.

import type { SupabaseClient } from '@supabase/supabase-js';

export type Rows = Record<string, Array<Record<string, unknown>>>;

export interface FakeDb {
  readonly client: SupabaseClient;
  readonly selects: Array<{ table: string; columns: string }>;
}

export function fakeDb(rows: Rows, failing: ReadonlySet<string> = new Set()): FakeDb {
  const selects: FakeDb['selects'] = [];
  const from = (table: string) => {
    const filters: Array<(r: Record<string, unknown>) => boolean> = [];
    const b = {
      select(columns: string) { selects.push({ table, columns }); return b; },
      eq(col: string, v: unknown) { filters.push((r) => r[col] === v); return b; },
      in(col: string, vs: unknown[]) { filters.push((r) => vs.includes(r[col])); return b; },
      order() { return b; },
      limit() { return b; },
      range() { return b; },
      maybeSingle() {
        if (failing.has(table)) return Promise.resolve({ data: null, error: { message: 'boom' } });
        const found = (rows[table] ?? []).filter((r) => filters.every((f) => f(r)))[0];
        return Promise.resolve({ data: found ?? null, error: null });
      },
      then(resolve: (v: { data: unknown[]; error: null | { message: string } }) => unknown) {
        if (failing.has(table)) return resolve({ data: [], error: { message: 'boom' } });
        return resolve({ data: (rows[table] ?? []).filter((r) => filters.every((f) => f(r))), error: null });
      },
    };
    return b;
  };
  return { client: { from } as unknown as SupabaseClient, selects };
}
