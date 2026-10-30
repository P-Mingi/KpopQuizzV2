// ADMIN-1 (owner, 2026-10-30): the one route of the two MFA pages (lib/admin/guard.ts ADMIN_MFA_DIR). POST JSON, same origin:
//   { action: 'verify', code }               aal1 with a verified factor: the 6 digits lift the session to aal2
//   { action: 'start' }                      aal1 with no factor: a new TOTP factor, its QR code and its secret
//   { action: 'confirm', factorId, code }    aal1 with no factor: the first code verifies the new factor (aal2)
// Only a listed admin whose session the auth server verifies reaches a step (requireAdmin('mfa')); everyone else, any other
// method, a request from another site and an unknown action get the admin 404. The new session cookies (aal2) are written on
// this answer by the server client.
import { NextResponse } from 'next/server';

import { ADMIN_RESPONSE_HEADERS, adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { confirmSetup, startSetup, verifyCode } from '@/lib/admin/mfa';
import { sameOrigin } from '@/lib/entity-images/route-kit';
import { SITE } from '@/lib/site/registry';

import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const answer = (body: object, status = 200): NextResponse => NextResponse.json(body, { status, headers: { ...ADMIN_RESPONSE_HEADERS } });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ctx = await requireAdmin('mfa');
  if (!ctx) return adminNotFound();
  if (!sameOrigin(req)) return adminNotFound();
  if ((req.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase() !== 'application/json') return adminNotFound();
  let body: Record<string, unknown>;
  try {
    const v: unknown = await req.json();
    if (!v || typeof v !== 'object' || Array.isArray(v)) return answer({ ok: false, error: 'bad_request' }, 400);
    body = v as Record<string, unknown>;
  } catch {
    return answer({ ok: false, error: 'bad_request' }, 400);
  }
  if (body.action === 'start') {
    const s = await startSetup(ctx, SITE.brand.name);
    return answer(s, s.ok ? 200 : 400);
  }
  const r = body.action === 'verify' ? await verifyCode(ctx, body.code)
    : body.action === 'confirm' ? await confirmSetup(ctx, body.factorId, body.code)
      : null;
  if (!r) return adminNotFound();
  return answer(r, r.ok ? 200 : 400);
}

export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
