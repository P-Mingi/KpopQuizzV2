import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';

import type { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const { id } = await params;
  const sourceGroupId = parseInt(id, 10);
  if (isNaN(sourceGroupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const targetGroupId = typeof body.target_group_id === 'number' ? body.target_group_id : parseInt(String(body.target_group_id), 10);
  if (isNaN(targetGroupId) || targetGroupId === sourceGroupId) {
    return NextResponse.json({ error: 'Invalid target group ID' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Move all quizzes from source to target
  const { error: moveError } = await adminDb
    .from('quizzes')
    .update({ group_id: targetGroupId })
    .eq('group_id', sourceGroupId);

  if (moveError) {
    console.error('Failed to move quizzes:', moveError);
    return NextResponse.json({ error: 'Failed to move quizzes' }, { status: 500 });
  }

  // Delete the source group
  const { error: deleteError } = await adminDb
    .from('groups')
    .delete()
    .eq('id', sourceGroupId);

  if (deleteError) {
    console.error('Failed to delete source group:', deleteError);
    return NextResponse.json({ error: 'Failed to delete duplicate group' }, { status: 500 });
  }

  // Recalculate quiz_count on target group
  const { count } = await adminDb
    .from('quizzes')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', targetGroupId)
    .eq('status', 'published');

  await adminDb
    .from('groups')
    .update({ quiz_count: count ?? 0 })
    .eq('id', targetGroupId);

  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
