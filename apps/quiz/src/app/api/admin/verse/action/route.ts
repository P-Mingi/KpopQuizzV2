import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { adminNotFound, requireAdmin } from '@/lib/admin/guard';
import { logAdminAction, requestIdOf } from '@/lib/admin/journal';
import { adminSiteOf } from '@/lib/admin/site';
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
  const gate = await requireAdmin('api');
  if (!gate.ok) return gate.res;
  const { user } = gate;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const type = String(body.type ?? '');
  // ADMIN-2: the Verse data is kpopquiz.org's; the site is validated all the same.
  const siteResult = adminSiteOf(req, body, { only: ['kpop'] });
  if (!siteResult.ok) return siteResult.res;
  const svc = createServiceRoleClient();
  // One journal line per action done, with the ids it touched and never the value a curator typed.
  const target = body.entity_id ?? body.album_id ?? body.idol_id ?? body.group_id ?? null;
  const done = async (extra: Record<string, unknown> = {}): Promise<NextResponse> => {
    await logAdminAction(gate, { site: siteResult.site, action: `verse.${type}`.replace(/[^a-z0-9_.]/g, '_'), targetType: String(body.entity_type ?? 'verse'), targetId: typeof target === 'string' || typeof target === 'number' ? target : null, requestId: requestIdOf(req) });
    return NextResponse.json({ ok: true, ...extra });
  };

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
        return done();
      }
      case 'override_delete': {
        const { error } = await svc.from('entity_overrides').delete()
          .eq('entity_type', String(body.entity_type ?? '')).eq('entity_id', String(body.entity_id ?? '')).eq('field', String(body.field ?? ''));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return done();
      }
      case 'album_keep': {
        const { error } = await svc.from('albums').update({ review_flag: false, review_reason: null }).eq('id', Number(body.album_id));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return done();
      }
      case 'album_drop': {
        const { error } = await svc.from('albums').delete().eq('id', Number(body.album_id));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return done();
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
        return done();
      }
      case 'idol_keep_hidden': {
        // "Keep hidden" on the curator-idol queue: reviewed, decided not to publish. The
        // row + its page data survive (real-data law); it just leaves the queue and stays
        // inactive (active=false already 404s the page via getIdol). Not a delete.
        const { error } = await svc.from('idols').update({ needs_review: false }).eq('id', Number(body.idol_id)).eq('active', false);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return done();
      }
      case 'idol_reject': {
        const { error } = await svc.from('idols').delete().eq('id', Number(body.idol_id));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return done();
      }
      case 'refresh_group': {
        const stats = await runVerseRefresh(svc, { groupId: Number(body.group_id) });
        return done({ stats });
      }
      default:
        return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// ADMIN-1: a method this route does not implement is the admin 404 too (Next would answer 405 and name the real ones).
export const GET = adminNotFound;
export const PUT = adminNotFound;
export const PATCH = adminNotFound;
export const DELETE = adminNotFound;
export const HEAD = adminNotFound;
export const OPTIONS = adminNotFound;
