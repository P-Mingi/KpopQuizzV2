import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/guard';

import type { NextRequest } from 'next/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const { supabase } = gate;

  const { id } = await params;
  const groupId = parseInt(id, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  // Check if group has published quizzes
  const { count } = await supabase
    .from('quizzes')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if (count && count > 0) {
    return NextResponse.json({ error: 'Move or delete the quizzes first' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  const { error } = await adminDb
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Failed to delete group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
