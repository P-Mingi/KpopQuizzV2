// Run O1, lot (c), lane B6. GET /api/n/me (apis.md 4.1): the signed-in viewer's own network state. The logic is shared by the
// three builds in lib/network/me.ts (rule 18, never a copy).
import { handleMe } from '@/lib/network/me';

import type { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  return handleMe();
}
