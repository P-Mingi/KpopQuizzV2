import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

async function checkAdmin() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) return null;
  return createServiceRoleClient();
}

export async function GET(): Promise<NextResponse> {
  const db = await checkAdmin();
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await db
    .from('pinterest_scrape_jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const db = await checkAdmin();
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();

  if (!body.query?.trim()) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const jobType = body.job_type === 'board' ? 'board' : 'search';
  if (jobType === 'board' && !body.query.includes('pinterest.com/')) {
    return NextResponse.json({ error: 'Board URL must contain pinterest.com/' }, { status: 400 });
  }

  const { error } = await db
    .from('pinterest_scrape_jobs')
    .insert({
      query: body.query.trim(),
      job_type: jobType,
      target_count: body.target_count || 100,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const db = await checkAdmin();
  if (!db) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  await db.from('pinterest_scrape_jobs').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
