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

  const { error: banError } = await adminDb
    .from('profiles')
    .update({ banned_at: new Date().toISOString() })
    .eq('id', id);

  if (banError) {
    return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 });
  }

  await adminDb
    .from('quizzes')
    .update({ status: 'removed' })
    .eq('creator_id', id);

  return NextResponse.json({ success: true });
}
