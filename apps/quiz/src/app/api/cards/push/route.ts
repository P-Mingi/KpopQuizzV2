// Bunnyverse Cards, lot 4: POST /api/cards/push { endpoint, keys: { p256dh, auth } } -> { ok } stores the browser's push subscription;
// DELETE /api/cards/push { endpoint } -> { ok } removes it. Same guard as the other write routes (hub, NET_CARDS, private launch, session, Team
// account refused, own site) plus NET_CARDS_PUSH: off, both answer the 404 of any unknown URL. The permission itself is asked by the browser on
// the player's tap (lib/cards/push-client.ts), never here.
import { closed, guard, json, readJson } from '@/lib/cards/api';
import { cardsPushOpen } from '@/lib/cards/push-flags';
import { pushEndpointOk } from '@/lib/cards/web-push';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KEY_RE = /^[A-Za-z0-9_-]{1,200}$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!cardsPushOpen()) return closed();
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const body = await readJson(req);
  const endpoint = body?.endpoint;
  const keys = body?.keys;
  if (typeof endpoint !== 'string' || !pushEndpointOk(endpoint)) return json({ error: 'bad_request' }, 400);
  const k = keys !== null && typeof keys === 'object' ? (keys as Record<string, unknown>) : {};
  const p256dh = typeof k.p256dh === 'string' && KEY_RE.test(k.p256dh) ? k.p256dh : null;
  const auth = typeof k.auth === 'string' && KEY_RE.test(k.auth) ? k.auth : null;
  const { error } = await g.db.rpc('cards_push_upsert', { p_user: g.userId, p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth, p_now: new Date().toISOString() });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (!cardsPushOpen()) return closed();
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const body = await readJson(req);
  const endpoint = body?.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return json({ error: 'bad_request' }, 400);
  const { error } = await g.db.rpc('cards_push_delete', { p_user: g.userId, p_endpoint: endpoint });
  if (error) return json({ error: 'server' }, 500);
  return json({ ok: true });
}
