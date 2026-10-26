// Run O1 (ADM back): what every admin image route shares. The gate (a user in ADMIN_USER_IDS on the anime build, else 404), the
// same-origin check of writes, a capped body reader and the answers { ok: true, ... } or { error, code }.
import { NextResponse } from 'next/server';

import { isAdmin } from '@/lib/admin';
import { SITE_ID } from '@/lib/site/registry';
import { createServerClient } from '@/lib/supabase/server';

import { IMAGE_SITE } from './constants';
import { ImageError } from './errors';

import type { NextRequest } from 'next/server';

export const notFound = (): NextResponse => NextResponse.json({ error: 'Not found.', code: 'not_found' }, { status: 404 });

export type Gate = { readonly ok: true; readonly userId: string } | { readonly ok: false; readonly res: NextResponse };

/**
 * 404 unless the build is the anime site AND the signed-in user is in ADMIN_USER_IDS (checked on the server from the session).
 * A visitor, a signed-in non-admin and a kpop build cannot tell this route from a missing one.
 */
export async function adminGate(): Promise<Gate> {
  if (SITE_ID !== IMAGE_SITE) return { ok: false, res: notFound() };
  try {
    const client = await createServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user?.id || !isAdmin(user.id)) return { ok: false, res: notFound() };
    return { ok: true, userId: user.id };
  } catch {
    return { ok: false, res: notFound() };
  }
}

/**
 * A write must come from the page's own site. With an Origin header, its host must be the request's host. Without one (some browsers
 * leave it off), the browser's own Sec-Fetch-Site header must say same-origin; a caller that sends neither is refused.
 */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return req.headers.get('sec-fetch-site') === 'same-origin';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try { return !host || new URL(origin).host === host; } catch { return false; }
}

/** The JSON routes take application/json only (a form post from another site cannot send it without a preflight). */
export function assertJson(req: NextRequest): void {
  const type = (req.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
  if (type !== 'application/json') throw new ImageError('unsupported_type', 415, 'The request body must be application/json.');
}

/** Answers 404 (never Next's 405) for a method a route does not implement. */
export function notFoundHandler(): NextResponse {
  return notFound();
}

export const forbidden = (): NextResponse => NextResponse.json({ error: 'This request does not come from the admin page.', code: 'forbidden' }, { status: 403 });

export function ok<T extends object>(body: T): NextResponse {
  return NextResponse.json({ ok: true, ...body }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}

/** An ImageError keeps its status and words; anything else is a 500 that says nothing about the cause. */
export function failure(e: unknown): NextResponse {
  if (e instanceof ImageError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status, headers: { 'Cache-Control': 'no-store' } });
  console.error('admin images: unexpected error', e instanceof Error ? e.name : typeof e);
  return NextResponse.json({ error: 'Something went wrong. Try again.', code: 'server_error' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
}

/** The whole request body, refused as soon as it passes `max` bytes (a missing or false Content-Length does not help). */
export async function readBody(req: NextRequest, max: number): Promise<Buffer> {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) throw new ImageError('too_large', 413, 'The upload is larger than 8 MB.');
  if (!req.body) return Buffer.alloc(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      throw new ImageError('too_large', 413, 'The upload is larger than 8 MB.');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks, total);
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  assertJson(req);
  const raw = await readBody(req, 64 * 1024);
  try {
    const v: unknown = JSON.parse(raw.toString('utf8'));
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch { /* falls through */ }
  throw new ImageError('bad_request', 400, 'The request body must be a JSON object.');
}

/** The multipart form of an upload, read under the size cap (the file's 8 MB plus room for the other fields). */
export async function readForm(req: NextRequest, max: number): Promise<FormData> {
  const type = req.headers.get('content-type') ?? '';
  if (!/^multipart\/form-data;\s*boundary=/i.test(type)) throw new ImageError('bad_request', 400, 'The upload must be a multipart form.');
  const raw = await readBody(req, max);
  try {
    return await new Response(new Uint8Array(raw), { headers: { 'content-type': type } }).formData();
  } catch {
    throw new ImageError('bad_request', 400, 'The upload form could not be read.');
  }
}
