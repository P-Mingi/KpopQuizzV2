import { NextResponse } from 'next/server';

import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { cacheOutcome, revalidateSite } from '@/lib/admin/revalidate-client';
import { adminSiteOf } from '@/lib/admin/site';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { pickSongFields } from '../song-fields';

import type { NextRequest } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  // ADMIN-1: written with the service role, only after requireAdmin (the open write policies of blind_test_songs are closing).
  const db = createServiceRoleClient();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  // ADMIN-2: the blind test songs are kpopquiz.org's (no site column); the site is validated all the same.
  const siteResult = adminSiteOf(request, body, { only: ['kpop'] });
  if (!siteResult.ok) return siteResult.res;

  const { data, error } = await db
    .from('blind_test_songs')
    .update({ ...pickSongFields(body as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const cache = await revalidateSite(siteResult.site, ['songs']);
  await logAdminAction(gate, { site: siteResult.site, action: 'song.update', targetType: 'song', targetId: id, detail: { cache: cacheOutcome(cache) }, requestId: requestIdOf(request) });
  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  // ADMIN-1: written with the service role, only after requireAdmin (the open write policies of blind_test_songs are closing).
  const db = createServiceRoleClient();

  // ADMIN-2: kpopquiz.org's songs; the site is validated all the same.
  const siteResult = adminSiteOf(request, undefined, { only: ['kpop'] });
  if (!siteResult.ok) return siteResult.res;

  const { error } = await db
    .from('blind_test_songs')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const cache = await revalidateSite(siteResult.site, ['songs']);
  await logAdminAction(gate, { site: siteResult.site, action: 'song.delete', targetType: 'song', targetId: id, detail: { cache: cacheOutcome(cache) }, requestId: requestIdOf(request) });
  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const POST = adminNotFound;
export const PATCH = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
