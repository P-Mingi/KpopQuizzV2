// Tests only (nothing in the app imports it): an in-memory stand-in for the part of the service-role client that lib/entity-images/non-free.ts
// uses: public.entity_images (select, in, eq, order, range, delete) and the bucket (list, remove, download).
export type Row = Record<string, unknown>;

export interface FakeObject { readonly name: string; readonly createdAt: string; readonly bytes?: Uint8Array }

export interface NonFreeFake {
  from(table: string): unknown;
  storage: { from(bucket: string): unknown };
  readonly rows: Row[];
  readonly objects: FakeObject[];
  readonly removed: string[];
  readonly calls: string[];
}

export function nonFreeFake(rows: Row[], objects: FakeObject[] = [], others: Record<string, Row[]> = {}): NonFreeFake {
  const state = { rows: [...rows], objects: [...objects] };
  const tables: Record<string, Row[]> = { ...others };
  const removed: string[] = [];
  const calls: string[] = [];
  const db: NonFreeFake = {
    get rows() { return state.rows; },
    get objects() { return state.objects; },
    removed,
    calls,
    from(table: string) {
      calls.push(`from ${table}`);
      const eq: Array<[string, unknown]> = [];
      const inn: Array<[string, readonly unknown[]]> = [];
      let op: 'select' | 'delete' = 'select';
      let window: [number, number] | null = null;
      let one = false;
      const match = (r: Row): boolean => eq.every(([c, v]) => r[c] === v) && inn.every(([c, vs]) => vs.includes(r[c]));
      const exec = async (): Promise<{ data: unknown; error: null }> => {
        const source = table === 'entity_images' ? state.rows : (tables[table] ?? []);
        let out = source.filter(match).sort((a, b) => Number(a.id) - Number(b.id));
        if (op === 'delete') {
          calls.push(`delete ${table} ${out.length}`);
          state.rows = state.rows.filter((r) => !match(r));
          return { data: out.map((r) => ({ id: r.id })), error: null };
        }
        if (window) out = out.slice(window[0], window[1] + 1);
        const data = out.map((r) => ({ ...r }));
        return one ? { data: data[0] ?? null, error: null } : { data, error: null };
      };
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { eq.push([c, v]); return q; },
        in: (c: string, vs: readonly unknown[]) => { inn.push([c, vs]); return q; },
        order: () => q,
        range: (a: number, b: number) => { window = [a, b]; return q; },
        delete: () => { op = 'delete'; return q; },
        maybeSingle: () => { one = true; return exec(); },
        then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => exec().then(ok, bad),
      };
      return q;
    },
    storage: {
      from: () => ({
        // One level, like the Storage API: files carry an id and a creation time, folders have neither.
        async list(prefix: string, opts: { limit?: number; offset?: number } = {}) {
          calls.push(`list ${prefix}`);
          const head = `${prefix}/`;
          const seen = new Map<string, { name: string; id: string | null; created_at: string | null }>();
          for (const o of state.objects) {
            if (!o.name.startsWith(head)) continue;
            const rest = o.name.slice(head.length);
            const slash = rest.indexOf('/');
            if (slash < 0) seen.set(rest, { name: rest, id: `id-${o.name}`, created_at: o.createdAt });
            else if (!seen.has(rest.slice(0, slash))) seen.set(rest.slice(0, slash), { name: rest.slice(0, slash), id: null, created_at: null });
          }
          const all = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
          const off = opts.offset ?? 0;
          return { data: all.slice(off, off + (opts.limit ?? 100)), error: null };
        },
        async remove(paths: string[]) {
          calls.push(`remove ${paths.length}`);
          const gone = state.objects.filter((o) => paths.includes(o.name));
          state.objects = state.objects.filter((o) => !paths.includes(o.name));
          removed.push(...gone.map((o) => o.name));
          return { data: gone.map((o) => ({ name: o.name })), error: null };
        },
        async download(path: string) {
          const o = state.objects.find((x) => x.name === path);
          if (!o) return { data: null, error: { message: 'not found' } };
          return { data: new Blob([new Uint8Array(o.bytes ?? new Uint8Array(0))]), error: null };
        },
      }),
    },
  };
  return db;
}
