import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

async function checkAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) return null;
  return createServiceRoleClient();
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const db = await checkAdmin();
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const filter = req.nextUrl.searchParams.get('filter') || 'all';

  let q = db.from('pinterest_scraped').select('*').eq('status', 'new').order('save_count', { ascending: false }).limit(200);
  if (filter !== 'all') {
    if (filter === 'unknown') q = q.is('detected_group', null);
    else q = q.eq('detected_group', filter);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const db = await checkAdmin();
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id, status } = await req.json();
  await db
    .from('pinterest_scraped')
    .update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
