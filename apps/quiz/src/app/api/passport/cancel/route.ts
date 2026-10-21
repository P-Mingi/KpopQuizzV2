// Run O1, lot (e), lane B7. POST /api/passport/cancel (hub): cancels a pending deletion, apis.md 3.5. The logic is shared by the
// three builds in lib/passport/deletion/account.ts (rule 18, never a copy); kpop and anime answer 404.
import { handleCancel } from '@/lib/passport/deletion/account';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleCancel(request);
}
