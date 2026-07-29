import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { fieldDef, isEditableField, validateFieldValue } from '@/lib/verse/fields';
import { canCurateEntity } from '@/lib/verse/curate';

import type { NextRequest } from 'next/server';

// W3.4 / W4.3 - curator fact override with a REQUIRED source. Only whitelisted typed
// fields are editable (structural living-persons: no personal-life field exists
// in the registry). Writes entity_overrides, which win at read (W1 precedence);
// the refresh cron never touches overrides. Global admins + per-space curators.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const entity_type = String(body.entity_type ?? '');
  const entity_id = String(body.entity_id ?? '');
  if (!await canCurateEntity(user.id, entity_type, entity_id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const field = String(body.field ?? '');
  const rawValue = String(body.value ?? '');
  const source_url = body.source_url ? String(body.source_url).trim() : '';
  const source_note = body.source_note ? String(body.source_note).trim() : '';

  // Structural gate: only whitelisted typed fields (no personal-life field exists).
  const def = fieldDef(entity_type, field);
  if (!def || !isEditableField(entity_type, field)) {
    return NextResponse.json({ error: 'field_not_editable' }, { status: 400 });
  }

  const svc = createServiceRoleClient();

  // Empty value = clear the override (revert to the ingested value).
  if (rawValue.trim() === '') {
    await svc.from('entity_overrides').delete().eq('entity_type', entity_type).eq('entity_id', entity_id).eq('field', field);
    return NextResponse.json({ ok: true, cleared: true });
  }

  // Typed validation (facts are never free text).
  const valid = validateFieldValue(def, rawValue);
  if ('error' in valid) return NextResponse.json({ error: valid.error }, { status: 400 });

  // Sources-required: a fact edit is blocked without a source.
  if (!source_url && !source_note) {
    return NextResponse.json({ error: 'source_required' }, { status: 400 });
  }
  if (source_url && !/^https?:\/\//i.test(source_url)) {
    return NextResponse.json({ error: 'source_url must start with http(s)://' }, { status: 400 });
  }

  const { error } = await svc.from('entity_overrides').upsert({
    entity_type, entity_id, field, value: valid.value,
    source_url: source_url || null, source_note: source_note || null,
    author: user.id, updated_at: new Date().toISOString(),
  }, { onConflict: 'entity_type,entity_id,field' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, value: valid.value });
}
