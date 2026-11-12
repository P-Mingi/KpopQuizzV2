import { NextResponse } from 'next/server';

import { verseWriteGate } from '@/lib/verse/api-gate';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { contrastRatio } from '@/lib/verse/theme';

import type { NextRequest } from 'next/server';

// V-POLISH-2 C2 - curator-settable era colors (the spine's chapter rails).
// Warn-not-block philosophy does not apply to raw unreadability: a rail color
// is decoration against BOTH page backgrounds, so the save clamps only when
// the pick is effectively invisible (under 1.4:1 against either bg), by
// refusing with a message rather than silently repainting the pick.
// FLAW-1 sweep (integrator fix, 2026-11-12): the era is read first and the curator role is checked on the
// space of the era row. An era that does not exist, or that belongs to another space than the one the
// caller named, is a 403 (before, the update was filtered by group_id and answered ok while it changed
// nothing).
export const dynamic = 'force-dynamic';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const LIGHT_BG = '#FAF8F5';
const DARK_BG = '#0f1119';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gated = await verseWriteGate(req);
  if (gated) return gated;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  const eraId = Number(body.era_id);
  const color = String(body.color ?? '');
  if (!groupId || !eraId || !HEX.test(color)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const svc = createServiceRoleClient();
  const { data: era } = await svc.from('eras').select('id, group_id').eq('id', eraId).maybeSingle();
  const eraSpace = Number((era as { group_id?: unknown } | null)?.group_id);
  if (!era || eraSpace !== groupId || !await canCurateSpace(user.id, eraSpace)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  if (contrastRatio(color, LIGHT_BG) < 1.4 || contrastRatio(color, DARK_BG) < 1.4) {
    return NextResponse.json({ ok: false, errors: ['That color disappears against one of the page backgrounds. Pick a stronger shade.'] }, { status: 422 });
  }

  const { error } = await svc.from('eras').update({ color }).eq('id', eraId).eq('group_id', eraSpace);
  if (error) return NextResponse.json({ ok: false, errors: [error.message] }, { status: 500 });
  return NextResponse.json({ ok: true });
}
