import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createServiceRoleClient();

  const [jobsRes, reviewRes, approvedRes, processedRes] = await Promise.all([
    db.from('pinterest_scrape_jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db.from('pinterest_scraped').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    db.from('pinterest_scraped').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    db.from('pinterest_scraped').select('id', { count: 'exact', head: true }).eq('status', 'processed'),
  ]);

  return NextResponse.json({
    pendingJobs: jobsRes.count ?? 0,
    toReview: reviewRes.count ?? 0,
    approved: approvedRes.count ?? 0,
    readyToExport: processedRes.count ?? 0,
  });
}
