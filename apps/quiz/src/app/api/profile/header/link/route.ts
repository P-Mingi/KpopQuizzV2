import { UX_V1 } from '@/lib/ux-v1';
import { checkHeaderFile } from '@/lib/ux-v1/p10/header-image';
import { headerPreflight, jsonError, storeHeader } from '@/lib/ux-v1/p10/header-store';
import { checkLinkUrl, fetchImageLink } from '@/lib/ux-v1/p10/ssrf';

import type { NextRequest, NextResponse } from 'next/server';

// UX v11 (P10): passport header from a pasted link (DESIGN-SPEC 17.8: the server
// fetches it, checks type and size, copies it to our storage; never hot-linked).
// JSON { url }. The fetch is SSRF-safe (lib/ux-v1/p10/ssrf.ts: https only, public
// addresses only after DNS, connection pinned to the vetted address, redirects
// re-checked, timeouts, 5 MB streaming cap). Signed in only; 503 before any work
// while the storage bucket is missing.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Flag off = today's site: the route does not exist.
  if (!UX_V1) return jsonError(404, 'Not found');
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, 'Send the link as JSON.'); }
  const raw = (body as { url?: unknown } | null)?.url;
  // Static checks first: a bad link is refused without touching auth, storage or the network.
  const pre0 = checkLinkUrl(raw);
  if (!pre0.ok) return jsonError(400, pre0.error, pre0.code);

  const pre = await headerPreflight();
  if (!pre.ok) return pre.res;

  const got = await fetchImageLink(raw);
  if (!got.ok) return jsonError(got.code === 'too_large' ? 413 : got.code === 'type' ? 415 : 400, got.error, got.code);

  const check = checkHeaderFile({ type: got.contentType, size: got.buffer.length }, got.buffer.subarray(0, 16));
  if (!check.ok) return jsonError(check.status, check.error);

  return storeHeader(got.buffer, pre.who);
}
