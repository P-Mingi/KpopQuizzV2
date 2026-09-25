import { rankedRoute, requireUser } from '@/lib/ranked/http';
import { issueRun } from '@/lib/ranked/service';

// POST /api/ranked/run - start a ranked run (signed in). The server draws the 10
// songs (4 easy / 4 medium / 2 hard, 6 song + 4 artist rounds) and keeps them:
// the response carries the run token and the rules, never a song or an answer.
// 429 after 15 runs started today (UTC). Starting a run quits any open one.
// 503 {"ranked":"not_live"} until the pending migration is applied and a season
// covers now.
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  return rankedRoute('required', (ctx) => issueRun(ctx.store, requireUser(ctx), ctx.season, ctx.now));
}
