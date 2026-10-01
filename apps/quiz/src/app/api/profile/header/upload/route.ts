import { UX_V1 } from '@/lib/ux-v1';
import { checkHeaderFile, HEADER_MAX_BYTES } from '@/lib/ux-v1/p10/header-image';
import { headerPreflight, jsonError, storeHeader } from '@/lib/ux-v1/p10/header-store';

import type { NextRequest, NextResponse } from 'next/server';

// UX v11 (P10): passport header upload (DESIGN-SPEC 17.8). multipart/form-data
// with one `file` (JPG, PNG or WebP, 5 MB). Signed in only; answers 503 before any
// write while the storage bucket is missing (pending migration
// v11-p10-header-storage.sql). The bytes are sniffed, re-encoded and cropped to
// 1500 x 300 (header-image.ts), stored under <uid>/ and saved to header_url.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Flag off = today's site: the route does not exist.
  if (!UX_V1) return jsonError(404, 'Not found');
  const pre = await headerPreflight();
  if (!pre.ok) return pre.res;

  const len = Number(request.headers.get('content-length') ?? 0);
  if (len > HEADER_MAX_BYTES + 64 * 1024) return jsonError(413, 'That image is over 5 MB.');

  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError(400, 'Send the picture as a file.'); }
  const file = form.get('file');
  if (!file || typeof file === 'string') return jsonError(400, 'Send the picture as a file.');

  const bytes = Buffer.from(await file.arrayBuffer());
  const check = checkHeaderFile({ type: file.type, size: bytes.length }, bytes.subarray(0, 16));
  if (!check.ok) return jsonError(check.status, check.error);

  return storeHeader(bytes, pre.who);
}
