import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { anonHash } from '@/lib/anon-hash';

import type { NextRequest } from 'next/server';

// K7 - tiny status endpoint the "Brag" button uses to decide whether to show
// itself (kill switch) and whether it should already be disabled (this exact
// context_key was already flexed). NEVER returns the webhook URL.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const enabled = !!process.env.DISCORD_FLEX_WEBHOOK_URL;
  if (!enabled) return NextResponse.json({ enabled: false });

  const key = new URL(req.url).searchParams.get('key');
  if (!key) return NextResponse.json({ enabled: true, already_flexed: false });

  const voterHash = anonHash(req);
  const svc = createServiceRoleClient();
  const { count } = await svc
    .from('discord_flex_log')
    .select('id', { count: 'exact', head: true })
    .eq('voter_hash', voterHash)
    .eq('context_key', key.slice(0, 200));
  return NextResponse.json({ enabled: true, already_flexed: (count ?? 0) > 0 });
}
