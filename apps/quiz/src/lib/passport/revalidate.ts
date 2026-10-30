// Run O1, lot (e), lane B7: POST /api/passport/revalidate (apis.md 3.3) and the sender that calls it. The route file is a one-line
// wrapper (rule 18: the three builds share this code). Server to server: the site where a change happened posts to every site of the
// member (itself included) with an HMAC of the raw body, and never waits for it in a user request.
//
//   header  x-passport-signature: b64u(HMAC-SHA256(PASSPORT_REVALIDATE_SECRET, "pp-revalidate.v1." + raw body))
//   answers 403 origin (rule 1.1.3, an Origin header that is not this site's) | 401 signature | 400 bad_request | 204
//
// A replay only purges a cache again; no timestamp is part of the body (BACKLOG 5.1 freezes it).

import { createHmac } from 'node:crypto';

import { revalidatePath } from 'next/cache';

import { siteBase } from '@/lib/auth/site-base';
import { REGISTRY, SITE_ID } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import { isJson, json, log, noContent, originOk, parseObject } from './api-util';
import { b64u, MIN_SECRET_LENGTH, safeEqual } from './ticket';
import { MAC_LABELS, REVALIDATE_HEADER } from './types';

import type { NextRequest, NextResponse } from 'next/server';
import type { NetOriginEnv } from '@/lib/site/registry';
import type { SiteId } from '@/lib/site/types';
import type { RevalidateRequest } from './types';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const BODY_LIMIT = 4096;
const SEND_TIMEOUT_MS = 3000;

type RevalidateEnv = NetOriginEnv & { readonly PASSPORT_REVALIDATE_SECRET?: string | undefined };

export interface RevalidateCtx {
  readonly site?: SiteId;
  readonly env?: RevalidateEnv;
  /** The cache purge; revalidatePath by default. */
  readonly purge?: (path: string) => void;
}

/** PASSPORT_REVALIDATE_SECRET, or null when unset or too short. */
export function revalidateSecret(env: RevalidateEnv = process.env as RevalidateEnv): string | null {
  const s = env.PASSPORT_REVALIDATE_SECRET?.trim() ?? '';
  return s.length >= MIN_SECRET_LENGTH ? s : null;
}

/** b64u(HMAC(secret, "pp-revalidate.v1." + raw)). */
export function signRevalidate(secret: string, raw: string): string {
  return b64u(createHmac('sha256', secret).update(MAC_LABELS.revalidate + raw).digest());
}

/** The paths one site purges for a username: the public path and the internal path the rewrite serves on anime and hub. */
export function purgePaths(site: SiteId, username: string): string[] {
  const pub = `/u/${username}`;
  return site === 'kpop' ? [pub] : [pub, `/sites/${site}${pub}`];
}

function parseRequest(raw: string): RevalidateRequest | null {
  const o = parseObject(raw);
  if (!o) return null;
  const { username, sites } = o;
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) return null;
  if (!Array.isArray(sites) || sites.length === 0 || sites.length > SITE_IDS.length) return null;
  if (!sites.every((s): s is SiteId => typeof s === 'string' && (SITE_IDS as readonly string[]).includes(s))) return null;
  return { username, sites };
}

export async function handleRevalidate(request: NextRequest, ctx: RevalidateCtx = {}): Promise<NextResponse> {
  const site = ctx.site ?? SITE_ID;
  const env = ctx.env ?? (process.env as RevalidateEnv);
  if (!originOk(request, site, env)) return json(403, { error: 'origin' });
  const secret = revalidateSecret(env);
  const raw = await request.text();
  const signature = request.headers.get(REVALIDATE_HEADER);
  if (!secret || !signature || raw.length > BODY_LIMIT || !safeEqual(signature, signRevalidate(secret, raw))) {
    log('revalidate', 'signature', site);
    return json(401, { error: 'signature' });
  }
  const body = isJson(request) ? parseRequest(raw) : null;
  if (!body) {
    log('revalidate', 'bad_request', site);
    return json(400, { error: 'bad_request' });
  }
  if (!body.sites.includes(site)) return noContent();
  const purge = ctx.purge ?? ((path: string) => revalidatePath(path));
  for (const path of purgePaths(site, body.username)) {
    try {
      purge(path);
    } catch {
      // a path the build does not know is not an error
    }
  }
  log('revalidate', 'ok', site);
  return noContent();
}

export interface NotifyCtx {
  readonly env?: RevalidateEnv;
  readonly fetchImpl?: typeof fetch;
}

/**
 * Posts the signed purge to every site of `sites` (this one included), each with a 3 s timeout, concurrently. Resolves when all have
 * answered or timed out; callers in a user request do NOT await it (`void notifyRevalidate(...)`). Never throws, logs counts only.
 */
export async function notifyRevalidate(username: string, sites: readonly SiteId[], ctx: NotifyCtx = {}): Promise<{ sent: number; failed: number }> {
  const env = ctx.env ?? (process.env as RevalidateEnv);
  const secret = revalidateSecret(env);
  if (!secret || !USERNAME_RE.test(username)) return { sent: 0, failed: 0 };
  const doFetch = ctx.fetchImpl ?? fetch;
  const unique = [...new Set(sites)].filter((s) => REGISTRY[s] !== undefined);
  const body = JSON.stringify({ username, sites: unique });
  const signature = signRevalidate(secret, body);
  const results = await Promise.all(
    unique.map(async (s) => {
      try {
        // Bunnyverse: the site's base (origin and basePath), so anime is reached at https://bunnyverse.org/anime/api/...
        const res = await doFetch(`${siteBase(s, env)}/api/passport/revalidate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', [REVALIDATE_HEADER]: signature },
          body,
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        });
        return res.status === 204;
      } catch {
        return false;
      }
    }),
  );
  const sent = results.filter(Boolean).length;
  return { sent, failed: results.length - sent };
}

