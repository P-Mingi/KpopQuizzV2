import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The photo route with a SIMULATED analysis (vi.mock of lib/moderation/nsfw: never a real
// NSFW picture): a refused photo is never stored and the route says nsfw_image; a safe one
// is stored under community/<user>/ and its path comes back.

const upload = vi.fn(async () => ({ data: { path: 'x' }, error: null }));
const list = vi.fn(async () => ({ data: [], error: null }));
const classify = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: '0b8f6b8e-1111-4c4c-8d8d-123456789abc' } } }) } }),
  createServiceRoleClient: () => ({ storage: { from: () => ({ upload, list }) } }),
}));
vi.mock('@/lib/moderation/nsfw', () => ({ classifyJpeg: (b: Uint8Array) => classify(b) }));

// A minimal JPEG-looking body (SOI marker + padding): the route checks the marker and the size.
const JPEG = new Uint8Array(512).fill(0);
JPEG[0] = 0xff; JPEG[1] = 0xd8;

function post(): Request {
  return new Request('http://localhost/api/ux-v1/p8/photo', { method: 'POST', headers: { 'content-type': 'image/jpeg', 'content-length': String(JPEG.length) }, body: JPEG });
}

async function route(): Promise<typeof import('./route')> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', '1');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  return import('./route');
}

beforeEach(() => { upload.mockClear(); list.mockClear(); classify.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); });

describe('POST /api/ux-v1/p8/photo', () => {
  it('a photo the analysis calls NSFW is refused and never stored', async () => {
    classify.mockResolvedValue({ scores: { Porn: 0.91, Hentai: 0.02, Sexy: 0.05, Neutral: 0.01, Drawing: 0.01 }, nsfw: true, ms: { load: 0, decode: 1, classify: 1 } });
    const { POST } = await route();
    const res = await POST(post() as never);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: 'nsfw_image' });
    expect(upload).not.toHaveBeenCalled();
  });

  it('a safe photo is stored under community/<user>/ and its path comes back', async () => {
    classify.mockResolvedValue({ scores: { Porn: 0.01, Hentai: 0.01, Sexy: 0.73, Neutral: 0.2, Drawing: 0.05 }, nsfw: false, ms: { load: 0, decode: 1, classify: 1 } });
    const { POST } = await route();
    const res = await POST(post() as never);
    expect(res.status).toBe(200);
    const data = await res.json() as { assetPath: string; url: string };
    expect(data.assetPath).toMatch(/^community\/0b8f6b8e-1111-4c4c-8d8d-123456789abc\/[0-9a-f-]{36}\.jpg$/);
    expect(data.url).toBe(`https://example.supabase.co/storage/v1/object/public/verse-space-assets/${data.assetPath}`);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it('not a JPEG: refused before any analysis', async () => {
    const { POST } = await route();
    const res = await POST(new Request('http://localhost/api/ux-v1/p8/photo', { method: 'POST', headers: { 'content-type': 'image/png' }, body: JPEG }) as never);
    expect(res.status).toBe(415);
    expect(classify).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('flag off: the route does not exist', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_UX_V1', '');
    vi.stubEnv('NEXT_PUBLIC_UX_V12', '');
    const { POST } = await import('./route');
    expect((await POST(post() as never)).status).toBe(404);
  });
});
