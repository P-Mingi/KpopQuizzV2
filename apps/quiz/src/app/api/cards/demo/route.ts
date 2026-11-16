// Bunnyverse Cards: POST /api/cards/demo -> { token, cards: [{ n, isNew: false }] }. The demo pack of a signed-out visitor: drawn on the
// server (rules.ts drawPack, crypto.randomInt, the catalog in packs) and signed (lib/cards/demo.ts). Nothing is stored: the cards join the
// binder only when the visitor signs in and posts the token to /api/cards/demo/claim. Same guards as the other routes (NET_CARDS, the
// private launch, the same origin). No CARDS_DEMO_SECRET: 404, no demo. A signed-in visitor opens real packs: 409 signed_in.
import { closed, json, ownSite, privateGate, sessionUserId } from '@/lib/cards/api';
import { demoSecret, signDemo } from '@/lib/cards/demo';
import { drawServerPack } from '@/lib/cards/draw';
import { cardsOpen } from '@/lib/cards/flags';

import type { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!cardsOpen()) return closed();
  const gated = await privateGate();
  if (gated) return gated;
  const secret = demoSecret();
  if (!secret) return closed();
  if (!ownSite(req)) return json({ error: 'origin' }, 403);
  if (await sessionUserId()) return json({ error: 'signed_in' }, 409);
  try {
    const cards = await drawServerPack();
    return json({ token: signDemo(cards, secret), cards: cards.map((n) => ({ n, isNew: false })) });
  } catch {
    return json({ error: 'server' }, 500);
  }
}
