import { describe, expect, it } from 'vitest';

import { IMAGES_API, importImage, listImages, removeImage, saveFocal, uploadImage } from './entity-images-api';

import type { FetchLike, XhrLike } from './entity-images-api';
import type { AdminImage, AdminSeries, ImageMeta } from './entity-images-rules';

// Run O1 (ADM join): the transport of the typed client (the words of a failure, a dead network, a body that is not JSON, the progress of an
// upload) against a fake fetch and a fake XMLHttpRequest. The answers are typed with the types of part 1 (AdminImage, AdminSeries are the
// answers of the routes themselves); entity-images-api.routes.test.ts calls the real route handlers through the same module.

const IMAGE: AdminImage = {
  kind: 'series', slug: 'death-note', url: 'https://proj.supabase.co/storage/v1/object/public/entity-images/anime/series/death-note/0123456789abcdef.webp',
  url2x: 'https://proj.supabase.co/storage/v1/object/public/entity-images/anime/series/death-note/0123456789abcdef-2x.webp', width: 736, height: 981, focalX: 50, focalY: 50,
  license: 'cc0', author: 'Ana', sourceUrl: 'https://example.org/x', licenseNote: null, updatedAt: '2026-10-26T10:00:00.000Z',
};
const SERIES: AdminSeries = { slug: 'death-note', name: 'Death Note', published: true, image: null, bundled: null, source: 'none', characterCount: 0, characterImageCount: 0, characters: [] };
const META: ImageMeta = { source_url: ' https://example.org/x ', author: ' Ana ', license: 'cc0', license_note: '' };

