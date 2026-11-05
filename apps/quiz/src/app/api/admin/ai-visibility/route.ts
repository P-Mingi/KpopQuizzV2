import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { adminSiteOf } from '@/lib/admin/site';

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const { user } = gate;

  const body = await request.json();
  const { platform, query, mentioned, position, snippet, notes, checked_by } =
    body;

  if (!platform || !query || typeof mentioned !== 'boolean') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // ADMIN-2: the AI visibility log is kpopquiz.org's (no site column); the site is validated all the same.
  const siteResult = adminSiteOf(request, body, { only: ['kpop'] });
  if (!siteResult.ok) return siteResult.res;

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient.from('ai_visibility_checks').insert({
    platform,
    query,
    mentioned,
    position: position ?? null,
    snippet: snippet ?? null,
    notes: notes ?? null,
    checked_by: checked_by ?? user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAdminAction(gate, { site: siteResult.site, action: 'ai_visibility.log', targetType: 'ai_visibility_check', detail: { platform: typeof platform === 'string' ? platform.slice(0, 40) : null, mentioned }, requestId: requestIdOf(request) });
  return NextResponse.json({ ok: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
