// Run O1 (ADM back): an in-memory stand-in for the service-role Supabase client (the four tables read here, the table
// entity_images and the bucket), and picture makers, for the unit tests of this folder and of the admin image routes. Tests only.
import sharp from 'sharp';

export type Row = Record<string, unknown>;

export interface FakeDb {
  from(table: string): unknown;
  storage: { from(bucket: string): { upload(path: string, data: unknown, opts?: unknown): Promise<{ error: { message: string } | null }>; remove(paths: string[]): Promise<{ error: null }> } };
  readonly tables: Record<string, Row[]>;
  readonly files: Map<string, Buffer>;
  readonly removed: string[];
  readonly fail: { insert: boolean; upload: boolean };
}

export function fakeDb(seed: Partial<Record<'groups' | 'series' | 'characters' | 'entity_images', Row[]>> = {}): FakeDb {
  const tables: Record<string, Row[]> = { groups: [], series: [], characters: [], entity_images: [], ...seed };
  const files = new Map<string, Buffer>();
  const removed: string[] = [];
  const fail = { insert: false, upload: false };
  let nextId = 100;
  const db: FakeDb = {
    tables, files, removed, fail,
    from(table: string) {
      const filters: Array<[string, unknown]> = [];
      let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
      let payload: Row = {};
      let mode: 'many' | 'one' | 'maybe' = 'many';
      let window: [number, number] | null = null;
      const match = (r: Row): boolean => filters.every(([c, v]) => r[c] === v);
      const exec = async (): Promise<{ data: unknown; error: { message: string } | null }> => {
        const rows = (tables[table] ??= []);
        let out: Row[] = [];
        if (op === 'select') out = rows.filter(match);
        if (op === 'insert') {
          if (fail.insert) return { data: null, error: { message: 'insert failed' } };
          if (rows.some((r) => r.site_id === payload.site_id && r.kind === payload.kind && r.slug === payload.slug)) return { data: null, error: { message: 'duplicate key' } };
          const row = { id: nextId++, focal_x: 50, focal_y: 50, license_note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...payload };
          rows.push(row);
          out = [row];
        }
        if (op === 'update') {
          out = rows.filter(match);
          for (const r of out) Object.assign(r, payload, { updated_at: new Date().toISOString() });
        }
        if (op === 'delete') {
          out = rows.filter(match);
          tables[table] = rows.filter((r) => !match(r));
        }
        if (window) out = out.slice(window[0], window[1] + 1);
        out = out.map((r) => ({ ...r })); // the database hands out copies, never the stored row
        if (mode === 'many') return { data: out, error: null };
        if (mode === 'maybe') return { data: out[0] ?? null, error: null };
        return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'no rows' } };
      };
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push([c, v]); return q; },
        order: () => q,
        range: (a: number, b: number) => { window = [a, b]; return q; },
        insert: (r: Row) => { op = 'insert'; payload = r; return q; },
        update: (r: Row) => { op = 'update'; payload = r; return q; },
        delete: () => { op = 'delete'; return q; },
        maybeSingle: () => { mode = 'maybe'; return exec(); },
        single: () => { mode = 'one'; return exec(); },
        then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => exec().then(ok, bad),
      };
      return q;
    },
    storage: {
      from: (bucket: string) => ({
        async upload(path: string, data: unknown) {
          if (fail.upload) return { error: { message: 'upload failed' } };
          files.set(`${bucket}/${path}`, Buffer.from(data as Buffer));
          return { error: null };
        },
        async remove(paths: string[]) {
          for (const p of paths) { files.delete(`${bucket}/${p}`); removed.push(p); }
          return { error: null };
        },
      }),
    },
  };
  return db;
}

/** One series (group 1, 'death-note') with two characters, and a second series with none, all on the anime site. */
export function animeSeed(): { groups: Row[]; series: Row[]; characters: Row[] } {
  return {
    groups: [{ id: 1, slug: 'death-note', name: 'Death Note', site_id: 'anime' }, { id: 2, slug: 'one-piece', name: 'One Piece', site_id: 'anime' }, { id: 3, slug: 'bts', name: 'BTS', site_id: 'kpop' }],
    series: [{ group_id: 1, published: true }, { group_id: 2, published: true }],
    characters: [
      { id: 1, group_id: 1, slug: 'light-yagami', name: 'Light Yagami', role: 'main', status: 'published', ord: 1 },
      { id: 2, group_id: 1, slug: 'l', name: 'L', role: 'main', status: 'published', ord: 2 },
    ],
  };
}

/** A picture of the given size: a gradient so that a crop is visible, as JPEG (with an EXIF Copyright), PNG or WebP. */
export async function makeImage(w: number, h: number, format: 'jpeg' | 'png' | 'webp' = 'jpeg', orientation?: number): Promise<Buffer> {
  const base = sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 60, b: 20 } } });
  if (format === 'jpeg') return base.jpeg().withExif({ IFD0: { Copyright: 'secret-owner', Artist: 'secret-artist' } }).withMetadata(orientation ? { orientation } : {}).toBuffer();
  if (format === 'png') return base.png().toBuffer();
  return base.webp().toBuffer();
}

export const GOOD_META = { source_url: 'https://unsplash.com/photos/abc', author: 'Jane Doe', license: 'cc_by', license_note: null } as const;
