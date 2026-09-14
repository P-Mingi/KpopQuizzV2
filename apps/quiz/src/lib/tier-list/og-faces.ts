import { isConfiguredImageHost } from '@/lib/image-hosts';

// Prefetch the face photos shown on the share card to data URIs, so the edge OG
// route embeds real images instead of a grey initials tile. Kept isomorphic (no
// next/og import) so it is unit-testable in a node vitest env: the route imports
// fetchFaceImages, the test mocks global fetch.
//
// Why prefetch to a data URI rather than let next/og fetch a remote <img>: a
// remote image inside satori that fails or is slow takes the whole ImageResponse
// down with a 500 (the same failure the group OG route fixed). Here every fetch
// is bounded by a timeout and a size guard; a face that fails, times out, is not
// an allowed image host, or is a client-only blob/object URL (custom uploads this
// phase) is simply omitted, so the caller falls back to the initials tile for
// that one face. The card therefore always composes: the common case is all
// photos, the degraded case is a few initials, never an all-grey card and never
// a 500.

export interface FaceRef {
  id: string;
  url: string | null;
}

/**
 * The base a local `/idols/...` image path is resolved against for the OG route's
 * server-side fetch. It MUST be the stable public custom domain (NEXT_PUBLIC_SITE_URL
 * when it is an absolute https origin), NEVER request.nextUrl.origin: on Vercel the
 * OG route can be reached on the deployment alias (*.vercel.app), which is
 * SSO-protected even in production (all_except_custom_domains), so a fetch against
 * that origin 401s and every face falls back to initials - and the cached response
 * then poisons the card for everyone. Pinning the base makes the card independent of
 * the incoming host.
 */
export function publicImageBase(siteUrlEnv?: string | null, fallback = 'https://kpopquiz.org'): string {
  if (siteUrlEnv && /^https:\/\//i.test(siteUrlEnv)) return siteUrlEnv.replace(/\/+$/, '');
  return fallback;
}

/** id -> data URI, only for faces whose photo was fetched successfully. */
export type FaceImageMap = Record<string, string>;

function base64FromBytes(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function fetchDataUri(url: string, timeoutMs: number, maxBytes: number): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.startsWith('image/')) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > maxBytes) return null;
    return `data:${type};base64,${base64FromBytes(bytes)}`;
  } catch {
    return null;
  }
}

export interface FaceFetchOptions {
  /** Per-image fetch timeout. A slow cover falls back to initials, never blocks. */
  timeoutMs?: number;
  /** Cap on distinct URLs fetched, so a huge board keeps the edge render fast. */
  cap?: number;
  /** Reject oversized art before it bloats the response. */
  maxBytes?: number;
  /**
   * Origin used to absolutise a local image path (idol photos are served from
   * /public as `/idols/...`). fetch() needs an absolute URL, so a relative path
   * with no origin cannot be fetched and falls back to initials.
   */
  origin?: string;
}

/**
 * Fetch the photos for the given faces in parallel and return id -> data URI for
 * the ones that succeeded. Deduplicates by URL (two tracks can share an album
 * cover), resolves local `/...` paths against `origin`, skips off-allowlist and
 * client-only (blob:) urls, caps total fetches, and never throws: a failed or
 * timed-out fetch just leaves that id out of the map.
 */
export async function fetchFaceImages(faces: FaceRef[], opts: FaceFetchOptions = {}): Promise<FaceImageMap> {
  const timeoutMs = opts.timeoutMs ?? 2500;
  const cap = opts.cap ?? 48;
  const maxBytes = opts.maxBytes ?? 3_000_000;

  // Group ids by the absolute URL they resolve to, so each distinct URL is
  // fetched at most once and every id sharing it gets the same result.
  const idsByUrl = new Map<string, string[]>();
  for (const f of faces) {
    if (!f.url || !isConfiguredImageHost(f.url)) continue;
    let fetchUrl: string;
    if (f.url.startsWith('/')) {
      if (!opts.origin) continue; // a relative path cannot be fetched without a base
      try { fetchUrl = new URL(f.url, opts.origin).toString(); } catch { continue; }
    } else {
      fetchUrl = f.url;
    }
    const ids = idsByUrl.get(fetchUrl);
    if (ids) ids.push(f.id);
    else idsByUrl.set(fetchUrl, [f.id]);
  }

  const urls = [...idsByUrl.keys()].slice(0, cap);
  const results = await Promise.allSettled(urls.map((u) => fetchDataUri(u, timeoutMs, maxBytes)));

  const out: FaceImageMap = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      for (const id of idsByUrl.get(urls[i]!) ?? []) out[id] = r.value;
    }
  });
  return out;
}
