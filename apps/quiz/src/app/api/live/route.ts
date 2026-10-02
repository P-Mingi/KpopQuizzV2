import { liveDeps, liveGate, liveJson } from '@/lib/live/server';
import { liveStatus } from '@/lib/live/service';

import type { NextResponse } from 'next/server';

// GET /api/live: is the live blindtest open? 200 { ok, max } once
// docs/pending-migrations/v12-g4-live.sql is applied, 503 { error: 'not_live' }
// before (the pages then say the mode is not open yet), 404 with the v12 flag off.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const off = liveGate();
  if (off) return off;
  return liveJson(await liveStatus(liveDeps()));
}
