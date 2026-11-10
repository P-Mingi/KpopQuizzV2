// Lane charrefs (L32): an in-memory stand-in for the service-role client of the references screen: the photos fake (tables, bucket
// entity-images) plus a bucket that KEEPS bytes (so a file can be downloaded, signed and removed), and real pictures made with sharp.
// Tests only: nothing in the app imports it.
import { createHash } from 'node:crypto';

import sharp from 'sharp';

import { photoFiles, photosFakeDb } from './test-support';

import type { PhotosFakeDb, Row } from './test-support';

export interface RefsFakeDb extends PhotosFakeDb {
  /** bytes of every stored file, "<bucket>/<path>". */
  readonly blobs: Map<string, Uint8Array>;
  readonly signed: Array<{ bucket: string; path: string; seconds: number }>;
  readonly publicUrlRequests: string[];
  readonly refsFail: { remove: boolean };
}

export function refsFakeDb(seed: Record<string, Row[]> = {}): RefsFakeDb {
  const base = photosFakeDb({
    groups: [
      { id: 1, slug: 'inuyasha', name: 'Inuyasha', site_id: 'anime' },
      { id: 2, slug: 'dr-stone', name: 'Dr. Stone', site_id: 'anime' },
      { id: 3, slug: 'gintama', name: 'Gintama', site_id: 'anime' },
    ],
    series: [{ group_id: 1 }, { group_id: 2 }, { group_id: 3 }],
    characters: [
      { id: 1, group_id: 1, slug: 'kohaku', name: 'Kohaku' },
      { id: 2, group_id: 2, slug: 'kohaku', name: 'Kohaku' },
      { id: 3, group_id: 1, slug: 'kagura', name: 'Kagura' },
      { id: 4, group_id: 3, slug: 'kagura', name: 'Kagura' },
    ],
    entity_images: [],
    character_reference_images: [],
    ...seed,
  });
  const blobs = new Map<string, Uint8Array>();
  const signed: RefsFakeDb['signed'] = [];
  const refsFail = { remove: false };
  const db = base as unknown as RefsFakeDb;
  Object.assign(db, { blobs, signed, publicUrlRequests: [], refsFail });
  const original = base.storage;
  (db as unknown as { storage: unknown }).storage = {
    from: (bucket: string) => ({
      async upload(path: string, data: unknown) {
        const res = await original.from(bucket).upload(path, data);
        if (!res.error) blobs.set(`${bucket}/${path}`, new Uint8Array(data as Uint8Array));
        return res;
      },
      async remove(paths: string[]) {
        if (bucket === 'character-refs' && refsFail.remove) return { error: { message: 'remove failed' } };
        for (const p of paths) blobs.delete(`${bucket}/${p}`);
        return original.from(bucket).remove(paths);
      },
      async download(path: string) {
        const b = blobs.get(`${bucket}/${path}`);
        return b ? { data: new Blob([new Uint8Array(b)]), error: null } : { data: null, error: { message: 'not found' } };
      },
      async createSignedUrl(path: string, seconds: number) {
        signed.push({ bucket, path, seconds });
        return { data: { signedUrl: `https://signed.example/${bucket}/${path}?token=t&exp=${seconds}` }, error: null };
      },
    }),
  };
  return db;
}

/** A real picture (png or jpeg) of w by h in a flat colour: different colours are different bytes. */
export async function pictureBytes(color: { r: number; g: number; b: number }, format: 'png' | 'jpeg' = 'png', w = 800, h = 1000): Promise<Uint8Array> {
  const img = sharp({ create: { width: w, height: h, channels: 3, background: color } });
  return new Uint8Array(await (format === 'png' ? img.png() : img.jpeg()).toBuffer());
}

export const hex12 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex').slice(0, 12);

/** The three WebP files of a character picture (360 by 480, twice that, the 96 px square). */
export const characterFiles = (): ReturnType<typeof photoFiles> => photoFiles(360, 480);

/** A reference row of the table, with its file in the private bucket. */
export function putReference(db: RefsFakeDb, series: string, character: string, bytes: Uint8Array, over: Record<string, unknown> = {}): string {
  const path = `anime/${series}/${character}-${hex12(bytes)}.jpg`;
  db.blobs.set(`character-refs/${path}`, bytes);
  db.tables.character_reference_images!.push({
    site_id: 'anime', series_slug: series, character_slug: character, status: 'reference', reference_path: path,
    reference_page_url: `https://${series}.fandom.com/wiki/${character}`, reference_file_page_url: `https://${series}.fandom.com/wiki/File:${character}.jpg`,
    reference_image_url: `https://static.wikia.nocookie.net/${series}/images/a/ab/${character}.jpg`, reference_author: 'FandomUser', reference_license: 'CC BY-SA',
    ...over,
  });
  return path;
}
