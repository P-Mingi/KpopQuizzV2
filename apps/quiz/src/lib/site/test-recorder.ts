// Run O1, lot (e) part 2, lane E1a: a supabase-like client for unit tests that records every builder call
// (table, then each method with its arguments) and answers each awaited query with the data a test gives for that
// table (a function answers from the recorded calls of that query). Used by the site-scope tests of the admin routes, the editorial store and the quiz insert; nothing else imports it.
// ADMIN-1: its auth is the stand-in of lib/admin/test-support.ts (getSession, getUser and the assurance level, aal2 for the
// signed-in user), the reads lib/admin/guard.ts makes; getUser answers as before.

import { stubAuth } from '@/lib/admin/test-support';

import type { AuthStub } from '@/lib/admin/test-support';

export interface RecordedQuery {
  readonly table: string;
  readonly ops: Array<readonly [string, readonly unknown[]]>;
}

export interface RecordingDb {
  readonly queries: RecordedQuery[];
  readonly rpcs: Array<{ fn: string; args: Record<string, unknown> }>;
  from(table: string): any; // eslint-disable-line @typescript-eslint/no-explicit-any -- a proxy builder
  rpc(fn: string, args?: Record<string, unknown>): Promise<{ data: unknown; error: null }>;
  auth: AuthStub;
  /** The arguments of every `method` call on queries of `table`. */
  calls(table: string, method: string): Array<readonly unknown[]>;
  /** True when some query of `table` was narrowed to a site (`.eq('site_id', site)`). */
  scopedTo(table: string, site: string): boolean;
}

export function recordingDb(answers: Record<string, unknown> = {}, rpcAnswers: Record<string, unknown> = {}, userId: string | null = 'admin-1'): RecordingDb {
  const queries: RecordedQuery[] = [];
  const rpcs: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const db: RecordingDb = {
    queries,
    rpcs,
    from(table: string) {
      const rec: RecordedQuery = { table, ops: [] };
      queries.push(rec);
      const q: unknown = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'then') {
            const a = answers[table];
            const data = (typeof a === 'function' ? (a as (r: RecordedQuery) => unknown)(rec) : a) ?? null;
            return (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve({ data, error: null, count: Array.isArray(data) ? data.length : 0 }).then(ok, bad);
          }
          return (...args: unknown[]) => {
            rec.ops.push([prop, args]);
            return q;
          };
        },
      });
      return q;
    },
    async rpc(fn: string, args: Record<string, unknown> = {}) {
      rpcs.push({ fn, args });
      return { data: rpcAnswers[fn] ?? null, error: null };
    },
    auth: stubAuth(() => ({ user: userId ? { id: userId } : null })),
    calls(table, method) {
      return queries.filter((x) => x.table === table).flatMap((x) => x.ops.filter(([m]) => m === method).map(([, a]) => a));
    },
    scopedTo(table, site) {
      return db.calls(table, 'eq').some((a) => a[0] === 'site_id' && a[1] === site);
    },
  };
  return db;
}
