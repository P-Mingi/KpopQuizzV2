import { rankedRoute } from '@/lib/ranked/http';
import { ladderView, RankedRequestError } from '@/lib/ranked/service';
import { LADDER_SCOPES } from '@/lib/ranked/view';

import type { NextRequest } from 'next/server';
import type { LadderScope } from '@/lib/ranked/view';

// GET /api/ranked/ladder?scope=global|fandom|following - the season ladder: the top 8
// of the scope plus your own row (signed in and placed). Guests get Global only;
// "My fandom" needs a main fandom in Settings. Rows carry what /u/[username] already
// shows (name, avatar, name flair), never a user id. Read only; 503 not_live until the
// pending migration is applied and a season covers now.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  return rankedRoute('optional', (ctx) => {
    const raw = req.nextUrl.searchParams.get('scope') ?? 'global';
    if (!(LADDER_SCOPES as readonly string[]).includes(raw)) throw new RankedRequestError(400, 'invalid_scope');
    return ladderView(ctx.store, ctx.season, raw as LadderScope, ctx.userId);
  });
}
