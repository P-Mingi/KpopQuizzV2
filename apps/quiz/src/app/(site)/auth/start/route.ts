// Bunnyverse (security review, 2026-10-28; lane 3). GET /auth/start?provider&returnTo&via: Google or Discord on the hub and
// anime, started on the server so the callback can be registered in Supabase exactly (lib/passport/signin.ts
// handleOAuthStart). The kpop build answers 404 and keeps its own sign-in.
import { handleOAuthStart } from '@/lib/passport/signin';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleOAuthStart(request);
}