interface Call { url: string; method?: string | undefined; body?: unknown }
function fakeFetch(status: number, body: unknown, calls: Call[] = []): FetchLike {
  return async (url, init) => {
    calls.push({ url, method: init?.method, body: init?.body ? JSON.parse(init.body) : undefined });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
}

describe('listImages', () => {
  it('reads the list of the anime site', async () => {
    const calls: Call[] = [];
    const r = await listImages(fakeFetch(200, { ok: true, site: 'anime', series: [SERIES] }, calls));
    expect(r).toMatchObject({ ok: true, value: [{ slug: 'death-note' }] });
    expect(calls[0]).toMatchObject({ url: '/api/admin/images/list?site=anime' });
    expect(calls[0]!.method).toBeUndefined();
  });
  it('turns a refusal, a bad shape and a dead network into plain words, never a throw', async () => {
    expect(await listImages(fakeFetch(404, { error: 'Not found.', code: 'not_found' }))).toEqual({ ok: false, message: expect.stringMatching(/not found/i) });
    expect(await listImages(fakeFetch(200, { series: [SERIES] }))).toMatchObject({ ok: false });
    expect(await listImages(fakeFetch(200, { ok: true }))).toMatchObject({ ok: false, message: expect.stringMatching(/shape/) });
    const down: FetchLike = async () => { throw new TypeError('network'); };
    expect(await listImages(down)).toEqual({ ok: false, message: expect.stringMatching(/could not be reached/) });
    const html: FetchLike = async () => ({ ok: false, status: 502, json: async () => { throw new Error('not json'); } });
    expect(await listImages(html)).toEqual({ ok: false, message: expect.stringMatching(/server had a problem/) });
  });
});

describe('import, focal point, remove', () => {
  it('imports an address with the trimmed meta', async () => {
    const calls: Call[] = [];
    const r = await importImage(fakeFetch(200, { ok: true, image: IMAGE }, calls), { kind: 'series', slug: 'death-note', url: ' https://a.org/x.png ', meta: META });
    expect(r).toEqual({ ok: true, value: IMAGE });
    expect(calls[0]).toEqual({ url: IMAGES_API.import, method: 'POST', body: { kind: 'series', slug: 'death-note', url: 'https://a.org/x.png', meta: { source_url: 'https://example.org/x', author: 'Ana', license: 'cc0', license_note: '' } } });
  });
  it('shows the error of an import in words', async () => {
    const r = await importImage(fakeFetch(400, { error: 'That address is not public.', code: 'blocked_address' }), { kind: 'series', slug: 'x', url: 'https://10.0.0.1/a.png', meta: META });
    expect(r).toEqual({ ok: false, message: expect.stringMatching(/cannot be imported/) });
  });
  it('patches the focal point', async () => {
    const calls: Call[] = [];
    const r = await saveFocal(fakeFetch(200, { ok: true, image: { ...IMAGE, focalX: 30, focalY: 70 } }, calls), { kind: 'character', slug: 'death-note/light', x: 30, y: 70 });
    expect(r).toMatchObject({ ok: true, value: { focalX: 30, focalY: 70 } });
    expect(calls[0]).toEqual({ url: IMAGES_API.focal, method: 'PATCH', body: { kind: 'character', slug: 'death-note/light', x: 30, y: 70 } });
  });
  it('deletes an image', async () => {
    const calls: Call[] = [];
    expect(await removeImage(fakeFetch(200, { ok: true, image: IMAGE }, calls), { kind: 'series', slug: 'death-note' })).toEqual({ ok: true, value: IMAGE });
    expect(calls[0]).toEqual({ url: IMAGES_API.remove, method: 'DELETE', body: { kind: 'series', slug: 'death-note' } });
    expect(await removeImage(fakeFetch(403, { error: 'This request does not come from the admin page.', code: 'forbidden' }), { kind: 'series', slug: 'x' })).toMatchObject({ ok: false });
  });
  it('refuses an answer that is a success by status but not by { ok: true }', async () => {
    expect(await saveFocal(fakeFetch(200, { image: IMAGE }), { kind: 'series', slug: 'x', x: 1, y: 1 })).toMatchObject({ ok: false });
    expect(await saveFocal(fakeFetch(200, { ok: true, image: { slug: 'x' } }), { kind: 'series', slug: 'x', x: 1, y: 1 })).toMatchObject({ ok: false, message: expect.stringMatching(/Reload/) });
  });
  it('asks for a reload when the server forgets to send the image back', async () => {
    expect(await saveFocal(fakeFetch(200, { ok: true }), { kind: 'series', slug: 'x', x: 1, y: 1 })).toMatchObject({ ok: false, message: expect.stringMatching(/Reload/) });
  });
});

describe('uploadImage', () => {
  class FakeXhr implements XhrLike {
    status = 0;
    responseText = '';
    upload: XhrLike['upload'] = { onprogress: null };
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    opened: [string, string] | null = null;
    sent: unknown = null;
    open(m: string, u: string): void { this.opened = [m, u]; }
    send(b: unknown): void { this.sent = b; }
    abort(): void { this.onabort?.(); }
  }
  const form = (): { fields: Array<[string, unknown]>; append(k: string, v: unknown): void } => {
    const fields: Array<[string, unknown]> = [];
    return { fields, append: (k, v) => { fields.push([k, v]); } };
  };
  const file = { name: 'a.png', size: 3, type: 'image/png' } as unknown as Blob & { name: string };

  it('posts kind, slug, file and meta as multipart and reports whole percent', async () => {
    const xhr = new FakeXhr();
    const f = form();
    const seen: number[] = [];
    const h = uploadImage({ kind: 'series', slug: 'death-note', file, meta: META }, (p) => seen.push(p), { makeXhr: () => xhr, makeForm: () => f });
    expect(xhr.opened).toEqual(['POST', '/api/admin/images/upload']);
    expect(f.fields.map(([k]) => k)).toEqual(['kind', 'slug', 'file', 'meta']);
    expect(JSON.parse(f.fields[3]![1] as string)).toEqual({ source_url: 'https://example.org/x', author: 'Ana', license: 'cc0', license_note: '' });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 });
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 4, total: 4 });
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 0, total: 0 });
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ ok: true, image: IMAGE });
    xhr.onload?.();
    expect(await h.result).toEqual({ ok: true, value: IMAGE });
    expect(seen).toEqual([25, 100, 100]);
  });
  it('turns an error answer, a broken connection and a cancel into words', async () => {
    const bad = new FakeXhr();
    const h1 = uploadImage({ kind: 'series', slug: 'x', file, meta: META }, () => {}, { makeXhr: () => bad, makeForm: form });
    bad.status = 413; bad.responseText = JSON.stringify({ error: 'The upload is larger than 8 MB.', code: 'too_large' }); bad.onload?.();
    expect(await h1.result).toEqual({ ok: false, message: expect.stringMatching(/8 MB/) });

    const cut = new FakeXhr();
    const h2 = uploadImage({ kind: 'series', slug: 'x', file, meta: META }, () => {}, { makeXhr: () => cut, makeForm: form });
    cut.onerror?.();
    expect(await h2.result).toEqual({ ok: false, message: expect.stringMatching(/interrupted/) });

    const stop = new FakeXhr();
    const h3 = uploadImage({ kind: 'series', slug: 'x', file, meta: META }, () => {}, { makeXhr: () => stop, makeForm: form });
    h3.cancel();
    expect(await h3.result).toEqual({ ok: false, message: expect.stringMatching(/cancelled/) });

    const html = new FakeXhr();
    const h4 = uploadImage({ kind: 'series', slug: 'x', file, meta: META }, () => {}, { makeXhr: () => html, makeForm: form });
    html.status = 500; html.responseText = '<html>'; html.onload?.();
    expect(await h4.result).toEqual({ ok: false, message: expect.stringMatching(/server had a problem/) });
  });
});
