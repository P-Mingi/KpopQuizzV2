// Bunnyverse Cards, lot 4 (the "Notify me" of the packs page): the push switches, off by default.
//   NET_CARDS_PUSH                  server, hub    /api/cards/push and /api/cron/cards-push (off: both answer 404)
//   NEXT_PUBLIC_NET_CARDS_PUSH      public, hub    the Notify me button (inlined at build; off: it is not drawn)
//   CARDS_VAPID_PUBLIC_KEY          server         the application server key (base64url, 65 bytes)
//   NEXT_PUBLIC_CARDS_VAPID_PUBLIC_KEY  public     the same key, for the browser's subscribe call
//   CARDS_VAPID_PRIVATE_KEY         server         the private scalar (base64url, 32 bytes), never shown or logged
//   CARDS_VAPID_SUBJECT             server         a mailto: or https: address of the sender (RFC 8292)
// Everything also needs Cards open (NET_CARDS on the hub build) and stays behind the private launch (lib/cards/api.ts guard).
import { flagOn, SITE_ID } from '@/lib/site/registry';

import { cardsOpen } from './flags';

import type { SiteId } from '@/lib/site/types';

interface Env {
  readonly NET_CARDS?: string | undefined;
  readonly NET_CARDS_PUSH?: string | undefined;
  readonly NEXT_PUBLIC_NET_CARDS_PUSH?: string | undefined;
}

export interface PushFlagCtx {
  readonly site?: SiteId;
  readonly env?: Env;
}

/** The guard of the push routes: the hub build with NET_CARDS and NET_CARDS_PUSH on. */
export function cardsPushOpen(ctx?: PushFlagCtx): boolean {
  if (ctx?.env) return (ctx.site ?? SITE_ID) === 'hub' && flagOn(ctx.env.NET_CARDS) && flagOn(ctx.env.NET_CARDS_PUSH);
  return cardsOpen(ctx?.site ? { site: ctx.site } : undefined) && flagOn(process.env.NET_CARDS_PUSH);
}

/** The public half (the button): the hub build with NEXT_PUBLIC_NET_CARDS_PUSH on. Written out in full so Next inlines it. */
export function cardsPushPublicOn(ctx?: PushFlagCtx): boolean {
  const raw = ctx?.env ? ctx.env.NEXT_PUBLIC_NET_CARDS_PUSH : process.env.NEXT_PUBLIC_NET_CARDS_PUSH;
  return (ctx?.site ?? SITE_ID) === 'hub' && flagOn(raw);
}
