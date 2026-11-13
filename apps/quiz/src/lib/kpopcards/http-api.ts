// KpopCards: the real client of the contract (contract.ts KpopCardsApi): one fetch per ROUTES entry, same-origin, no cache. A write that carries an idempotency
// key sends it in the body (`key`) as the contract says. Every answer is the contract's type or { error: ErrorCode }; a dropped connection is { error: 'server' }.
import { withBasePath } from '@/lib/site/base-path';

import { ROUTES } from './contract';

import type { ApiResult, KpopCardsApi } from './contract';

type Route = (typeof ROUTES)[keyof typeof ROUTES];

async function call<T>(route: Route, params: Record<string, string | undefined> = {}, body?: unknown, query?: Record<string, string | string[] | number | undefined>): Promise<ApiResult<T>> {
  let path: string = route.path;
  for (const [k, v] of Object.entries(params)) path = path.replace(`{${k}}`, encodeURIComponent(v ?? ''));
  if (query) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, String(x));
    if (q.size) path += `?${q.toString()}`;
  }
  try {
    const init: RequestInit = { method: route.method, cache: 'no-store', credentials: 'same-origin' };
    if (route.method === 'POST') Object.assign(init, { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) });
    const res = await fetch(withBasePath(path), init);
    const j = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !j) return { error: ((j?.error as never) ?? (res.status === 401 ? 'unauthorized' : res.status === 404 ? 'not_found' : 'server')) };
    return j;
  } catch {
    return { error: 'server' };
  }
}

export function createHttpApi(): KpopCardsApi {
  const R = ROUTES;
  return {
    state: () => call(R.state),
    open: (req) => call(R.open, {}, req),
    collection: (q) => call(R.collection, {}, undefined, q as Record<string, string | string[] | number | undefined> | undefined),
    almost: (limit) => call(R.almost, {}, undefined, { limit }),
    missions: () => call(R.missions),
    claim: (req) => call(R.claim, {}, req),
    level: () => call(R.level),
    ranking: (scope = 'friends') => call(R.ranking, {}, undefined, { scope }),
    player: (nickname) => call(R.player, { nickname }),
    friends: () => call(R.friends),
    friendCode: () => call(R.friendCode),
    friendRedeem: (req) => call(R.friendRedeem, {}, req),
    friendRemove: (req) => call(R.friendRemove, {}, req),
    idol: (slug) => call(R.idol, { slug }),
    odds: () => call(R.odds),
    card: (n) => call(R.card, { n }),
    prefs: (req) => call(R.prefs, {}, req),
    lock: (req) => call(R.lock, {}, req),
    wish: (req) => call(R.wish, {}, req),
    favorite: (req) => call(R.favorite, {}, req),
    seen: (req) => call(R.seen, {}, req),
    recyclePreview: () => call(R.recyclePreview),
    recycle: (req) => call(R.recycle, {}, req),
    craft: (req) => call(R.craft, {}, req),
    adTicket: () => call(R.adTicket),
    adGrant: (req) => call(R.adGrant, {}, req),
    demoDraw: () => call(R.demoDraw),
    demoClaim: (req) => call(R.demoClaim, {}, req),
    stillThere: () => call(R.stillThere),
    help: () => call(R.help),
  };
}
