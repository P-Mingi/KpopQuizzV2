// V-BUILDER-3 step 3 - THE INGEST CORE (owner image law L-047). Any image source is
// allowed, but every image is COPIED into our storage: never hotlinked. This module does
// the security-critical work, kept out of the route so it is testable:
//   - fetchExternalImage: SSRF-hardened server fetch of a pasted URL (https only, DNS
//     resolved + private/link-local IPs blocked, redirects refused, timeout, size cap).
//   - reEncode: sharp re-encode that STRIPS all EXIF/XMP (sharp drops metadata unless asked
//     to keep it), enforces a max dimension, rejects SVG (XSS) + non-image, keeps GIF animated,
//     and returns the sha256 of the STORED bytes for dedupe.
// sharp + node:crypto/dns/net are already available (no new deps).
import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import net from 'node:net';

import sharp from 'sharp';

export const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10MB pre-encode ceiling (block images > stickers)
export const MAX_DIM = 2048;                     // longest edge after re-encode
const FETCH_TIMEOUT_MS = 10_000;

export type IngestFormat = 'jpeg' | 'png' | 'webp' | 'gif';
const ALLOWED: IngestFormat[] = ['jpeg', 'png', 'webp', 'gif'];
const EXT: Record<IngestFormat, string> = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif' };
const MIME: Record<IngestFormat, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export interface ReEncoded { out: Buffer; ext: string; mime: string; hash: string; width: number | null; height: number | null }

// ---- SSRF: reject any address that is not a normal public unicast host -------------
function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true; // malformed -> treat as unsafe
  const [a, b] = p as [number, number, number, number];
  return a === 0 || a === 10 || a === 127 || a >= 224            // this-net, private, loopback, multicast/reserved
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 169 && b === 254)                                   // link-local
    || (a === 100 && b >= 64 && b <= 127);                        // CGNAT
}
function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const low = ip.toLowerCase();
  if (low === '::1' || low === '::') return true;
  if (low.startsWith('::ffff:')) return isPrivateIPv4(low.slice(7)); // IPv4-mapped IPv6
  return low.startsWith('fc') || low.startsWith('fd')  // unique-local
    || low.startsWith('fe80') || low.startsWith('fe9') || low.startsWith('fea') || low.startsWith('feb'); // link-local
}

async function assertPublicHost(hostname: string): Promise<string | null> {
  // an IPv6 URL host arrives bracketed ("[::1]"); strip so net.isIP + the private check see it.
  const host = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) return isPrivateIP(host) ? 'That URL points to a private address.' : null;
  const results = await lookup(host, { all: true }).catch(() => [] as { address: string }[]);
  if (!results.length) return 'Could not resolve that host.';
  for (const r of results) if (isPrivateIP(r.address)) return 'That URL points to a private address.';
  return null;
}

/** Fetch a pasted https image URL into memory, SSRF-hardened. Returns bytes or a human error. */
export async function fetchExternalImage(rawUrl: string): Promise<{ buffer: Buffer } | { error: string }> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return { error: 'That is not a valid URL.' }; }
  if (url.protocol !== 'https:') return { error: 'Only https image URLs are allowed.' };
  const hostErr = await assertPublicHost(url.hostname);
  if (hostErr) return { error: hostErr };
  let res: Response;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'KpopQuizBot/1.0 (+https://kpopquiz.org)' }, redirect: 'manual', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch { return { error: 'Could not fetch that image (timeout or network error).' }; }
  if (res.status >= 300 && res.status < 400) return { error: 'That link redirects. Paste the direct image URL instead.' };
  if (!res.ok) return { error: `The image URL returned HTTP ${res.status}.` };
  const ct = (res.headers.get('content-type') ?? '').split(';')[0]!.trim();
  if (!ct.startsWith('image/')) return { error: 'That URL is not an image.' };
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len && len > MAX_INPUT_BYTES) return { error: 'That image is too large (max 10MB).' };
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > MAX_INPUT_BYTES) return { error: 'That image is too large (max 10MB).' };
  return { buffer };
}

/** Re-encode to strip metadata + bound the size; returns stored bytes + sha256 (dedupe). */
export async function reEncode(input: Buffer): Promise<ReEncoded | { error: string }> {
  if (input.length > MAX_INPUT_BYTES) return { error: 'That image is too large (max 10MB).' };
  // SVG is text -> XSS; sharp would parse it, so gate on the raw head first.
  const head = input.subarray(0, 256).toString('utf8').trim().toLowerCase();
  if (head.includes('<svg') || head.startsWith('<?xml') || head.startsWith('<!doctype')) {
    return { error: 'SVG is not allowed. Use JPG, PNG, WebP, or GIF.' };
  }
  let meta: sharp.Metadata;
  try { meta = await sharp(input).metadata(); } catch { return { error: 'That file is not a valid image.' }; }
  const fmt = meta.format as IngestFormat | undefined;
  if (!fmt || !ALLOWED.includes(fmt)) return { error: 'Only JPG, PNG, WebP, or GIF images are allowed.' };
  const animated = fmt === 'gif' || (meta.pages ?? 1) > 1;
  let out: Buffer;
  try {
    // sharp does NOT copy metadata unless .withMetadata() is called -> EXIF/XMP are stripped.
    const pipe = sharp(input, animated ? { animated: true } : {}).resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true });
    out = fmt === 'gif' ? await pipe.gif().toBuffer()
      : fmt === 'png' ? await pipe.png().toBuffer()
      : fmt === 'webp' ? await pipe.webp().toBuffer()
      : await pipe.jpeg({ quality: 82 }).toBuffer();
  } catch { return { error: 'Could not process that image.' }; }
  const fin = await sharp(out).metadata().catch(() => ({}) as sharp.Metadata);
  const hash = createHash('sha256').update(out).digest('hex');
  return { out, ext: EXT[fmt], mime: MIME[fmt], hash, width: fin.width ?? null, height: fin.height ?? null };
}
