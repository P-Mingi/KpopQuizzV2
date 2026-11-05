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
  const groupId = parseInt(id, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  let updates: Record<string, unknown> = { needs_review: false };
  let parsed: unknown;

  try {
    const body = await request.json();
    parsed = body;
    if (typeof body === 'object' && body !== null) {
      const allowed = ['name', 'slug', 'fandom_name', 'logo_url', 'display_color', 'text_color'];
      for (const key of allowed) {
        if (key in body && body[key] !== undefined) {
          updates[key] = body[key];
        }
      }
    }
  } catch {
    // No body provided, just approve
  }

  // ADMIN-2: the site is the admin's choice (query or body), validated; every query below filters by it.
  const siteResult = adminSiteOf(request, parsed);
  if (!siteResult.ok) return siteResult.res;
  const site = siteResult.site;
  const { forSite } = siteScope(site);

  const adminDb = createServiceRoleClient();

  const { error } = await forSite(adminDb
    .from('groups')
    .update(updates))
    .eq('id', groupId);

  if (error) {
    console.error('Failed to approve group:', error);
    return NextResponse.json({ error: 'Failed to approve group' }, { status: 500 });
  }

  const cache = await revalidateSite(site, ['groups']);
  await logAdminAction(gate, { site, action: 'group.approve', targetType: 'group', targetId: groupId, detail: { cache: cacheOutcome(cache), fields: Object.keys(updates) }, requestId: requestIdOf(request) });
  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
