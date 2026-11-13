// KpopCards: GET /api/cards/idol/<slug> -> IdolPage. Locked until the player owns a card of the idol; then the editions and the quizzes on kpopquiz.org.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = (req: NextRequest, ctx: { params: Promise<{ slug: string }> }): Promise<NextResponse> =>
  run(req, { write: false }, async (c) => {
    const { slug } = await ctx.params;
    return /^[a-z0-9-]{1,100}$/.test(slug) ? srv.idol(c, slug) : { error: 'idol_unknown' as const };
  });
