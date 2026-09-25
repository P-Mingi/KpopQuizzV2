import { rankedRoute } from '@/lib/ranked/http';
import { seasonCard } from '@/lib/ranked/service';

// GET /api/ranked/me - the season card. Guests get the season only; a signed-in
// player also gets score, tier + division, points to the next step, best 5 runs,
// the score to beat, placement, runs left today and ladder position. Read only.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return rankedRoute('optional', (ctx) => seasonCard(ctx.store, ctx.userId, ctx.season, ctx.now));
}
