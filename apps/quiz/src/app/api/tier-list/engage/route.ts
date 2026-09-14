import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Bump a tier list's like or view counter. The counters live on the 146 row
// (tier_lists.likes / .views); the write goes through the service role. Dedup is
// per-browser on the client (localStorage), so the same viewer does not inflate a
// count on reload. Server-enforced cross-device one-per-user idempotency would
// need a join table (a 147 migration, owner-applied); it is intentionally not
// added here so this phase stays on the applied 146. Named in the REPORT.

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { slug?: string; action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }
  const slug = typeof body.slug === 'string' ? body.slug : '';
  const col = body.action === 'like' ? 'likes' : body.action === 'view' ? 'views' : null;
  if (!slug || !col) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const admin = createServiceRoleClient();
  const { data } = await admin.from('tier_lists').select(`id,${col}`).eq('slug', slug).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  const current = (data as Record<string, number>)[col] ?? 0;
  const next = current + 1;
  const { error } = await admin.from('tier_lists').update({ [col]: next }).eq('id', (data as { id: string }).id);
  if (error) return NextResponse.json({ error: 'Could not update.' }, { status: 500 });
  return NextResponse.json({ [col]: next });
}
