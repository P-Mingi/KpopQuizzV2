import { postOnly, rankedRoute, readJson, requireUser, roundOf, tokenOf } from '@/lib/ranked/http';
import { releaseRound } from '@/lib/ranked/service';

// POST /api/ranked/run/start {token, round} - release one round (the clip, the
// question and its 4 options) and stamp the server clip start. Rounds are
// released once each, in order; the answer to the previous one must be locked.
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  return rankedRoute('required', async (ctx) => {
    const body = await readJson(req);
    return releaseRound(ctx.store, requireUser(ctx), tokenOf(body), roundOf(body), ctx.now);
  });
}

/** GET: 404 with the flag off (the path does not exist today), 405 with it on. */
export function GET(): Response {
  return postOnly();
}
