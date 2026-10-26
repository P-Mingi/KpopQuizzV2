// Run O1 (ADM front): the browser side of the admin images API of part 1 (app/api/admin/images/*, docs/o1/briefs/ADM-back.md).
// Every call answers { ok: true, image } or { error } and this module turns both into a value the UI can show: it never throws for a
// failure of the server, only returns { ok: false, message } in plain words. fetch and XMLHttpRequest are given, so a test passes fakes.

import { errorWords, metaPayload } from './entity-images-rules';

import type { AdminSeries, EntityImage, EntityKind, ImageMeta } from './entity-images-rules';

export const IMAGES_API = {
  list: '/api/admin/images/list?site=anime',
  upload: '/api/admin/images/upload',
  import: '/api/admin/images/import',
  focal: '/api/admin/images/focal',
  remove: '/api/admin/images',
} as const;

export type ApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

export type FetchLike = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}>;

interface Answer { readonly ok?: boolean; readonly error?: string; readonly image?: EntityImage | null; readonly series?: readonly AdminSeries[] }

async function readAnswer(res: Awaited<ReturnType<FetchLike>>): Promise<ApiResult<Answer>> {
  let body: Answer = {};
  try { body = ((await res.json()) ?? {}) as Answer; } catch { /* an answer that is not JSON is a failure below */ }
  if (!res.ok || body.error) return { ok: false, message: errorWords(body.error, res.status) };
  return { ok: true, value: body };
}

async function call(fetcher: FetchLike, url: string, init?: Parameters<FetchLike>[1]): Promise<ApiResult<Answer>> {
  try {
    return await readAnswer(await fetcher(url, init));
  } catch {
    return { ok: false, message: 'The server could not be reached. Check your connection and try again.' };
  }
}

const json = (method: string, body: unknown): Parameters<FetchLike>[1] => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

export async function listImages(fetcher: FetchLike): Promise<ApiResult<readonly AdminSeries[]>> {
  const r = await call(fetcher, IMAGES_API.list);
  if (!r.ok) return r;
  return Array.isArray(r.value.series) ? { ok: true, value: r.value.series } : { ok: false, message: 'The list came back in a shape we do not know. Reload the page.' };
}

function imageOf(r: ApiResult<Answer>): ApiResult<EntityImage> {
  if (!r.ok) return r;
  return r.value.image ? { ok: true, value: r.value.image } : { ok: false, message: 'The server did not send the saved image back. Reload the page.' };
}

export async function importImage(fetcher: FetchLike, args: { kind: EntityKind; slug: string; url: string; meta: ImageMeta }): Promise<ApiResult<EntityImage>> {
  return imageOf(await call(fetcher, IMAGES_API.import, json('POST', { kind: args.kind, slug: args.slug, url: args.url.trim(), meta: metaPayload(args.meta) })));
}

export async function saveFocal(fetcher: FetchLike, args: { kind: EntityKind; slug: string; x: number; y: number }): Promise<ApiResult<EntityImage>> {
  return imageOf(await call(fetcher, IMAGES_API.focal, json('PATCH', args)));
}

export async function removeImage(fetcher: FetchLike, args: { kind: EntityKind; slug: string }): Promise<ApiResult<null>> {
  const r = await call(fetcher, IMAGES_API.remove, json('DELETE', args));
  return r.ok ? { ok: true, value: null } : r;
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

export interface UploadHandle { readonly result: Promise<ApiResult<EntityImage>>; cancel(): void }

/** A file sent as multipart (kind, slug, file, meta) with progress in whole percent. `makeForm` and `makeXhr` default to the browser's. */
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
  const result = new Promise<ApiResult<EntityImage>>((resolve) => {
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && e.total > 0) onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100))); };
    xhr.onload = () => {
      let body: Answer = {};
      try { body = (JSON.parse(xhr.responseText) ?? {}) as Answer; } catch { /* below */ }
      if (xhr.status < 200 || xhr.status >= 300 || body.error) return resolve({ ok: false, message: errorWords(body.error, xhr.status) });
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
