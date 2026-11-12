// Bunnyverse Cards: POST /api/cards/report, "Report a photo" (plan v3: removal within 48 hours, card retired from packs). No sign-in.
// Rate limit: the existing IP-hash pattern of lib/network/beacon.ts (clientIp + ipHash with NET_IP_HASH_SALT, an in-memory counter per
// server instance, the IP is never stored). Without the salt every caller shares one bucket, so the form stays closed to floods.
// The contact is optional and kept until the report is closed, then erased by the trigger cards_report_close (decision 6).
import { clientIp, ipHash } from '@/lib/passport/ticket';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { closed, json, readJson, ownSite } from './api';
import { cardsOpen } from './flags';

import type { NextRequest, NextResponse } from 'next/server';

export const REPORT_LIMIT = 5;
export const REPORT_WINDOW_MS = 60 * 60 * 1000;
export const ROLES = ['person', 'photographer', 'agency', 'other'] as const;
export type ReportRole = (typeof ROLES)[number];

const bucket = new Map<string, { start: number; n: number }>();

/** True when this hash may still send a report at `now`. */
export function reportUnderLimit(hash: string, now: number): boolean {
  if (bucket.size > 5000) for (const [k, v] of bucket) if (now - v.start >= REPORT_WINDOW_MS) bucket.delete(k);
  const b = bucket.get(hash);
  if (!b || now - b.start >= REPORT_WINDOW_MS) {
    bucket.set(hash, { start: now, n: 1 });
    return true;
  }
  b.n += 1;
  return b.n <= REPORT_LIMIT;
}

export function resetReportLimit(): void {
  bucket.clear();
}

const posInt = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v > 0 && v < 2_000_000_000 ? v : null);

export interface ReportInput {
  photoId: number | null;
  n: number | null;
  role: ReportRole;
  message: string;
  contact: string | null;
}

/** Validates the body; null when it is not acceptable. A report must name a photo or a card. */
export function parseReport(body: Record<string, unknown>): ReportInput | null {
  const role = body.role;
  if (typeof role !== 'string' || !(ROLES as readonly string[]).includes(role)) return null;
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 1 || message.length > 2000) return null;
  const photoId = body.photoId === undefined || body.photoId === null ? null : posInt(body.photoId);
  const n = body.n === undefined || body.n === null ? null : posInt(body.n);
  if ((body.photoId !== undefined && body.photoId !== null && photoId === null) || (body.n !== undefined && body.n !== null && n === null)) return null;
  if (photoId === null && n === null) return null;
  let contact: string | null = null;
  if (body.contact !== undefined && body.contact !== null && body.contact !== '') {
    if (typeof body.contact !== 'string') return null;
    contact = body.contact.trim();
    if (contact.length > 200) return null;
    if (contact === '') contact = null;
  }
  return { photoId, n, role: role as ReportRole, message, contact };
}

export async function handleReport(req: NextRequest, now: number = Date.now()): Promise<NextResponse> {
  if (!cardsOpen()) return closed();
  if (!ownSite(req)) return json({ error: 'origin' }, 403);
  const hash = ipHash(clientIp(req.headers)) ?? 'no-salt';
  if (!reportUnderLimit(hash, now)) return json({ error: 'rate_limited' }, 429);
  const body = await readJson(req, 8192);
  const input = body ? parseReport(body) : null;
  if (!input) return json({ error: 'bad_request' }, 400);
  const db = createServiceRoleClient();
  let photoId = input.photoId;
  if (photoId === null && input.n !== null) {
    // A report on a card is filed against its photo when it has one.
    const { data } = await db.from('cards_catalog').select('photo_id').eq('card_no', input.n).maybeSingle();
    photoId = (data as { photo_id: number | null } | null)?.photo_id ?? null;
  }
  const { error } = await db.from('cards_reports').insert({
    photo_id: photoId,
    card_no: input.n,
    role: input.role,
    message: input.message,
    contact: input.contact,
  });
  if (error) return error.code === '23503' ? json({ error: 'bad_request' }, 400) : json({ error: 'server' }, 500);
  return json({ ok: true });
}
