import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { parseMv } from '../route';

import type { NextRequest } from 'next/server';

// Workstream T1.5: update or delete one tracked MV. Deleting cascades its
// snapshots (mv_snapshots FK ON DELETE CASCADE).

async function gate(): Promise<boolean> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user && isAdmin(user.id);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!(await gate())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = parseMv(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const svc = createServiceRoleClient();
  const { error } = await svc.from('mv_tracking').update(parsed.row).eq('id', numId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!(await gate())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const svc = createServiceRoleClient();
  const { error } = await svc.from('mv_tracking').delete().eq('id', numId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
