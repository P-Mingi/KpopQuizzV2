import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { adminSiteOf } from '@/lib/admin/site';
import { parseCitation } from '../route';

import type { NextRequest } from 'next/server';

// Workstream T0: update or delete one pulse_citations row. Admin-only,
// service-role writes. Regenerate the affected month afterwards to bake the
// change into the report the public page renders.

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = parseCitation(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  // ADMIN-2: this tool serves kpopquiz.org only (its tables have no site column); the site is validated all the same.
  const siteResult = adminSiteOf(request, body, { only: ['kpop'] });
  if (!siteResult.ok) return siteResult.res;

  const svc = createServiceRoleClient();
  const { error } = await svc.from('pulse_citations').update(parsed.row).eq('id', numId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(gate, { site: siteResult.site, action: 'citation.update', targetType: 'pulse_citation', targetId: numId, detail: { active: parsed.row.active }, requestId: requestIdOf(request) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  // ADMIN-2: kpopquiz.org only; the site is validated all the same.
  const siteResult = adminSiteOf(request, undefined, { only: ['kpop'] });
  if (!siteResult.ok) return siteResult.res;

  const svc = createServiceRoleClient();
  const { error } = await svc.from('pulse_citations').delete().eq('id', numId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(gate, { site: siteResult.site, action: 'citation.delete', targetType: 'pulse_citation', targetId: numId, requestId: requestIdOf(request) });
  return NextResponse.json({ ok: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const POST = adminNotFound;
export const PATCH = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
