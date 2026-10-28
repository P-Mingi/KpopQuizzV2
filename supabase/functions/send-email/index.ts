// Run O1, lot (e), lane B7: the Supabase Auth "Send Email" hook (docs/o1/b7/send-email-hook.md). NEVER deployed by the run:
// the owner deploys it and turns the hook on (and off) with the steps of the deploy note.
//
// The site comes from the redirect URL of the email (render.ts siteFromRedirect). anime and hub get their own branded mail;
// kpop gets the text Supabase Auth sends today. Secrets: SEND_EMAIL_HOOK_SECRET (Standard Webhooks, `v1,whsec_...`),
// RESEND_API_KEY. Optional: SEND_EMAIL_FROM_KPOP (required for kpop), SEND_EMAIL_FROM_ANIME, SEND_EMAIL_FROM_HUB,
// SEND_EMAIL_ORIGINS (staging only: `anime=https://...,hub=https://...`, bare origins like NEXT_PUBLIC_NET_ORIGINS; the hub and
// anime may share one, anime's mails then go to its /anime folder). Nothing sensitive is logged.
import { BRANDS } from './brands.ts';
import { COPY as ANIME } from './copy/anime.ts';
import { COPY as HUB } from './copy/hub.ts';
import { handleHook, parseOrigins } from './render.ts';

import type { OutgoingMail } from './render.ts';

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

async function sendWithResend(mail: OutgoingMail): Promise<boolean> {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: mail.from, to: [mail.to], subject: mail.subject, html: mail.html, ...(mail.text ? { text: mail.text } : {}) }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  const raw = await req.text();
  const from: Record<string, string> = {};
  for (const id of ['kpop', 'anime', 'hub'] as const) {
    const v = Deno.env.get(`SEND_EMAIL_FROM_${id.toUpperCase()}`);
    if (v) from[id] = v;
  }
  const result = await handleHook(
    req.method,
    {
      id: req.headers.get('webhook-id'),
      timestamp: req.headers.get('webhook-timestamp'),
      signature: req.headers.get('webhook-signature'),
    },
    raw,
    {
      brands: BRANDS,
      copies: { anime: ANIME, hub: HUB },
      env: {
        secret: Deno.env.get('SEND_EMAIL_HOOK_SECRET') ?? '',
        supabaseUrl: Deno.env.get('SUPABASE_URL') ?? '',
        origins: parseOrigins(Deno.env.get('SEND_EMAIL_ORIGINS')),
        from,
      },
      nowSec: Math.floor(Date.now() / 1000),
      send: sendWithResend,
    },
  );
  console.info(`[send-email] ${result.status}`);
  return new Response(JSON.stringify(result.body), { status: result.status, headers: { 'Content-Type': 'application/json' } });
});
