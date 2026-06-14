import { createHash } from 'crypto';

import type { NextRequest } from 'next/server';

// Privacy-safe anonymous identity: sha256(ip + day), truncated. Same hashing as
// /api/share/click and /api/duels/vote, giving once-per-day-per-ip granularity
// with no stored PII. Used for battle challenger_hash / player_hash (anon-first).
export function anonHash(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${ip}:${day}`).digest('hex').slice(0, 16);
}
