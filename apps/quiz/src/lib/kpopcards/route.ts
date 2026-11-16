// KpopCards: the one wrapper of every /api/cards/* route of lots 3 to 5. The order of the guards: the build and the flag (404), the private launch
// (404), the session (401), a Team account (403), a same-origin write (403), the rate limit (429), the body (400), then the handler. Answers are
// `cache-control: no-store`. A handler returns the answer or an ApiError, mapped to ERROR_STATUS.
import { guard, json, readJson } from '@/lib/cards/api';

import { ERROR_STATUS, isApiError } from './contract';
import { allow } from './rate-limit';
import { serverRng } from './server';

import type { NextRequest, NextResponse } from 'next/server';
import type { ApiError } from './contract';
import type { Ctx } from './server';

export const IDEM_HEADER = 'idempotency-key';

export interface RouteOpts {
  write: boolean;
  /** The rate-limit bucket of a write (default 'write'). */
  bucket?: string;
  /** The body must carry an idempotency key (header or body.key). */
  key?: boolean;
}

export interface RouteIn { body: Record<string, unknown>; key: string | null; url: URL }

const UUIDISH = /^[0-9a-f-]{8,64}$/i;

export function errorResponse(e: ApiError): NextResponse {
  return json(e, ERROR_STATUS[e.error]);
}

export async function run(req: NextRequest, opts: RouteOpts, fn: (c: Ctx, i: RouteIn) => unknown): Promise<NextResponse> {
  const g = await guard(req, { write: opts.write });
  if (!g.ok) return g.res;
  const now = Date.now();
  if (opts.write && !allow(g.userId, opts.bucket ?? 'write', now)) return errorResponse({ error: 'rate_limited' });
  let body: Record<string, unknown> = {};
  if (opts.write) {
    const b = await readJson(req);
    if (b === null) {
      const len = req.headers.get('content-length');
      if (len !== null && len !== '0') return errorResponse({ error: 'bad_request' });
    } else body = b;
  }
  let key: string | null = null;
  if (opts.key) {
    const raw = req.headers.get(IDEM_HEADER) ?? (typeof body.key === 'string' ? body.key : null);
    if (!raw || !UUIDISH.test(raw)) return errorResponse({ error: 'idem_missing' });
    key = raw.toLowerCase();
  }
  try {
    const out = await Promise.resolve(fn({ db: g.db, userId: g.userId, now, rng: serverRng }, { body, key, url: new URL(req.url) }));
    if (isApiError(out)) return errorResponse(out);
    return json(out);
  } catch {
    return errorResponse({ error: 'server' });
  }
}

/** A positive integer card number, or null. */
export const cardNo = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 2_000_000_000 ? v : null);
