import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';

import type { NextRequest } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const adminDb = createServiceRoleClient();

  const { error } = await adminDb
    .from('reports')
    .update({ status: 'resolved' })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to dismiss report' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
