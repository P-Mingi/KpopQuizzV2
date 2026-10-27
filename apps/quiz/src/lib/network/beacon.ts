// Run O1, lot (c), lane B6: POST /api/n/b (apis.md 4.2), the same handler on every site. Body NetBeacon {dst, bridge, step}
// as JSON or as the text body of navigator.sendBeacon, 2 KB at most. Always 204 except 400 bad_request and 403 origin
// (the Origin is not a site of the network). With NEXT_PUBLIC_NET_BEACON off, without NET_IP_HASH_SALT, or over the per-IP-hash
// limit, nothing is counted. Otherwise net_bridge_bump(src, dst, bridge, step, signed_in) with the row (SITE.id, dst), or
// (dst, SITE.id) for a `land`. No user id, anonymous id or IP is stored: the IP only feeds an in-memory counter, as a hash.
import { NextResponse } from 'next/server';

import { clientIp, ipHash } from '@/lib/passport/ticket';
import { SITE_ID, flagOn, isSiteId, siteForOrigin } from '@/lib/site/registry';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import { NET_BEACON_STEPS, NET_LINK_IDS } from './types';

import type { NextRequest } from 'next/server';
import type { SiteId } from '@/lib/site/types';
import type { PassportEnv } from '@/lib/passport/ticket';
import type { NetBeacon, NetBeaconStep, NetBridgeId } from './types';

export const BEACON_MAX_BYTES = 2048;
/** Counted beacons per IP hash and window (a page view sends a handful). */
export const BEACON_LIMIT = 60;
export const BEACON_WINDOW_MS = 60_000;

const bucket = new Map<string, { start: number; n: number }>();

/** True when this hash may still count at `now`. Best effort per server instance. */
export function underLimit(hash: string, now: number): boolean {
  if (bucket.size > 5000) for (const [k, v] of bucket) if (now - v.start >= BEACON_WINDOW_MS) bucket.delete(k);
  const b = bucket.get(hash);
  if (!b || now - b.start >= BEACON_WINDOW_MS) {
    bucket.set(hash, { start: now, n: 1 });
    return true;
  }
  b.n += 1;
  return b.n <= BEACON_LIMIT;
}

export function resetBeaconLimit(): void {
  bucket.clear();
}

/** The pieces a test replaces. */
export interface BeaconCtx {
  readonly site?: SiteId;
  readonly env?: PassportEnv & { NEXT_PUBLIC_NET_BEACON?: string | undefined; NEXT_PUBLIC_NET_ORIGINS?: string | undefined; VERCEL_ENV?: string | undefined };
  readonly now?: () => number;
  readonly signedIn?: (request: NextRequest) => Promise<boolean>;
  readonly bump?: (args: { p_src: SiteId; p_dst: SiteId; p_bridge: NetBridgeId; p_step: NetBeaconStep; p_signed_in: boolean; p_n: number }) => Promise<void>;
}

const noContent = (): NextResponse => new NextResponse(null, { status: 204 });
const bad = (error: 'bad_request' | 'origin', status: 400 | 403): NextResponse => NextResponse.json({ error }, { status });

/** The Origin of the request, else the origin of its Referer. */
function originOf(request: NextRequest): string | null {
  const o = request.headers.get('origin');
  if (o && o !== 'null') return o;
  const ref = request.headers.get('referer');
  if (!ref) return null;
  try {
    return new URL(ref).origin;
  } catch {
    return null;
  }
}

/** At most BEACON_MAX_BYTES of the body as text, or null when it is longer. */
async function readBody(request: NextRequest): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > BEACON_MAX_BYTES) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > BEACON_MAX_BYTES) {
      void reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

/** The beacon of a body, or null when it is not a valid NetBeacon. `dst` is never the site itself. */
export function parseBeacon(text: string, site: SiteId): NetBeacon | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const { dst, bridge, step } = v as Record<string, unknown>;
  if (!isSiteId(dst) || dst === site) return null;
  if (typeof bridge !== 'string' || !(NET_LINK_IDS as readonly string[]).includes(bridge)) return null;
  if (typeof step !== 'string' || !(NET_BEACON_STEPS as readonly string[]).includes(step)) return null;
  return { dst, bridge: bridge as NetBridgeId, step: step as NetBeaconStep };
}

async function defaultSignedIn(request: NextRequest): Promise<boolean> {
  // No Supabase auth cookie, no session: skip the auth round trip.
  if (!request.cookies.getAll().some((c) => /^sb-[a-z0-9-]+-auth-token/i.test(c.name))) return false;
  try {
    const { data } = await (await createServerClient()).auth.getUser();
    return Boolean(data.user);
  } catch {
    return false;
  }
}

export async function handleBeacon(request: NextRequest, ctx: BeaconCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  const env = ctx.env ?? process.env;

  const origin = originOf(request);
  if (origin === null || siteForOrigin(origin, { NEXT_PUBLIC_NET_ORIGINS: env.NEXT_PUBLIC_NET_ORIGINS, VERCEL_ENV: env.VERCEL_ENV }) === null) {
    return bad('origin', 403);
  }
  const text = await readBody(request);
  if (text === null) return bad('bad_request', 400);
  const beacon = parseBeacon(text, site);
  if (beacon === null) return bad('bad_request', 400);

  // From here on nothing is ever an error to the browser.
  if (!flagOn(env.NEXT_PUBLIC_NET_BEACON)) return noContent();
  const hash = ipHash(clientIp(request.headers), env) ?? (env.NET_IP_HASH_SALT?.trim() ? ipHash('no-address', env) : null);
  if (hash === null) return noContent(); // without the salt nothing is counted
  const now = ctx.now ? ctx.now() : Date.now();
  if (!underLimit(hash, now)) return noContent();

  try {
    const signedIn = await (ctx.signedIn ?? defaultSignedIn)(request);
    const land = beacon.step === 'land';
    const args = {
      p_src: land ? beacon.dst : site,
      p_dst: land ? site : beacon.dst,
      p_bridge: beacon.bridge,
      p_step: beacon.step,
      p_signed_in: signedIn,
      p_n: 1,
    } as const;
    if (ctx.bump) await ctx.bump(args);
    else await createServiceRoleClient().rpc('net_bridge_bump', args);
  } catch {
    // a failed count is not the browser's problem
  }
  return noContent();
}
