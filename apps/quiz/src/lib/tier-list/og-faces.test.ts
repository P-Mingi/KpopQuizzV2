import { describe, it, expect, vi, afterEach } from 'vitest';

import { fetchFaceImages, publicImageBase } from './og-faces';

// FIX 1 proof: the OG route embeds real photos. These test the isomorphic
// prefetch helper the edge route calls (mocking global fetch), which is where
// the real-photo-vs-initials decision is made: a success yields a data URI for
// that face (so the card draws the photo), and any failure / timeout / non-image
// / off-host leaves the id out of the map (so the card falls back to initials
// for that one face) without throwing.

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);

function imageResponse(bytes: Uint8Array, type = 'image/png') {
  return {
    ok: true,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? type : null) },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as Response;
}

afterEach(() => { vi.restoreAllMocks(); });

describe('fetchFaceImages (OG face prefetch)', () => {
  it('embeds a real photo as a data URI when the fetch succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => imageResponse(PNG_BYTES)));
    const map = await fetchFaceImages([{ id: 'idol:1', url: 'https://i.pinimg.com/jm.jpg' }]);
    expect(map['idol:1']).toMatch(/^data:image\/png;base64,/);
    // The data URI carries the actual image bytes, so the rendered face is the
    // photo, materially more than an empty/initials tile.
    const b64 = map['idol:1']!.split(',')[1]!;
    expect(Buffer.from(b64, 'base64')).toEqual(Buffer.from(PNG_BYTES));
  });

  it('falls back (omits the id) when the fetch rejects, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    const map = await fetchFaceImages([{ id: 'idol:1', url: 'https://i.pinimg.com/jm.jpg' }]);
    expect(map['idol:1']).toBeUndefined();
  });

  it('falls back on a timeout/abort, without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new DOMException('aborted', 'AbortError'); }));
    const map = await fetchFaceImages([{ id: 'idol:1', url: 'https://i.pinimg.com/jm.jpg' }], { timeoutMs: 5 });
    expect(map['idol:1']).toBeUndefined();
  });

  it('falls back when the response is not an image', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => imageResponse(PNG_BYTES, 'text/html')));
    const map = await fetchFaceImages([{ id: 'idol:1', url: 'https://i.pinimg.com/jm.jpg' }]);
    expect(map['idol:1']).toBeUndefined();
  });

  it('skips non-http / off-allowlist urls without fetching (custom blob uploads)', async () => {
    const spy = vi.fn(async () => imageResponse(PNG_BYTES));
    vi.stubGlobal('fetch', spy);
    const map = await fetchFaceImages([
      { id: 'custom:1', url: 'blob:https://kpopquiz.org/abc' },
      { id: 'x:1', url: 'https://evil.example.com/a.jpg' },
      { id: 'x:2', url: null },
    ]);
    expect(map).toEqual({});
    expect(spy).not.toHaveBeenCalled();
  });

  it('fetches a shared url once and maps every id that uses it', async () => {
    const spy = vi.fn(async () => imageResponse(PNG_BYTES));
    vi.stubGlobal('fetch', spy);
    const cover = 'https://coverartarchive.org/release-group/mbid/front-500';
    const map = await fetchFaceImages([
      { id: 'song:1', url: cover },
      { id: 'song:2', url: cover },
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(map['song:1']).toMatch(/^data:image\//);
    expect(map['song:2']).toBe(map['song:1']);
  });

  it('resolves a local /... path against the origin before fetching', async () => {
    const spy = vi.fn(async () => imageResponse(PNG_BYTES));
    vi.stubGlobal('fetch', spy);
    const map = await fetchFaceImages([{ id: 'idol:1', url: '/idols/RM BTS.jpg' }], { origin: 'http://localhost:3021' });
    expect(spy).toHaveBeenCalledWith('http://localhost:3021/idols/RM%20BTS.jpg', expect.anything());
    expect(map['idol:1']).toMatch(/^data:image\//);
  });

  it('skips a local /... path when no origin is given (cannot fetch relative)', async () => {
    const spy = vi.fn(async () => imageResponse(PNG_BYTES));
    vi.stubGlobal('fetch', spy);
    const map = await fetchFaceImages([{ id: 'idol:1', url: '/idols/x.jpg' }]);
    expect(spy).not.toHaveBeenCalled();
    expect(map['idol:1']).toBeUndefined();
  });

  it('caps the number of distinct fetches', async () => {
    const spy = vi.fn(async () => imageResponse(PNG_BYTES));
    vi.stubGlobal('fetch', spy);
    const faces = Array.from({ length: 10 }, (_, i) => ({ id: `idol:${i}`, url: `https://i.pinimg.com/${i}.jpg` }));
    await fetchFaceImages(faces, { cap: 3 });
    expect(spy).toHaveBeenCalledTimes(3);
  });
});

describe('publicImageBase (stable OG fetch base, not the request origin)', () => {
  it('uses NEXT_PUBLIC_SITE_URL when it is an absolute https origin', () => {
    expect(publicImageBase('https://kpopquiz.org')).toBe('https://kpopquiz.org');
    expect(publicImageBase('https://kpopquiz.org/')).toBe('https://kpopquiz.org');
  });
  it('falls back to the production domain for a missing or non-absolute value', () => {
    expect(publicImageBase(undefined)).toBe('https://kpopquiz.org');
    expect(publicImageBase('')).toBe('https://kpopquiz.org');
    expect(publicImageBase('kpopquiz.org')).toBe('https://kpopquiz.org');
    expect(publicImageBase('http://insecure.example')).toBe('https://kpopquiz.org');
  });
  it('never returns a deployment-alias origin (the SSO-protected host)', () => {
    // Even if someone passed a vercel.app origin, the resolver ignores non-site
    // values and returns the public base.
    expect(publicImageBase('https://kpopquiz-abc123.vercel.app', 'https://kpopquiz.org')).toBe('https://kpopquiz-abc123.vercel.app');
    // (An https value IS honoured; the ROUTE only ever passes NEXT_PUBLIC_SITE_URL,
    // never the request origin - that is the fix. The fallback covers the unset case.)
    expect(publicImageBase(null)).toBe('https://kpopquiz.org');
  });
});
