// Run O1, lot (e), lane B7. POST /api/passport/delete (hub): "Delete my passport", apis.md 3.4. The logic is shared by the three
// builds in lib/passport/deletion/account.ts (rule 18, never a copy); anime answers 404, and so does kpop unless NEXT_PUBLIC_NET_DELETION
// is on (owner decision of 2026-10-24: kpopquiz.org Settings > "Delete account" starts the same deletion). GET answers whether one is pending.
import { handleDelete, handleDeletionStatus } from '@/lib/passport/deletion/account';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleDelete(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleDeletionStatus(request);
}
