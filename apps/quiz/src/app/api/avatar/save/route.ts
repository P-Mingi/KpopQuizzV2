import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { flattenAvatar } from '@/lib/avatar/compositor';
import { validateSelection } from '@/lib/avatar/manifest';

import type { NextRequest } from 'next/server';

// Avatar flatten-on-save (Workstream M, M1.27 finalize). Auth-gated, dynamic.
// Validates the config against the manifest, composites the layers server-side
// into ONE 1024 PNG (matching the live preview), uploads it to the public
// `avatars` bucket at an immutable content-addressed path, and points the
// profile at it (avatar_ref + avatar_config + avatar_kind = 'custom').
export const runtime = 'nodejs';

const BUCKET = 'avatars';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in to save your avatar' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const config = (body as { config?: unknown } | null)?.config;
  const sel = validateSelection(config);
  if (!sel) {
    return NextResponse.json({ error: 'Invalid avatar configuration' }, { status: 400 });
  }

  // Load each layer over HTTP from this same origin (the static /avatar assets).
  const origin = request.nextUrl.origin;
  const cache = new Map<string, Promise<Buffer>>();
  const load = (asset: string): Promise<Buffer> => {
    let p = cache.get(asset);
    if (!p) {
      p = fetch(new URL(asset, origin)).then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load layer ${asset}: ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
      });
      cache.set(asset, p);
    }
    return p;
  };

  let png: Buffer;
  try {
    png = await flattenAvatar(sel, load);
  } catch (err) {
    console.error('[avatar/save] flatten failed:', err);
    return NextResponse.json({ error: 'Could not render avatar' }, { status: 500 });
  }

  // Content-addressed path: same config -> same URL (immutable, CDN-cacheable
  // forever); a new look = a new URL, so caches never serve a stale avatar.
  const hash = createHash('sha1').update(JSON.stringify(sel)).digest('hex').slice(0, 16);
  const path = `${user.id}/${hash}.png`;

  const admin = createServiceRoleClient();
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, png, { contentType: 'image/png', upsert: true, cacheControl: '31536000' });
  if (uploadError) {
    console.error('[avatar/save] upload failed:', uploadError);
    return NextResponse.json({ error: 'Could not store avatar' }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  const avatarRef = urlData.publicUrl;

  const { error: updateError } = await admin
    .from('profiles')
    .update({ avatar_ref: avatarRef, avatar_config: sel, avatar_kind: 'custom' })
    .eq('id', user.id);
  if (updateError) {
    console.error('[avatar/save] profile update failed:', updateError);
    return NextResponse.json({ error: 'Could not save avatar to profile' }, { status: 500 });
  }

  return NextResponse.json({ avatar_ref: avatarRef });
}
