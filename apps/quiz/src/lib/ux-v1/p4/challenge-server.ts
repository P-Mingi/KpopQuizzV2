// Server-only helpers for quiz challenges (see ./challenge.ts). The `battles` table
// accepts public inserts (migration 073 RLS), so a row alone proves nothing about who
// made it. Every challenge link this app hands out therefore carries a signature of
// the row id (HMAC-SHA256, key derived from a server-only secret, never sent to a
// client). A row made by anything else has no valid signature and is not treated as
// a challenge: no name shown, no score to beat, nothing to play.

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type { NextRequest } from 'next/server';

function key(): string | null {
  const secret = process.env.UX_P4_CHALLENGE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret ? `ux-p4-challenge:v1:${secret}` : null;
}

/** 16 hex chars of HMAC(id). Null when the server has no secret (then links are not issued). */
export function signChallenge(id: string): string | null {
  const k = key();
  return k ? createHmac('sha256', k).update(id.toLowerCase()).digest('hex').slice(0, 16) : null;
}

export function verifyChallenge(id: string, sig: string | null | undefined): boolean {
  const want = signChallenge(id);
  if (!want || typeof sig !== 'string' || sig.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(want), Buffer.from(sig.toLowerCase()));
}

/** Guest identity for challenger_hash / player_hash: sha256(ip + day), the existing
 *  lib/anon-hash.ts rule (no stored PII). Signed-in callers use `user:<id>`. */
export function guestHash(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}:${day}`).digest('hex').slice(0, 16);
}

/** Tiny in-memory guard (same idea as claim-runs): a browser has no reason to make
 *  more than a few challenges a minute. Bounded, per instance, not accounting. */
const hits = new Map<string, number[]>();
export function underLimit(k: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const list = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(k, list);
  if (hits.size > 5000) hits.clear();
  return list.length <= max;
}
