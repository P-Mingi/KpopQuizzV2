import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { adminSiteOf } from '@/lib/admin/site';
import { siteScope } from '@/lib/admin/site-scope';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  // ADMIN-2: the site is the admin's choice (query or body), validated; every query below filters by it.
  const siteResult = adminSiteOf(request);
  if (!siteResult.ok) return siteResult.res;
  const site = siteResult.site;
  const { forSite } = siteScope(site);

  const adminDb = createServiceRoleClient();

  // Only a report of the chosen site (R31).
  const { error } = await forSite(adminDb
    .from('reports')
    .update({ status: 'resolved' }))
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to dismiss report' }, { status: 500 });
  }

  await logAdminAction(gate, { site, action: 'report.dismiss', targetType: 'report', targetId: id, requestId: requestIdOf(request) });
  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
