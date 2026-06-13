// Discord interactions endpoint (Path B). Set this URL as the app's
// "Interactions Endpoint URL" in the Developer Portal. Handles role menus +
// the in-Discord quiz with no always-on bot. Runs on the Node runtime (Ed25519
// verification uses node:crypto).

import { verifyDiscordRequest } from '@/lib/discord/verify';
import { handleInteraction } from '@/lib/discord/handlers';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  const signature = req.headers.get('x-signature-ed25519') ?? '';
  const timestamp = req.headers.get('x-signature-timestamp') ?? '';
  const rawBody = await req.text();

  if (!verifyDiscordRequest(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY ?? '')) {
    return new Response('invalid request signature', { status: 401 });
  }

  const interaction = JSON.parse(rawBody);
  if (interaction.type === 1) return Response.json({ type: 1 }); // PING -> PONG

  try {
    return Response.json(await handleInteraction(interaction));
  } catch (e) {
    console.error('[discord interaction]', e);
    return Response.json({ type: 4, data: { content: 'Something went wrong. Try again.', flags: 1 << 6 } });
  }
}
