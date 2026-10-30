import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { forSite } from '@/lib/site/scope';

import type { NextRequest } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Only allow updating these fields
  const allowed = ['title', 'description', 'scheduled_date', 'status', 'verification_notes', 'verified_at', 'difficulty', 'category'];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const key of allowed) {
    if (key in (body as Record<string, unknown>)) {
      update[key] = (body as Record<string, unknown>)[key];
    }
  }

  // Auto-set verified_at when promoting to verified
  if (update.status === 'verified' && !update.verified_at) {
    update.verified_at = new Date().toISOString();
  }

  const { data, error } = await forSite(adminDb
    .from('quiz_bank')
    .update(update))
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;

  const { id } = await params;
  const adminDb = createServiceRoleClient();

  const { error } = await forSite(adminDb.from('quiz_bank').delete()).eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const POST = adminNotFound;
export const PUT = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
