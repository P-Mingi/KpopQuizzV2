// Run O1, lot (e), lane B7. POST /api/passport/delete (hub): "Delete my passport", apis.md 3.4. The logic is shared by the three
// builds in lib/passport/deletion/account.ts (rule 18, never a copy); kpop and anime answer 404.
import { handleDelete } from '@/lib/passport/deletion/account';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleDelete(request);
}
