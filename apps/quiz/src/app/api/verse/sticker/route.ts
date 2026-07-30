import { NextResponse } from 'next/server';
import sharp from 'sharp';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';

// W-CUSTOM step 8 - curator sticker upload. Hard constraints (all enforced here, the
// authoritative server side): png/webp ONLY (NO svg - it is an XSS vector), <=512KB,
// <=512x512, metadata STRIPPED (sharp re-encode drops all EXIF/XMP), ownership
// attestation required, per-space cap of 20 active stickers. sharp is already a
// dependency (no new deps). DELETE marks a sticker removed (admin/curator takedown).
export const dynamic = 'force-dynamic';

const MAX_BYTES = 512 * 1024;
const MAX_DIM = 512;
const PER_SPACE_CAP = 20;

async function curator(groupId: number): Promise<string | null> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  return user && await canCurateSpace(user.id, groupId) ? user.id : null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const form = await req.formData();
  const groupId = Number(form.get('group_id'));
  const file = form.get('file') as File | null;
  const attest = String(form.get('attest') ?? '') === 'true';
  if (!groupId || !file) return NextResponse.json({ error: 'A group and a file are required.' }, { status: 400 });

  const uid = await curator(groupId);
  if (!uid) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  if (!attest) return NextResponse.json({ error: 'Please confirm you own or have the right to use this image.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'Sticker is too large (max 512KB).' }, { status: 400 });

  const svc = createServiceRoleClient();
  // Per-space cap of 20 active stickers.
  const { count } = await svc.from('verse_space_assets').select('id', { count: 'exact', head: true }).eq('space_id', groupId).eq('kind', 'sticker').eq('status', 'active');
  if ((count ?? 0) >= PER_SPACE_CAP) return NextResponse.json({ error: `This space is at its sticker limit (${PER_SPACE_CAP}). Remove one first.` }, { status: 400 });

  const input = Buffer.from(await file.arrayBuffer());
  // Reject SVG explicitly (text-based -> XSS). sharp would parse it, so gate first.
  const head = input.subarray(0, 256).toString('utf8').trim().toLowerCase();
  if (head.includes('<svg') || head.startsWith('<?xml') || head.startsWith('<!doctype')) {
    return NextResponse.json({ error: 'SVG is not allowed. Use PNG or WebP.' }, { status: 400 });
  }

  let out: Buffer; let meta: sharp.Metadata; let ext: 'png' | 'webp';
  try {
    meta = await sharp(input).metadata();
    if (meta.format !== 'png' && meta.format !== 'webp') {
      return NextResponse.json({ error: 'Only PNG or WebP stickers are allowed.' }, { status: 400 });
    }
    ext = meta.format;
    // Re-encode to STRIP all metadata + enforce max dimensions (no upscaling).
    const pipe = sharp(input).resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true });
    out = ext === 'webp' ? await pipe.webp().toBuffer() : await pipe.png().toBuffer();
  } catch {
    return NextResponse.json({ error: 'That file is not a valid image.' }, { status: 400 });
  }
  const final = await sharp(out).metadata();

  const path = `stickers/${groupId}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await svc.storage.from('verse-space-assets').upload(path, out, { contentType: `image/${ext}`, upsert: false });
  if (upErr) return NextResponse.json({ error: `Upload failed: ${upErr.message}` }, { status: 500 });

  const { data, error } = await svc.from('verse_space_assets')
    .insert({ space_id: groupId, kind: 'sticker', storage_path: path, width: final.width ?? null, height: final.height ?? null, bytes: out.length, uploaded_by: uid, status: 'active' })
    .select('id, storage_path, width, height').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, storage_path: data.storage_path, ref: `asset:${data.id}` });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const svc = createServiceRoleClient();
  const { data: asset } = await svc.from('verse_space_assets').select('space_id').eq('id', id).maybeSingle();
  const gid = (asset as { space_id: number } | null)?.space_id;
  if (!gid || !await curator(gid)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  await svc.from('verse_space_assets').update({ status: 'removed' }).eq('id', id);
  return NextResponse.json({ ok: true });
}
