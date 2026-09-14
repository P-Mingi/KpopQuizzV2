import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { setAnonCookie, isUuid } from '@/lib/anon-claim';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// Persist a custom tier-list image to the public `tier-list-assets` bucket and
// ledger a tier_list_assets row (status 'pending'), mirroring the avatars (103)
// and verse-space-image storage pattern: the upload goes through the service role
// (the bucket + table grant no anon/authenticated write), and the row records the
// owner (a signed-in user or an anon session, like plays). A PUBLIC list may only
// use an APPROVED asset (enforced at publish); a private/unlisted list may use it
// while pending. Because the returned URL is a *.supabase.co URL (already on the
// OG image-host allowlist), the share card embeds an approved custom face with no
// OG change - this is what closes the custom-upload seam.

const BUCKET = 'tier-list-assets';
const MAX_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function POST(req: NextRequest): Promise<NextResponse> {
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }
  const file = form.get('file');
  const name = (form.get('name') as string | null)?.trim().slice(0, 40) || 'Custom item';
  const anonRaw = form.get('anonId') as string | null;

  if (!(file instanceof File)) return NextResponse.json({ error: 'No image.' }, { status: 400 });
  if (!EXT[file.type]) return NextResponse.json({ error: 'Use a JPG, PNG or WEBP image.' }, { status: 400 });
  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'Image must be under 8MB.' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  const anonId = isUuid(anonRaw) ? anonRaw : null;
  if (!user && !anonId) return NextResponse.json({ error: 'Could not identify you.' }, { status: 400 });

  const admin = createServiceRoleClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const prefix = user ? `u/${user.id}` : `a/${anonId}`;
  const path = `${prefix}/${crypto.randomUUID()}.${EXT[file.type]}`;

  const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (up.error) return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  const publicUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const { data, error } = await admin.from('tier_list_assets')
    .insert({ owner_id: user?.id ?? null, anon_id: user ? null : anonId, name, image_url: publicUrl, status: 'pending' })
    .select('id,status').single();
  if (error || !data) {
    await admin.storage.from(BUCKET).remove([path]); // no orphaned object
    return NextResponse.json({ error: 'Could not save the image.' }, { status: 500 });
  }

  const res = NextResponse.json({ id: data.id, url: publicUrl, status: data.status, itemId: `custom:${data.id}` });
  if (!user && anonId) setAnonCookie(res, anonId);
  return res;
}
