import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

const BUCKET = 'game-images';

/**
 * POST /api/admin/game-image
 *
 * Upload a game-related image. Accepted categories:
 *   - header:{slug}   -- game page header image (replaces CSS gradient)
 *   - hub:{slug}      -- game hub card cover image
 *   - idol:{gameSlug}:{memberIndex} -- idol photo for name-all-members game
 *
 * FormData: file (image), key (category:path string)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const key = formData.get('key') as string | null;

  if (!file || !key) {
    return NextResponse.json({ error: 'Missing file or key' }, { status: 400 });
  }

  // Validate key format
  const parts = key.split(':');
  const category = parts[0];
  if (!category || !['header', 'hub', 'idol', 'group', 'card'].includes(category)) {
    return NextResponse.json({ error: 'Invalid key category' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Ensure bucket exists (auto-create on first use)
  const { data: buckets } = await adminDb.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    await adminDb.storage.createBucket(BUCKET, { public: true });
  }

  const ext = file.name.split('.').pop() || 'webp';
  // Store under predictable paths: header/sort-it.webp, hub/name-them-all.webp, idol/bts/0.webp
  const storagePath = `${category}/${parts.slice(1).join('/')}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminDb.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = adminDb.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  // For idol images: also update the game's content JSONB to set photo_url
  if (category === 'idol' && parts[1] && parts[2] !== undefined) {
    const gameSlug = parts[1];
    const memberIdx = parseInt(parts[2], 10);

    if (!isNaN(memberIdx)) {
      // Fetch current game content
      const { data: game, error: fetchErr } = await adminDb
        .from('games')
        .select('id, content')
        .eq('slug', gameSlug)
        .eq('status', 'published')
        .single();

      if (!fetchErr && game) {
        const content = game.content as Record<string, unknown>;
        const members = (content.members ?? content.items ?? []) as Array<Record<string, unknown>>;
        if (members[memberIdx]) {
          members[memberIdx]!.photo_url = publicUrl;
          // Write back - keep the correct key (members or items)
          const contentKey = content.members ? 'members' : 'items';
          const { error: updateErr } = await adminDb
            .from('games')
            .update({ content: { ...content, [contentKey]: members } })
            .eq('id', game.id);

          if (updateErr) {
            return NextResponse.json({ url: publicUrl, warning: `Image uploaded but game update failed: ${updateErr.message}` });
          }
        }
      }
    }
  }

  // For card covers: update the game's content.cover_url
  if (category === 'card' && parts[1]) {
    const gameSlug = parts[1];
    const { data: game, error: fetchErr } = await adminDb
      .from('games')
      .select('id, content')
      .eq('slug', gameSlug)
      .eq('status', 'published')
      .single();

    if (!fetchErr && game) {
      const content = game.content as Record<string, unknown>;
      const { error: updateErr } = await adminDb
        .from('games')
        .update({ content: { ...content, cover_url: publicUrl } })
        .eq('id', game.id);

      if (updateErr) {
        return NextResponse.json({ url: publicUrl, warning: `Image uploaded but game update failed: ${updateErr.message}` });
      }
    }
  }

  // For group logos: update the group's logo_url column
  if (category === 'group' && parts[1]) {
    const groupSlug = parts[1];
    const { error: updateErr } = await adminDb
      .from('groups')
      .update({ logo_url: publicUrl })
      .eq('slug', groupSlug);

    if (updateErr) {
      return NextResponse.json({ url: publicUrl, warning: `Image uploaded but group update failed: ${updateErr.message}` });
    }
  }

  return NextResponse.json({ url: publicUrl });
}

/**
 * DELETE /api/admin/game-image
 *
 * Remove a game image from storage.
 * Body: { key: string } (same format as upload key)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json() as { key?: string; path?: string };
  const path = body.path;

  if (!path) {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();
  const { error } = await adminDb.storage.from(BUCKET).remove([path]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
