// Bunnyverse Cards: GET /api/cards/state (docs/o1/briefs/CARDS-CONTRACT.md section 3). Hub build with NET_CARDS only (else 404), signed in (401),
// not a Team account (403). The wallet after the refill and the Paris midnight, read only, and the binder.
import { guard, json, loadState } from '@/lib/cards/api';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: false });
  if (!g.ok) return g.res;
  try {
    return json(await loadState(g.db, g.userId));
  } catch {
    return json({ error: 'server' }, 500);
  }
}
