import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
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

  const { error: banError } = await adminDb
    .from('profiles')
    .update({ banned_at: new Date().toISOString() })
    .eq('id', id);

  if (banError) {
    return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
  }

  // R37: a ban takes down the user's PUBLISHED quizzes on every site (the account is the same everywhere), and the journal keeps which ones,
  // so the unban (R39) puts back exactly those and no quiz the admin removed for another reason.
  // site-scope: a ban takes down the account's published quizzes on every site (R37), so this read is deliberately not filtered by site.
  const { data: live } = await adminDb
    .from('quizzes')
    .select('id')
    .eq('creator_id', id)
    .eq('status', 'published');
  const removedIds = ((live ?? []) as Array<{ id: string }>).map((q) => q.id);
  if (removedIds.length > 0) {
    await adminDb
      .from('quizzes')
      .update({ status: 'removed' })
      .in('id', removedIds);
  }

  const cache = await revalidateEverywhere(['quizzes', 'groups', 'creators']);
  await logAdminAction(gate, { site, action: 'user.ban', targetType: 'user', targetId: id, detail: { cache, removed: removedIds.length, quiz_ids: removedIds, ids_cut: removedIds.length > 150 }, requestId: requestIdOf(request) });
  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
