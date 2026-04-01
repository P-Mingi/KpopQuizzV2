import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const adminDb = createServiceRoleClient();

  const { data, error } = await adminDb
    .from('pinterest_pins')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ pin: data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  const allowed = [
    'title', 'description', 'board', 'pin_type', 'link_url',
    'group_name', 'group_slug', 'headline', 'subtext', 'fact_date',
    'score_display', 'score_percent', 'image_url', 'generated_image_url',
    'image_storage_path', 'image_public_url',
    'needs_photo', 'status', 'posted_at', 'scheduled_date', 'scheduled_for',
    'pinterest_pin_id', 'hashtags', 'category', 'sort_order',
  ];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  for (const key of allowed) {
    if (key in (body as Record<string, unknown>)) {
      update[key] = (body as Record<string, unknown>)[key];
    }
  }

  if (update.status === 'posted' && !update.posted_at) {
    update.posted_at = new Date().toISOString();
  }

  const { data, error } = await adminDb
    .from('pinterest_pins')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pin: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const adminDb = createServiceRoleClient();

  const { error } = await adminDb.from('pinterest_pins').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
