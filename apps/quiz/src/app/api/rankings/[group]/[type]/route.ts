import { getRanking } from '@/lib/db/queries/duels';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * GET /api/rankings/{group}/{type}
 *
 * Full ranking for a question (entities Elo desc, total real votes, public flag).
 * Thin wrapper over the shared getRanking query (also used by the SSR
 * /rankings/{group}/{type} page).
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ group: string; type: string }> },
): Promise<NextResponse> {
  const { group, type } = await params;
  const ranking = await getRanking(group, type);
  if (!ranking) {
    return NextResponse.json({ error: 'No such ranking' }, { status: 404 });
  }
  return NextResponse.json(ranking);
}
