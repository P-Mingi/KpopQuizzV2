// Storage + profile write for the passport header routes (api/profile/header/*).
// Server only. The bucket is NOT created yet (pending migration
// docs/pending-migrations/v11-p10-header-storage.sql): every route asks
// bucketReady() first and answers 503 before any write while it is missing.

import { createHash } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import { renderHeader } from './header-image';

import type { SupabaseClient } from '@supabase/supabase-js';

export const HEADER_BUCKET = 'profile-headers';

export const BUCKET_MISSING_MESSAGE = 'Header pictures are not switched on yet. You can use the theme colour for now.';

/** True when the storage bucket exists (a read; never creates it). */
export async function bucketReady(svc: SupabaseClient): Promise<boolean> {
  try {
    const { data, error } = await svc.storage.getBucket(HEADER_BUCKET);
    return !error && Boolean(data);
  } catch {
    return false;
  }
}

// Per-instance throttle: 10 header changes per user per 10 minutes. Soft (a
// serverless instance is short-lived) but stops a tight loop from one client.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 10;
const hits = new Map<string, number[]>();
export function throttled(userId: string, now = Date.now()): boolean {
  const list = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= LIMIT) { hits.set(userId, list); return true; }
  list.push(now);
  hits.set(userId, list);
  return false;
}

export function jsonError(status: number, error: string, code?: string): NextResponse {
  return NextResponse.json({ error, ...(code ? { code } : {}) }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export interface HeaderUser { id: string; username: string; headerUrl: string | null }

/** Signed-in user + their current header (own row, RLS). Null when signed out. */
export async function headerUser(): Promise<{ user: HeaderUser; supabase: SupabaseClient } | null> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('username, header_url').eq('id', user.id).maybeSingle();
  const row = data as { username: string; header_url: string | null } | null;
  if (!row) return null;
  return { user: { id: user.id, username: row.username, headerUrl: row.header_url }, supabase: supabase as unknown as SupabaseClient };
}

/** Our own public object path from a stored header_url, when it points into the
 *  header bucket under this user's folder (only those are ever deleted). */
export function ownObjectPath(headerUrl: string | null, userId: string): string | null {
  if (!headerUrl) return null;
  const marker = `/storage/v1/object/public/${HEADER_BUCKET}/`;
  const i = headerUrl.indexOf(marker);
  if (i < 0) return null;
  const path = decodeURIComponent(headerUrl.slice(i + marker.length).split('?')[0] ?? '');
  return path.startsWith(`${userId}/`) && !path.includes('..') ? path : null;
}

/**
 * The shared tail of both routes: re-encode, upload under <uid>/, save
 * profiles.header_url on the user's own row (same client and RLS as
 * /api/auth/update-profile), revalidate the ISR passport, delete the previous
 * header object of ours. Returns the public URL.
 */
export async function storeHeader(bytes: Buffer, who: { user: HeaderUser; supabase: SupabaseClient }): Promise<NextResponse> {
  const svc = createServiceRoleClient() as unknown as SupabaseClient;
  const rendered = await renderHeader(bytes);
  if (!rendered.ok) return jsonError(rendered.status, rendered.error);

  const hash = createHash('sha256').update(rendered.out).digest('hex').slice(0, 16);
  const path = `${who.user.id}/${Date.now()}-${hash}.webp`;
  const up = await svc.storage.from(HEADER_BUCKET).upload(path, rendered.out, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
  if (up.error) {
    if (/bucket.*not.*found|not found/i.test(up.error.message)) return jsonError(503, BUCKET_MISSING_MESSAGE, 'bucket_missing');
    return jsonError(500, 'We could not save that picture. Try again.');
  }
  const url = svc.storage.from(HEADER_BUCKET).getPublicUrl(path).data.publicUrl;

  const { error } = await who.supabase
    .from('profiles')
    .update({ header_url: url, updated_at: new Date().toISOString() })
    .eq('id', who.user.id);
  if (error) {
    await svc.storage.from(HEADER_BUCKET).remove([path]).catch(() => undefined);
    return jsonError(500, 'We could not save that picture. Try again.');
  }

  const old = ownObjectPath(who.user.headerUrl, who.user.id);
  if (old && old !== path) await svc.storage.from(HEADER_BUCKET).remove([old]).catch(() => undefined);
  revalidatePath(`/u/${who.user.username}`);

  return NextResponse.json({ ok: true, url, width: rendered.width, height: rendered.height }, { headers: { 'Cache-Control': 'no-store' } });
}

/** Signed in + bucket ready + not throttled, in that order, before any work. */
export async function headerPreflight(): Promise<{ ok: true; who: { user: HeaderUser; supabase: SupabaseClient } } | { ok: false; res: NextResponse }> {
  const who = await headerUser();
  if (!who) return { ok: false, res: jsonError(401, 'Sign in to change your header.') };
  const ready = await bucketReady(createServiceRoleClient() as unknown as SupabaseClient);
  if (!ready) return { ok: false, res: jsonError(503, BUCKET_MISSING_MESSAGE, 'bucket_missing') };
  if (throttled(who.user.id)) return { ok: false, res: jsonError(429, 'Too many header changes. Try again in a few minutes.') };
  return { ok: true, who };
}
