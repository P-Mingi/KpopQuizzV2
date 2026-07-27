import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { NOTIFICATION_CATEGORIES } from '@/lib/notifications';

import type { NextRequest } from 'next/server';

// O0 item 4: read/write the caller's notification preferences. RLS (mig 122)
// scopes every read/write to the owner; the mig-122 BEFORE INSERT trigger is
// what actually enforces these prefs at notification time.
export const dynamic = 'force-dynamic';

const VALID_CATEGORY_KEYS = new Set(NOTIFICATION_CATEGORIES.map((c) => c.key));
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data } = await supabase.from('notification_prefs').select('categories, quiz_mutes').eq('user_id', user.id).maybeSingle();
  return NextResponse.json({ categories: data?.categories ?? {}, quiz_mutes: data?.quiz_mutes ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { data: cur } = await supabase.from('notification_prefs').select('categories, quiz_mutes').eq('user_id', user.id).maybeSingle();
  let categories = { ...((cur?.categories as Record<string, boolean> | null) ?? {}) };
  let quiz_mutes = [...((cur?.quiz_mutes as string[] | null) ?? [])];

  // Category toggles (only known keys, boolean values).
  if (body.categories && typeof body.categories === 'object') {
    for (const [k, v] of Object.entries(body.categories as Record<string, unknown>)) {
      if (VALID_CATEGORY_KEYS.has(k) && typeof v === 'boolean') categories[k] = v;
    }
  }
  // Per-quiz mute / unmute.
  if (typeof body.muteQuiz === 'string' && UUID_RE.test(body.muteQuiz) && !quiz_mutes.includes(body.muteQuiz)) {
    quiz_mutes.push(body.muteQuiz);
  }
  if (typeof body.unmuteQuiz === 'string') {
    quiz_mutes = quiz_mutes.filter((q) => q !== body.unmuteQuiz);
  }

  const { error } = await supabase
    .from('notification_prefs')
    .upsert({ user_id: user.id, categories, quiz_mutes, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, categories, quiz_mutes });
}
