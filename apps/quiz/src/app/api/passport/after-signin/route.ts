// Run O1, lot (b), lane P1. POST /api/passport/after-signin: called by the sign-in UI of anime and hub after a native sign-in
// (apis.md 3.1). The logic is shared by the three builds in lib/passport/signin.ts (rule 18, never a copy); kpop answers 404.
import { handleAfterSignin } from '@/lib/passport/signin';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleAfterSignin(request);
}
