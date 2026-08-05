import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { isAdmin } from '@/lib/admin';
import { underRateCap } from '@/lib/verse/moderation';
import { reEncode, fetchExternalImage } from '@/lib/verse/image-ingest';

// V-BUILDER-3 step 3 - THE BLOCK IMAGE RAIL (owner image law L-047). Curator+ ingest of a
// content-block image: upload a file OR paste ANY url; the SERVER fetches + COPIES it into our
// verse-space-assets bucket (never hotlinked), strips EXIF (sharp re-encode), dedupes by sha256,
// and ledgers it in verse_space_assets (kind='image', status='active'). The rendered page only
// ever carries OUR storage path; the original url is kept in source_url for the moderation/DMCA
// trail and is NEVER served. PATCH = hide/unhide (takedown), DELETE = remove (delete object).
export const dynamic = 'force-dynamic';

const RATE_WINDOW_SEC = 24 * 3600;
const RATE_MAX_PER_DAY = 100;
const BUCKET = 'verse-space-assets';

async function authUser(): Promise<string | null> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  return user?.id ?? null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  const groupId = Number(form.get('group_id'));
  const file = form.get('file') as File | null;
  const url = form.get('url') ? String(form.get('url')).trim() : '';
  if (!groupId) return NextResponse.json({ error: 'A space is required.' }, { status: 400 });

  const uid = await authUser();
  if (!uid || !await canCurateSpace(uid, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  if (!await underRateCap('verse_space_assets', 'uploaded_by', uid, RATE_WINDOW_SEC, RATE_MAX_PER_DAY)) {
    return NextResponse.json({ error: 'Daily image limit reached. Try again tomorrow.' }, { status: 429 });
  }

  // get the raw bytes: from the upload OR by fetching the pasted url (SSRF-hardened).
  let input: Buffer;
  if (file) {
    input = Buffer.from(await file.arrayBuffer());
  } else if (url) {
    const got = await fetchExternalImage(url);
    if ('error' in got) return NextResponse.json({ error: got.error }, { status: 400 });
    input = got.buffer;
  } else {
    return NextResponse.json({ error: 'Provide a file or an image URL.' }, { status: 400 });
  }

  const enc = await reEncode(input);
  if ('error' in enc) return NextResponse.json({ error: enc.error }, { status: 400 });

  const svc = createServiceRoleClient();
  // DEDUPE: same bytes already live in this space -> reuse the one object (no re-upload).
  const { data: dupe } = await svc.from('verse_space_assets')
    .select('id, storage_path').eq('space_id', groupId).eq('hash', enc.hash).neq('status', 'removed').maybeSingle();
  if (dupe) {
    const pub = svc.storage.from(BUCKET).getPublicUrl(dupe.storage_path).data.publicUrl;
    return NextResponse.json({ ok: true, deduped: true, id: dupe.id, path: dupe.storage_path, url: pub });
  }

  const path = `images/${groupId}/${crypto.randomUUID()}.${enc.ext}`;
  const { error: upErr } = await svc.storage.from(BUCKET).upload(path, enc.out, { contentType: enc.mime, upsert: false });
  if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });

  const { data, error } = await svc.from('verse_space_assets').insert({
    space_id: groupId, kind: 'image', storage_path: path, mime: enc.mime, hash: enc.hash,
    width: enc.width, height: enc.height, bytes: enc.out.length, uploaded_by: uid,
    source: file ? 'upload' : 'url', source_url: file ? null : url, status: 'active',
  }).select('id, storage_path').single();
  if (error) {
    await svc.storage.from(BUCKET).remove([path]).catch(() => {}); // don't orphan the object
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const pub = svc.storage.from(BUCKET).getPublicUrl(data.storage_path).data.publicUrl;
  return NextResponse.json({ ok: true, id: data.id, path: data.storage_path, url: pub });
}

// moderate: hide (takedown, keep object) / unhide. Space curator OR global admin.
export async function PATCH(req: Request): Promise<NextResponse> {
  const body = await req.json().catch(() => ({})) as { id?: number; action?: string };
  const id = Number(body.id);
  const action = String(body.action ?? '');
  if (!id || !['hide', 'unhide'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const svc = createServiceRoleClient();
  const { data: asset } = await svc.from('verse_space_assets').select('space_id, status').eq('id', id).maybeSingle();
  const a = asset as { space_id: number; status: string } | null;
  if (!a) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const uid = await authUser();
  if (!uid || (!isAdmin(uid) && !await canCurateSpace(uid, a.space_id))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  if (a.status === 'removed') return NextResponse.json({ error: 'That image was removed.' }, { status: 400 });
  await svc.from('verse_space_assets').update({ status: action === 'hide' ? 'hidden' : 'active', reviewed_by: uid, reviewed_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true, status: action === 'hide' ? 'hidden' : 'active' });
}

// remove: delete the storage object + mark removed. Space curator OR global admin.
export async function DELETE(req: Request): Promise<NextResponse> {
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const svc = createServiceRoleClient();
  const { data: asset } = await svc.from('verse_space_assets').select('space_id, storage_path').eq('id', id).maybeSingle();
  const a = asset as { space_id: number; storage_path: string } | null;
  if (!a) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const uid = await authUser();
  if (!uid || (!isAdmin(uid) && !await canCurateSpace(uid, a.space_id))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  await svc.storage.from(BUCKET).remove([a.storage_path]).catch(() => {});
  await svc.from('verse_space_assets').update({ status: 'removed', reviewed_by: uid, reviewed_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true });
}
