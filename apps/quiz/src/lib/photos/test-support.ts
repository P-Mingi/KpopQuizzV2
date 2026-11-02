// Daily games step 2: an in-memory stand-in for the service-role client the Photos admin uses (the tables it reads and writes and the bucket),
// and real WebP files made with sharp (the image library the anime admin's tests already use). Tests only: nothing in the app imports it.
import sharp from 'sharp';

export type Row = Record<string, unknown>;

export interface PhotosFakeDb {
  from(table: string): unknown;
  storage: { from(bucket: string): { upload(path: string, data: unknown): Promise<{ error: { message: string } | null }>; remove(paths: string[]): Promise<{ error: null }> } };
  readonly tables: Record<string, Row[]>;
  readonly files: Map<string, number>;
  readonly removed: string[];
  readonly missing: Set<string>;
  readonly fail: { insert: boolean; upload: string | null };
}

export function photosFakeDb(seed: Record<string, Row[]> = {}, missing: readonly string[] = []): PhotosFakeDb {
  const tables: Record<string, Row[]> = { ...seed };
  const files = new Map<string, number>();
  const removed: string[] = [];
  const fail = { insert: false, upload: null as string | null };
  const gone = new Set(missing);
  let nextId = 1;
  const db: PhotosFakeDb = {
    tables, files, removed, missing: gone, fail,
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
      let payload: Row = {};
      let columns = '*';
      let mode: 'many' | 'one' | 'maybe' = 'many';
      let window: [number, number] | null = null;
      let limit: number | null = null;
      const exec = async (): Promise<{ data: unknown; error: { message: string; code?: string } | null }> => {
        const cols = columns.split(',').map((c) => c.trim());
        if (gone.has(table) || cols.some((c) => gone.has(`${table}.${c}`))) return { data: null, error: { message: `relation "public.${table}" does not exist`, code: '42P01' } };
        const rows = (tables[table] ??= []);
        let out: Row[] = [];
        if (op === 'select') out = rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'insert') {
          if (fail.insert) return { data: null, error: { message: 'insert failed' } };
          const row = { id: nextId++, created_at: new Date(Date.now() + nextId).toISOString(), ...payload };
          rows.push(row);
          out = [row];
        }
        if (op === 'update') {
          out = rows.filter((r) => filters.every((f) => f(r)));
          for (const r of out) Object.assign(r, payload);
        }
        if (op === 'delete') {
          out = rows.filter((r) => filters.every((f) => f(r)));
          tables[table] = rows.filter((r) => !out.includes(r));
        }
        if (window) out = out.slice(window[0], window[1] + 1);
        if (limit !== null) out = out.slice(0, limit);
        out = out.map((r) => ({ ...r }));
        if (mode === 'many') return { data: out, error: null };
        if (mode === 'maybe') return { data: out[0] ?? null, error: null };
        return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'no rows' } };
      };
      const q: Record<string, unknown> = {
        select: (c?: string) => { if (typeof c === 'string' && op === 'select') columns = c; return q; },
        eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q; },
        is: (c: string, v: unknown) => { filters.push((r) => (r[c] ?? null) === v); return q; },
        not: (c: string, _o: string, v: unknown) => { filters.push((r) => (r[c] ?? null) !== v); return q; },
        order: () => q,
        limit: (n: number) => { limit = n; return q; },
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
          if (fail.upload && path.includes(fail.upload)) return { error: { message: 'upload failed' } };
          files.set(`${bucket}/${path}`, (data as Uint8Array).byteLength);
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

/** A real WebP file of the given size: lossy (VP8), lossless (VP8L) or lossy with alpha (VP8X). */
export async function webpOf(w: number, h: number, flavour: 'lossy' | 'lossless' | 'alpha' = 'lossy'): Promise<Uint8Array> {
  const channels = flavour === 'alpha' ? 4 : 3;
  const background = flavour === 'alpha' ? { r: 200, g: 60, b: 20, alpha: 0.5 } : { r: 200, g: 60, b: 20 };
  const img = sharp({ create: { width: w, height: h, channels, background } });
  const buf = await img.webp(flavour === 'lossless' ? { lossless: true } : { quality: 80 }).toBuffer();
  return new Uint8Array(buf);
}

/** The three files of a picture of `kind`'s box (w by h). */
export async function photoFiles(w: number, h: number): Promise<{ x1: Uint8Array; x2: Uint8Array; thumb: Uint8Array }> {
  return { x1: await webpOf(w, h), x2: await webpOf(w * 2, h * 2), thumb: await webpOf(96, 96) };
}

export const META = { source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg', author: 'Jane Doe', license: 'cc_by_sa', license_note: null } as const;

/**
 * The answer of the Commons API (CR-021) for one file, as the admin's server code reads it. Tests only: no test reaches the network, so each one
 * that saves a picture whose source page is a Commons page (META above) stubs `fetch` with this.
 */
export function commonsResponse(over: { license?: string; short?: string; artist?: string; nonFree?: boolean; missing?: boolean; title?: string } = {}): Response {
  const title = over.title ?? 'File:A.jpg';
  const value = (v: string): { value: string } => ({ value: v });
  if (over.missing) return new Response(JSON.stringify({ query: { pages: { '-1': { title, missing: '' } } } }), { status: 200 });
  const extmetadata: Record<string, { value: string }> = {
    License: value(over.license ?? 'cc-by-sa-4.0'), LicenseShortName: value(over.short ?? 'CC BY-SA 4.0'),
    LicenseUrl: value('https://creativecommons.org/licenses/by-sa/4.0'), Artist: value(over.artist ?? '<a href="//commons.wikimedia.org/wiki/User:J">Jane Doe</a>'),
  };
  if (over.nonFree) extmetadata.NonFree = value('true');
  const name = title.replace(/^File:/, '').replace(/ /g, '_');
  const info = {
    url: `https://upload.wikimedia.org/wikipedia/commons/a/ab/${name}`, descriptionurl: `https://commons.wikimedia.org/wiki/${title.replace(/ /g, '_')}`, extmetadata,
  };
  return new Response(JSON.stringify({ query: { pages: { '42': { pageid: 42, title, imageinfo: [info] } } } }), { status: 200 });
}
