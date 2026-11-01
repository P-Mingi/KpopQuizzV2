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
  const groupId = parseInt(id, 10);
  if (isNaN(groupId)) {
    return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 });
  }

  let updates: Record<string, unknown> = { needs_review: false };

  try {
    const body = await request.json();
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

  const adminDb = createServiceRoleClient();

  const { error } = await adminDb
    .from('groups')
    .update(updates)
    .eq('id', groupId);

  if (error) {
    console.error('Failed to approve group:', error);
    return NextResponse.json({ error: 'Failed to approve group' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
