// Run O1, lot (e), lane B7: the rules every JSON route of apis.md 1.1 shares (headers, Origin, 2 KB body, JSON only), for the
// account routes (delete, cancel, leave) and the revalidate route. Never logged: an address, a token, a signature.

import { NextResponse, after } from 'next/server';

import { siteOrigin } from '@/lib/auth/site-base';

import type { NextRequest } from 'next/server';
import type { NetOriginEnv } from '@/lib/site/registry';
import type { SiteId } from '@/lib/site/types';

export const BODY_MAX_BYTES = 2048;

/** apis.md 1.1.2: no-store and no-referrer on every /api/passport/* answer. */
export function harden<R extends Response>(res: R): R {
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}

export function notFound(): NextResponse {
  return harden(new NextResponse(null, { status: 404 }));
}

export function json(status: number, body: Record<string, unknown>): NextResponse {
  return harden(NextResponse.json(body, { status }));
}

export function noContent(): NextResponse {
  return harden(new NextResponse(null, { status: 204 }));
}

export function log(route: string, outcome: string, site: SiteId): void {
  console.info(`[passport] ${route} ${outcome} ${site}`);
}

/**
 * apis.md 1.1.3: an Origin header that is present must be this site's own origin, exactly. FandomVerse: the origin of the
 * site's base (the anime base https://fandomverse.org/anime has a path, an Origin never does), so hub and anime, one origin,
 * accept each other's same-origin calls and nothing else.
 */
export function originOk(request: NextRequest, site: SiteId, env: NetOriginEnv): boolean {
  const origin = request.headers.get('origin');
  return origin === null || origin === siteOrigin(site, env);
}

/** apis.md 1.1.3: application/json only. */
export function isJson(request: NextRequest): boolean {
  return (request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');
}

/** The raw text of a body of at most 2 KB, or null when it is longer. */
export function boundedText(text: string): string | null {
  return Buffer.byteLength(text, 'utf8') > BODY_MAX_BYTES ? null : text;
}

/** An object parsed from JSON text, or null. */
export function parseObject(text: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(text);
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Work that must not hold a user request up (apis.md 3.3: the purge is never waited for): `after()` when there is a request scope,
 * else a plain detached promise (unit tests, scripts). A failure of `fn` is swallowed: it is only a courtesy.
 */
export function defer(fn: () => Promise<unknown>): void {
  const run = (): Promise<void> => fn().then(() => undefined, () => undefined);
  try {
    after(run);
  } catch {
    void run();
  }
}
