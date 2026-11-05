// ADMIN-2 (owner, 2026-10-30; PLAN-ADMIN-2 section 2): the revalidation route every build serves, called by the admin of the hub after a write that
// touches a public page of THIS site (lib/admin/revalidate-client.ts). POST only, JSON { tags: [...] }, header Authorization: Bearer <secret>.
//
//   - the secret is ADMIN_REVALIDATE_SECRET, shared by the three projects and compared without stopping at the first different character;
//   - the tags are a closed list (lib/admin/revalidate.ts); one tag off the list refuses the whole call;
//   - every refusal is the same plain 404, whatever the cause (no secret configured, wrong secret, bad body, wrong method): the route says
//     nothing to a stranger, like the admin routes;
//   - it reads no cookie, grants nothing but the expiry of cached public reads, and is never cached or indexed.
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { parseRevalidateBody } from '@/lib/admin/revalidate';
import { revalidateSecret } from '@/lib/admin/revalidate-client';

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const HEADERS = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } as const;
const notFound = (): NextResponse => NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404, headers: { ...HEADERS } });

/** Same length or false; every position compared. */
function sameSecret(given: string, want: string): boolean {
  if (given.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i += 1) diff |= given.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const want = revalidateSecret();
  if (want === null) return notFound();
  const auth = req.headers.get('authorization') ?? '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!sameSecret(given, want)) return notFound();
  if ((req.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase() !== 'application/json') return notFound();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return notFound();
  }
  const tags = parseRevalidateBody(body);
  if (tags === null) return notFound();
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ ok: true, tags }, { status: 200, headers: { ...HEADERS } });
}

export const GET = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
export const OPTIONS = notFound;
