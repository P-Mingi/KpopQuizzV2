import { NextResponse } from 'next/server';

import { createPublicReadClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bump a tier list's view counter atomically via the 147 tier_list_bump_view RPC
// (one UPDATE, so concurrent views cannot lose increments). Views rank nothing, so
// this stays open to logged-out viewers, but a server-side throttle (per ip+day,
// the repo's in-memory rate-limit pattern) caps a burst; the client also dedups
// per browser.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const recent = new Map<string, number[]>();

function underRateLimit(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length <= MAX_PER_WINDOW;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: { slug?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }
  const slug = typeof body.slug === 'string' ? body.slug : '';
  if (!slug) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  if (!underRateLimit(anonHash(req))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const db = createPublicReadClient();
  const { data, error } = await db.rpc('tier_list_bump_view', { p_slug: slug });
  if (error) return NextResponse.json({ error: 'Could not update.' }, { status: 500 });
  return NextResponse.json({ views: typeof data === 'number' ? data : null });
}
