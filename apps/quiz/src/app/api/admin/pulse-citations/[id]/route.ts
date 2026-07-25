import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { parseCitation } from '../route';

import type { NextRequest } from 'next/server';

// Workstream T0: update or delete one pulse_citations row. Admin-only,
// service-role writes. Regenerate the affected month afterwards to bake the
// change into the report the public page renders.

function isAdminReq(user: { id: string } | null): boolean {
  return !!user && isAdmin(user.id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminReq(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = parseCitation(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const svc = createServiceRoleClient();
  const { error } = await svc.from('pulse_citations').update(parsed.row).eq('id', numId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminReq(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const svc = createServiceRoleClient();
  const { error } = await svc.from('pulse_citations').delete().eq('id', numId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
