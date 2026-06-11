import { getRankingsIndex } from '@/lib/db/queries/duels';
import { NextResponse } from 'next/server';

/**
 * GET /api/rankings/index
 *
 * Lists every duel question for the rankings index page (total real votes, the
 * public flag, top entity). Thin wrapper over the shared getRankingsIndex query
 * (also used by the SSR /rankings page).
 */
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const rankings = await getRankingsIndex();
  return NextResponse.json({ count: rankings.length, rankings });
}
