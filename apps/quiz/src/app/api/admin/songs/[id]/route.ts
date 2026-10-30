import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin/guard';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  // ADMIN-1: written with the service role, only after requireAdmin (the open write policies of blind_test_songs are closing).
  const db = createServiceRoleClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data, error } = await db
    .from('blind_test_songs')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  // ADMIN-1: written with the service role, only after requireAdmin (the open write policies of blind_test_songs are closing).
  const db = createServiceRoleClient();

  const { error } = await db
    .from('blind_test_songs')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
