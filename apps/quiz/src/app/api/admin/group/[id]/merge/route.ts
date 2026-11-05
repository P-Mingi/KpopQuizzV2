import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { cacheOutcome, revalidateSite } from '@/lib/admin/revalidate-client';
import { adminSiteOf } from '@/lib/admin/site';
import { siteScope } from '@/lib/admin/site-scope';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const { id } = await params;
  const sourceGroupId = parseInt(id, 10);
  if (isNaN(sourceGroupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const targetGroupId = typeof body.target_group_id === 'number' ? body.target_group_id : parseInt(String(body.target_group_id), 10);
  if (isNaN(targetGroupId) || targetGroupId === sourceGroupId) {
    return NextResponse.json({ error: 'Invalid target group ID' }, { status: 400 });
  }

  // ADMIN-2: the site is the admin's choice (query or body), validated; every query below filters by it.
  const siteResult = adminSiteOf(request, body);
  if (!siteResult.ok) return siteResult.res;
  const site = siteResult.site;
  const { forSite } = siteScope(site);

  const adminDb = createServiceRoleClient();

  // Both groups must belong to the chosen site: a merge never reaches across sites.
  const { data: sameSite } = await forSite(adminDb.from('groups').select('id')).in('id', [sourceGroupId, targetGroupId]);
  if ((sameSite ?? []).length !== 2) {
    return NextResponse.json({ error: 'Both groups must belong to this site' }, { status: 400 });
  }

  // Move all quizzes from source to target
  const { error: moveError } = await forSite(adminDb
    .from('quizzes')
    .update({ group_id: targetGroupId }))
    .eq('group_id', sourceGroupId);

  if (moveError) {
    console.error('Failed to move quizzes:', moveError);
    return NextResponse.json({ error: 'Failed to move quizzes' }, { status: 500 });
  }

  // Delete the source group
  const { error: deleteError } = await forSite(adminDb
    .from('groups')
    .delete())
    .eq('id', sourceGroupId);

  if (deleteError) {
    console.error('Failed to delete source group:', deleteError);
    return NextResponse.json({ error: 'Failed to delete duplicate group' }, { status: 500 });
  }

  // Recalculate quiz_count on target group
  const { count } = await forSite(adminDb
    .from('quizzes')
    .select('id', { count: 'exact', head: true }))
    .eq('group_id', targetGroupId)
    .eq('status', 'published');

  await forSite(adminDb
    .from('groups')
    .update({ quiz_count: count ?? 0 }))
    .eq('id', targetGroupId);

  const cache = await revalidateSite(site, ['groups', 'quizzes']);
  await logAdminAction(gate, { site, action: 'group.merge', targetType: 'group', targetId: sourceGroupId, detail: { cache: cacheOutcome(cache), target_group_id: targetGroupId }, requestId: requestIdOf(request) });
  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
