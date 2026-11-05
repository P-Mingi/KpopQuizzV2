import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { cacheOutcome, revalidateSite } from '@/lib/admin/revalidate-client';
import { adminSiteOf } from '@/lib/admin/site';
import { siteScope } from '@/lib/admin/site-scope';

import type { NextRequest } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const { supabase } = gate;

  const { id } = await params;
  const groupId = parseInt(id, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  // ADMIN-2: the site is the admin's choice (query or body), validated; every query below filters by it.
  const siteResult = adminSiteOf(request);
  if (!siteResult.ok) return siteResult.res;
  const site = siteResult.site;
  const { forSite } = siteScope(site);

  // Check if group has published quizzes
  const { count } = await forSite(supabase
    .from('quizzes')
    .select('id', { count: 'exact', head: true }))
    .eq('group_id', groupId);

  if (count && count > 0) {
    return NextResponse.json({ error: 'Move or delete the quizzes first' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  const { error } = await forSite(adminDb
    .from('groups')
    .delete())
    .eq('id', groupId);

  if (error) {
    console.error('Failed to delete group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }

  const cache = await revalidateSite(site, ['groups']);
  await logAdminAction(gate, { site, action: 'group.delete', targetType: 'group', targetId: groupId, detail: { cache: cacheOutcome(cache) }, requestId: requestIdOf(request) });
  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const POST = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
