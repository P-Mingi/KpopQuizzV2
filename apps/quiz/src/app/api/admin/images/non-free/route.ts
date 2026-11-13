import { revalidateTag } from 'next/cache';

import { ImageError } from '@/lib/entity-images/errors';
import { NON_FREE_MAX_ROWS, deleteNonFree, planNonFree } from '@/lib/entity-images/non-free';
import { adminGate, failure, forbidden, notFoundHandler, ok, readJson, sameOrigin } from '@/lib/entity-images/route-kit';
import { createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest, NextResponse } from 'next/server';

// Lot 3 DLE (owner decision of 2026-11-13): POST /api/admin/images/non-free, the button "Supprimer les images non libres" of the Photos tab.
//   { action: 'preview' }   the selection of lib/entity-images/non-free.ts, computed here: its counts (rows, their files, orphan files), 10
//                           examples, and whether it is refused (more than 1,100 rows). Nothing is written.
//   { action: 'delete', confirm: 'SUPPRIMER', expect: { rows, files, orphans } }
//                           the selection is computed AGAIN, never read from the browser; it is refused when it is too big or when its counts
//                           differ from the ones the owner saw; otherwise the rows, their files and the orphans are deleted and the counts
//                           of what went are answered.
// Admin only on the anime build (the gate of the other admin image routes: 404 for anyone else), same-origin writes only, never cached.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const count = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 1_000_000) throw new ImageError('bad_request', 400, 'Les nombres de l\'aperçu manquent : ouvre l\'aperçu de nouveau.');
  return v;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gate = await adminGate();
  if (!gate.ok) return gate.res;
  if (!sameOrigin(req)) return forbidden();
  try {
    const body = await readJson(req);
    const db = createServiceRoleClient();
    if (body.action === 'preview') {
      const plan = await planNonFree(db);
      return ok({ counts: plan.counts, tooMany: plan.tooMany, max: NON_FREE_MAX_ROWS, examples: plan.examples });
    }
    if (body.action === 'delete') {
      const e = (body.expect ?? {}) as Record<string, unknown>;
      const report = await deleteNonFree(db, { confirm: body.confirm, expect: { rows: count(e.rows), files: count(e.files), orphans: count(e.orphans) } }, undefined, (tags) => {
        for (const tag of tags) {
          try { revalidateTag(tag, { expire: 0 }); } catch { /* outside a request there is no cache to expire */ }
        }
      });
      return ok({ report });
    }
    throw new ImageError('bad_request', 400, 'Action inconnue.');
  } catch (e) {
    return failure(e);
  }
}

// Every other method answers 404, not Next's 405.
export const GET = notFoundHandler;
export const PUT = notFoundHandler;
export const PATCH = notFoundHandler;
export const DELETE = notFoundHandler;
export const HEAD = notFoundHandler;
export const OPTIONS = notFoundHandler;
