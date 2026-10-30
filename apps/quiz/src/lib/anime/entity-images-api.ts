// Run O1 (ADM join): the browser side of the admin images API of part 1 (app/api/admin/images/*, docs/o1/requests/ADM.md item 3). The one
// typed client of the admin UI: the paths, the methods, the JSON content type and the answers { ok: true, ... } or { error, code } are
// those of the routes, and the types are theirs (type-only imports of lib/entity-images: nothing of the server reaches the browser).
// lib/anime/entity-images-api.routes.test.ts calls the real route handlers through this module. It never throws for a failure of the
// server: it returns { ok: false, message } in plain words. fetch and XMLHttpRequest are given, so a test passes the routes themselves.

import { errorWords, metaPayload } from './entity-images-rules';

import type { ImageList } from '@/lib/entity-images/list';
import type { AdminAnswer, EntityImageDto } from '@/lib/entity-images/types';
import type { AdminImage, AdminSeries, EntityKind, ImageMeta } from './entity-images-rules';

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

/** The routes of part 1. DELETE is served at /api/admin/images (and at /api/admin/images/delete, the same handler). */
export const IMAGES_API = {
  list: `${BASE_PATH}/api/admin/images/list?site=anime`,
  upload: `${BASE_PATH}/api/admin/images/upload`,
  import: `${BASE_PATH}/api/admin/images/import`,
  focal: `${BASE_PATH}/api/admin/images/focal`,
  remove: `${BASE_PATH}/api/admin/images`,
} as const;

export type ApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}>;

/** What the routes answer on success: { ok: true } plus the list, or the image. */
type Answer = AdminAnswer<Partial<Pick<ImageList, 'series'>> & { readonly image?: EntityImageDto | null }>;

/** The words of a body that is not a success: { error, code } or anything else the server sent. */
function failureOf(body: unknown, status: number): string {
  const b = (body ?? {}) as { error?: unknown; code?: unknown };
  return errorWords(typeof b.code === 'string' ? b.code : undefined, status, typeof b.error === 'string' ? b.error : undefined);
}

const succeeded = (body: unknown, status: number): body is Extract<Answer, { ok: true }> =>
  status >= 200 && status < 300 && typeof body === 'object' && body !== null && (body as { ok?: unknown }).ok === true;

async function readAnswer(res: Awaited<ReturnType<FetchLike>>): Promise<ApiResult<Extract<Answer, { ok: true }>>> {
  let body: unknown = null;
  try { body = await res.json(); } catch { /* an answer that is not JSON is a failure below */ }
  return succeeded(body, res.status) ? { ok: true, value: body } : { ok: false, message: failureOf(body, res.status) };
}

async function call(fetcher: FetchLike, url: string, init?: Parameters<FetchLike>[1]): Promise<ApiResult<Extract<Answer, { ok: true }>>> {
  try {
    return await readAnswer(await fetcher(url, init));
  } catch {
    return { ok: false, message: 'The server could not be reached. Check your connection and try again.' };
  }
}

const json = (method: string, body: unknown): NonNullable<Parameters<FetchLike>[1]> => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const isImage = (v: unknown): v is AdminImage => typeof v === 'object' && v !== null && typeof (v as AdminImage).url === 'string' && typeof (v as AdminImage).slug === 'string';

export async function listImages(fetcher: FetchLike): Promise<ApiResult<readonly AdminSeries[]>> {
  const r = await call(fetcher, IMAGES_API.list);
  if (!r.ok) return r;
  return Array.isArray(r.value.series) ? { ok: true, value: r.value.series } : { ok: false, message: 'The list came back in a shape we do not know. Reload the page.' };
}

function imageOf(r: ApiResult<Extract<Answer, { ok: true }>>): ApiResult<AdminImage> {
  if (!r.ok) return r;
  return isImage(r.value.image) ? { ok: true, value: r.value.image } : { ok: false, message: 'The server did not send the saved image back. Reload the page.' };
}

export async function importImage(fetcher: FetchLike, args: { kind: EntityKind; slug: string; url: string; meta: ImageMeta }): Promise<ApiResult<AdminImage>> {
  return imageOf(await call(fetcher, IMAGES_API.import, json('POST', { kind: args.kind, slug: args.slug, url: args.url.trim(), meta: metaPayload(args.meta) })));
}

export async function saveFocal(fetcher: FetchLike, args: { kind: EntityKind; slug: string; x: number; y: number }): Promise<ApiResult<AdminImage>> {
  return imageOf(await call(fetcher, IMAGES_API.focal, json('PATCH', { kind: args.kind, slug: args.slug, x: args.x, y: args.y })));
}

/** Removes the image of the owner; the value is the row that was removed. */
export async function removeImage(fetcher: FetchLike, args: { kind: EntityKind; slug: string }): Promise<ApiResult<AdminImage | null>> {
  const r = await call(fetcher, IMAGES_API.remove, json('DELETE', { kind: args.kind, slug: args.slug }));
  return r.ok ? { ok: true, value: isImage(r.value.image) ? r.value.image : null } : r;
}

/** The part of XMLHttpRequest the upload uses. */
export interface XhrLike {
  open(method: string, url: string): void;
  send(body: unknown): void;
  abort(): void;
  status: number;
  responseText: string;
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
}

export interface UploadHandle { readonly result: Promise<ApiResult<AdminImage>>; cancel(): void }

/** A file sent as multipart (kind, slug, file, meta as a JSON string) with progress in whole percent. `makeForm` and `makeXhr` default to the browser's. */
export function uploadImage(
  args: { kind: EntityKind; slug: string; file: Blob & { name?: string }; meta: ImageMeta },
  onProgress: (percent: number) => void,
  deps: { makeXhr?: () => XhrLike; makeForm?: () => { append(k: string, v: string | Blob, name?: string): void } } = {},
): UploadHandle {
  const xhr = (deps.makeXhr ?? ((): XhrLike => new XMLHttpRequest() as unknown as XhrLike))();
  const form = (deps.makeForm ?? ((): { append(k: string, v: string | Blob, name?: string): void } => new FormData()))();
  form.append('kind', args.kind);
  form.append('slug', args.slug);
  form.append('file', args.file, args.file.name ?? 'image');
  form.append('meta', JSON.stringify(metaPayload(args.meta)));
  const result = new Promise<ApiResult<AdminImage>>((resolve) => {
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => {
      let body: unknown = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* below */ }
      if (!succeeded(body, xhr.status)) return resolve({ ok: false, message: failureOf(body, xhr.status) });
      onProgress(100);
      resolve(imageOf({ ok: true, value: body }));
    };
    xhr.onerror = () => resolve({ ok: false, message: 'The upload was interrupted. Check your connection and try again.' });
    xhr.onabort = () => resolve({ ok: false, message: 'The upload was cancelled.' });
    xhr.open('POST', IMAGES_API.upload);
    xhr.send(form);
  });
  return { result, cancel: () => xhr.abort() };
}
