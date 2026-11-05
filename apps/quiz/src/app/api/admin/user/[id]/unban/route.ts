import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { lastActionDetail, logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { revalidateEverywhere } from '@/lib/admin/revalidate-client';
import { adminSiteOf } from '@/lib/admin/site';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  // ADMIN-2: the site is the admin's choice (query or body), validated. Accounts are shared by the three sites: it scopes what is site data
  // (the notification, the list of members) and tells the journal where the admin was.
  const siteResult = adminSiteOf(request);
  if (!siteResult.ok) return siteResult.res;
  const site = siteResult.site;

  const adminDb = createServiceRoleClient();

  const { error: unbanError } = await adminDb
    .from('profiles')
    .update({ banned_at: null })
    .eq('id', id);

  if (unbanError) {
    return NextResponse.json({ error: 'Failed to unban user' }, { status: 500 });
  }

  // R39: only what the ban took down comes back (the quiz ids its journal line kept), and only if it is still removed. A quiz the admin removed
  // for another reason, or before the ban, stays removed. Without a ban line in the journal nothing is republished.
  const banned = await lastActionDetail('user.ban', id);
  const ids = Array.isArray(banned?.quiz_ids) ? (banned.quiz_ids as unknown[]).filter((v): v is string => typeof v === 'string') : [];
  let republished = 0;
  if (ids.length > 0) {
    const { data: back } = await adminDb
      .from('quizzes')
      .update({ status: 'published' })
      .eq('creator_id', id)
      .eq('status', 'removed')
      .in('id', ids)
      .select('id');
    republished = (back ?? []).length;
  }

  const cache = await revalidateEverywhere(['quizzes', 'groups', 'creators']);
  await logAdminAction(gate, { site, action: 'user.unban', targetType: 'user', targetId: id, detail: { cache, republished, ban_found: banned !== null }, requestId: requestIdOf(request) });
  return NextResponse.json({ success: true, republished });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
