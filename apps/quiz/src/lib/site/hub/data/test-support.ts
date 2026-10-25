// Run O1, lot H2b: a small in-memory stand-in for the Supabase client, for the unit tests of the blocks. It answers the calls the blocks make
// (select with an optional exact count and head, eq, neq, in, gt, gte, lt, lte, is, not(is), order, limit, range, maybeSingle, single, rpc)
// over rows held in memory, applies PostgREST's page cap to a read without range or limit, and records every call. A column such as
// "quizzes.site_id" reads the embedded object of that name. Nothing here is imported by production code.

export type Row = Record<string, unknown>;

export interface FakeCall {
  readonly table: string;
  readonly ops: Array<[string, ...unknown[]]>;
}

export interface FakeOptions {
  /** Tables whose reads answer with this error message. */
  readonly failing?: Readonly<Record<string, string>>;
  /** Rows a read without limit or range returns at most (PostgREST: 1000). */
  readonly pageCap?: number;
  /** rpc handlers by function name. */
  readonly rpc?: Readonly<Record<string, (args: Record<string, unknown>) => { error: { message: string } | null }>>;
}

function valueAt(row: Row, path: string): unknown {
  let cur: unknown = row;
  for (const part of path.split('.')) {
    if (Array.isArray(cur)) cur = cur[0];
    if (cur === null || cur === undefined || typeof cur !== 'object') return undefined;
    cur = (cur as Row)[part];
  }
  return Array.isArray(cur) ? cur[0] : cur;
}

const cmp = (a: unknown, b: unknown): number => (a === b ? 0 : (a as never) < (b as never) ? -1 : 1);

class Query implements PromiseLike<{ data: unknown; error: { message: string } | null; count: number | null }> {
  private filters: Array<(r: Row) => boolean> = [];
  private orders: Array<{ col: string; asc: boolean }> = [];
  private from = 0;
  private to: number | null = null;
  private cap: number | null = null;
  private head = false;
  private wantCount = false;
  private single: 'maybe' | 'one' | null = null;
  readonly call: FakeCall;

  constructor(
    private readonly rows: readonly Row[],
    private readonly error: string | null,
    private readonly pageCap: number,
    table: string,
    calls: FakeCall[],
  ) {
    this.call = { table, ops: [] };
    calls.push(this.call);
  }

  private rec(op: string, ...args: unknown[]): this {
    this.call.ops.push([op, ...args]);
    return this;
  }

  select(cols?: string, opts?: { count?: string; head?: boolean }): this {
    this.rec('select', cols);
    this.wantCount = opts?.count === 'exact';
    this.head = opts?.head === true;
    return this;
  }
  eq(col: string, v: unknown): this { this.filters.push((r) => valueAt(r, col) === v); return this.rec('eq', col, v); }
  neq(col: string, v: unknown): this { this.filters.push((r) => valueAt(r, col) !== v); return this.rec('neq', col, v); }
  in(col: string, vs: readonly unknown[]): this { this.filters.push((r) => vs.includes(valueAt(r, col))); return this.rec('in', col, vs); }
  gt(col: string, v: unknown): this { this.filters.push((r) => cmp(valueAt(r, col), v) > 0); return this.rec('gt', col, v); }
  gte(col: string, v: unknown): this { this.filters.push((r) => cmp(valueAt(r, col), v) >= 0); return this.rec('gte', col, v); }
  lt(col: string, v: unknown): this { this.filters.push((r) => cmp(valueAt(r, col), v) < 0); return this.rec('lt', col, v); }
  lte(col: string, v: unknown): this { this.filters.push((r) => cmp(valueAt(r, col), v) <= 0); return this.rec('lte', col, v); }
  is(col: string, v: unknown): this { this.filters.push((r) => (valueAt(r, col) ?? null) === v); return this.rec('is', col, v); }
  not(col: string, op: string, v: unknown): this {
    if (op !== 'is') throw new Error(`fake db: not(${op}) is not supported`);
    this.filters.push((r) => (valueAt(r, col) ?? null) !== v);
    return this.rec('not', col, op, v);
  }
  order(col: string, opts?: { ascending?: boolean }): this { this.orders.push({ col, asc: opts?.ascending !== false }); return this.rec('order', col, opts); }
  limit(n: number): this { this.cap = n; return this.rec('limit', n); }
  range(from: number, to: number): this { this.from = from; this.to = to; return this.rec('range', from, to); }
  maybeSingle(): this { this.single = 'maybe'; return this.rec('maybeSingle'); }
  returns(): this { return this; }

  private run(): { data: unknown; error: { message: string } | null; count: number | null } {
    if (this.error) return { data: null, error: { message: this.error }, count: null };
    let rows = this.rows.filter((r) => this.filters.every((f) => f(r)));
    for (const o of [...this.orders].reverse()) rows = [...rows].sort((a, b) => (o.asc ? 1 : -1) * cmp(valueAt(a, o.col), valueAt(b, o.col)));
    const count = this.wantCount ? rows.length : null;
    if (this.head) return { data: null, error: null, count };
    let end = this.to !== null ? this.to + 1 : rows.length;
    if (this.cap !== null) end = Math.min(end, this.from + this.cap);
    end = Math.min(end, this.from + this.pageCap);
    rows = rows.slice(this.from, end);
    if (this.single) return { data: rows[0] ?? null, error: null, count };
    return { data: rows, error: null, count };
  }

  then<A, B>(ok?: ((v: { data: unknown; error: { message: string } | null; count: number | null }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve(this.run()).then(ok, bad);
  }
}

export interface FakeDb {
  from(table: string): Query;
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<{ error: { message: string } | null }>;
  readonly calls: FakeCall[];
  readonly rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
}

/** `tables` maps a table name to its rows; a table that is not listed answers "relation does not exist". */
export function fakeDb(tables: Readonly<Record<string, readonly Row[]>>, opts: FakeOptions = {}): FakeDb {
  const calls: FakeCall[] = [];
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    rpcCalls,
    from(table: string): Query {
      const failing = opts.failing?.[table] ?? (tables[table] ? null : `relation "public.${table}" does not exist`);
      return new Query(tables[table] ?? [], failing, opts.pageCap ?? 1000, table, calls);
    },
    rpc(fn: string, args: Record<string, unknown>) {
      rpcCalls.push({ fn, args });
      return Promise.resolve(opts.rpc?.[fn]?.(args) ?? { error: null });
    },
  };
}

/** A quiz row with every column the cards need; override what a test cares about. */
export function quizRow(over: Partial<Row> & { id: string }): Row {
  return {
    slug: `slug-${over.id}`,
    title: `Title ${over.id}`,
    quiz_type: 'multiple_choice',
    difficulty: 'medium',
    status: 'published',
    group_id: 1,
    site_id: 'kpop',
    created_at: '2026-01-01T00:00:00Z',
    play_count: 0,
    like_count: 0,
    total_completions: 0,
    report_count: 0,
    question_count: 10,
    groups: { name: 'Group', slug: 'group' },
    ...over,
  };
}

export const ORIGINS = {
  kpop: 'https://kpop.example',
  anime: 'https://anime.example',
  hub: 'https://hub.example',
} as const;
