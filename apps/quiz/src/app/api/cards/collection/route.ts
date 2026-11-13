// KpopCards: GET /api/cards/collection?group&q&kind&rar&show&sort&page&per -> CollectionState.
import { run } from '@/lib/kpopcards/route';
import * as srv from '@/lib/kpopcards/server';

import type { NextRequest, NextResponse } from 'next/server';
import type { CollectionQuery, Edition } from '@/lib/kpopcards/contract';

export const dynamic = 'force-dynamic';

const EDITIONS = new Set(['std', 'stage', 'holo', 'era', 'gold', 'full']);

export const GET = (req: NextRequest): Promise<NextResponse> =>
  run(req, { write: false }, (c, i) => {
    const sp = i.url.searchParams;
    const q: CollectionQuery = {};
    const group = sp.get('group');
    if (group && /^[a-z0-9-]{1,80}$/.test(group)) q.group = group;
    const text = sp.get('q');
    if (text) q.q = text.slice(0, 60);
    const kind = sp.get('kind');
    if (kind === 'idol' || kind === 'group' || kind === 'all') q.kind = kind;
    const rar = sp.getAll('rar').flatMap((x) => x.split(',')).filter((x) => EDITIONS.has(x));
    if (rar.length > 0) q.rar = rar as Edition[];
    const show = sp.get('show');
    if (show === 'owned' || show === 'missing' || show === 'fav' || show === 'want' || show === 'all') q.show = show;
    const sort = sp.get('sort');
    if (sort === 'rarity' || sort === 'number' || sort === 'newest') q.sort = sort;
    const page = Number(sp.get('page'));
    if (Number.isInteger(page) && page >= 1 && page <= 10_000) q.page = page;
    const per = Number(sp.get('per'));
    if (Number.isInteger(per) && per >= 1) q.per = Math.min(120, per);
    return srv.collection(c, q);
  });
