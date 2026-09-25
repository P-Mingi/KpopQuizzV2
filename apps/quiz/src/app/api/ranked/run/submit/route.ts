import { rankedRoute, readJson, requireUser, tokenOf } from '@/lib/ranked/http';
import { submitRun } from '@/lib/ranked/service';

// POST /api/ranked/run/submit {token} - close the run. The server recomputes every
// point from the answers it locked; all 10 answered = submitted, anything less =
// quit, recorded with the songs answered. Returns the result and the season
// impact (before / after score, tier, promotion, replaced run, ladder move).
// A token closes once: a second submit is refused (409 run_finished).
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  return rankedRoute('required', async (ctx) => {
    const body = await readJson(req);
    return submitRun(ctx.store, requireUser(ctx), tokenOf(body), ctx.now);
  });
}
