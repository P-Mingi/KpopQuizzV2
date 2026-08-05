import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { runVerseRefresh } from '@/lib/verse/refresh';

import type { NextRequest } from 'next/server';

// W1.6: admin actions for the Verse data dashboard. Admin-gated (401 otherwise).
// This is also the skeleton for future curator tooling, so actions are explicit
// and auditable. All writes go through the service-role client.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const OVERRIDE_TABLE: Record<string, string> = {
  group: 'groups', idol: 'idols', album: 'albums', group_unit: 'group_units', album_track: 'album_tracks', song: 'songs',
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const type = String(body.type ?? '');
  const svc = createServiceRoleClient();

  try {
    switch (type) {
      case 'override': {
        // field-level curator correction; ALWAYS wins at read, never overwritten
        // by ingestion.
        const entity_type = String(body.entity_type ?? '');
        const entity_id = String(body.entity_id ?? '');
        const field = String(body.field ?? '');
        const value = body.value == null ? null : String(body.value);
        if (!OVERRIDE_TABLE[entity_type] || !entity_id || !field) {
          return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
        }
        const { error } = await svc.from('entity_overrides').upsert({
          entity_type, entity_id, field, value, author: user.id, updated_at: new Date().toISOString(),
        }, { onConflict: 'entity_type,entity_id,field' });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }
      case 'override_delete': {
        const { error } = await svc.from('entity_overrides').delete()
          .eq('entity_type', String(body.entity_type ?? '')).eq('entity_id', String(body.entity_id ?? '')).eq('field', String(body.field ?? ''));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }
      case 'album_keep': {
        const { error } = await svc.from('albums').update({ review_flag: false, review_reason: null }).eq('id', Number(body.album_id));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }
      case 'album_drop': {
        const { error } = await svc.from('albums').delete().eq('id', Number(body.album_id));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }
      case 'idol_activate': {
        // Approve a review candidate (Wikidata mismatch OR curator-created) into a
        // published member. GOVERNANCE GUARD (L-068 NEW CODE LAW): never re-activate a
        // curator-DETACHED row here; a detached member returns only through the curator
        // re-attach picker (which clears detached_at atomically). Approving a detached
        // row would leave active=true with detached_at still set - an inconsistent state.
        const { data: cur } = await svc.from('idols').select('detached_at').eq('id', Number(body.idol_id)).maybeSingle();
        if (cur && (cur as { detached_at: string | null }).detached_at) {
          return NextResponse.json({ error: 'That member was detached from its space. Re-attach it from the space builder, do not approve it here.' }, { status: 409 });
        }
        const { error } = await svc.from('idols').update({ active: true, needs_review: false, review_reason: null }).eq('id', Number(body.idol_id));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }
      case 'idol_keep_hidden': {
        // "Keep hidden" on the curator-idol queue: reviewed, decided not to publish. The
        // row + its page data survive (real-data law); it just leaves the queue and stays
        // inactive (active=false already 404s the page via getIdol). Not a delete.
        const { error } = await svc.from('idols').update({ needs_review: false }).eq('id', Number(body.idol_id)).eq('active', false);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }
      case 'idol_reject': {
        const { error } = await svc.from('idols').delete().eq('id', Number(body.idol_id));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }
      case 'refresh_group': {
        const stats = await runVerseRefresh(svc, { groupId: Number(body.group_id) });
        return NextResponse.json({ ok: true, stats });
      }
      default:
        return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
