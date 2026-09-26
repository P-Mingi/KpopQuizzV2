import { choiceOf, clientMsOf, postOnly, rankedRoute, readJson, requireUser, roundOf, tokenOf } from '@/lib/ranked/http';
import { lockAnswer } from '@/lib/ranked/service';

// POST /api/ranked/run/answer {token, round, choice (0-3 or null = time up),
// clientMs} - lock the answer of the open round and reveal it. The server checks
// the client time against its own clock (impossible timings are refused with 422)
// and scores the round itself; the reveal carries the song and the points.
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  return rankedRoute('required', async (ctx) => {
    const body = await readJson(req);
    return lockAnswer(ctx.store, requireUser(ctx), tokenOf(body), roundOf(body), choiceOf(body), clientMsOf(body), ctx.now);
  });
}

/** GET: 404 with the flag off (the path does not exist today), 405 with it on. */
export function GET(): Response {
  return postOnly();
}
