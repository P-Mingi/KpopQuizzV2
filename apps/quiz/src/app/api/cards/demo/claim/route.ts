// Bunnyverse Cards: POST /api/cards/demo/claim { token, device } -> { added: [{ n, isNew }], state }. After sign in, the browser posts the
// token of its demo pack once; the server checks the signature and the age, hashes the device id and the address (salted, never stored in
// the clear) and calls cards_demo_claim (106-demo.sql): one claim per token, 1 a day per device, 3 a day per network. Team accounts get the
// 403 of every Cards route. Same guards as the others: NET_CARDS, the private launch, a session, the same origin.
import { guard, json, loadState, readJson } from '@/lib/cards/api';
import { DEVICE_RE, clientIp, demoSecret, hashDemo, verifyDemo } from '@/lib/cards/demo';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REFUSED: Record<string, [string, number]> = {
  demo_used: ['used', 409], demo_device: ['limit', 429], demo_ip: ['limit', 429], pack: ['pack', 409],
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const g = await guard(req, { write: true });
  if (!g.ok) return g.res;
  const secret = demoSecret();
  if (!secret) return json({ error: 'not_found' }, 404);
  const body = await readJson(req);
  const device = body?.device;
  if (typeof device !== 'string' || !DEVICE_RE.test(device)) return json({ error: 'bad_request' }, 400);
  const p = verifyDemo(body?.token, secret);
  if (!p) return json({ error: 'token' }, 400);
  const { data, error } = await g.db.rpc('cards_demo_claim', {
    p_user: g.userId,
    p_jti: p.jti,
    p_cards: p.cards,
    p_device: hashDemo('device', device, secret),
    p_ip: hashDemo('ip', clientIp(req.headers), secret),
    p_now: new Date().toISOString(),
  });
  if (error || !data) {
    const m = /cards: (\w+)/.exec(error?.message ?? '');
    const why = m ? REFUSED[m[1]!] : undefined;
    return why ? json({ error: why[0] }, why[1]) : json({ error: 'server' }, 500);
  }
  try {
    const added = (data as { cards: { n: number; isNew: boolean }[] }).cards.map((c) => ({ n: c.n, isNew: c.isNew }));
    return json({ added, state: await loadState(g.db, g.userId) });
  } catch {
    return json({ error: 'server' }, 500);
  }
}
