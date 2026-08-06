import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

import type { NextRequest } from 'next/server';

const NAME_ALL_TYPES = ['name_all_members', 'name_all_songs', 'name_top_songs', 'name_all_groups', 'name_all_idols'];

/**
 * POST /api/admin/game-image/autofill
 *
 * Cross-reference game members with the `idols` table and backfill
 * photo_url for members that are missing photos but have one in the DB.
 *
 * Returns { updated: number, details: Array<{ game, member, photo_url }> }
 */
export async function POST(_request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const svc = createServiceRoleClient();

  // 1. Fetch all idols with photos
  const { data: idolsRaw, error: idolsErr } = await svc
    .from('idols')
    .select('id, name, photo_url')
    .not('photo_url', 'is', null)
    .limit(5000);

  if (idolsErr) {
    return NextResponse.json({ error: `Failed to fetch idols: ${idolsErr.message}` }, { status: 500 });
  }

  // Build a name-to-photo lookup (case-insensitive, trimmed)
  const idolPhotos = new Map<string, string>();
  for (const idol of idolsRaw ?? []) {
    if (idol.photo_url) {
      idolPhotos.set((idol.name as string).toLowerCase().trim(), idol.photo_url as string);
    }
  }

  if (idolPhotos.size === 0) {
    return NextResponse.json({ updated: 0, details: [], message: 'No idols with photos found in database.' });
  }

  // 2. Fetch all name-all games
  const { data: gamesRaw, error: gamesErr } = await svc
    .from('games')
    .select('id, slug, title, content, game_type')
    .in('game_type', NAME_ALL_TYPES)
    .eq('status', 'published')
    .limit(500);

  if (gamesErr) {
    return NextResponse.json({ error: `Failed to fetch games: ${gamesErr.message}` }, { status: 500 });
  }

  // 3. Cross-reference and update
  const details: Array<{ game: string; member: string; photo_url: string }> = [];

  for (const game of gamesRaw ?? []) {
    const content = game.content as Record<string, unknown>;
    const contentKey = content.members ? 'members' : 'items';
    const members = (content[contentKey] ?? []) as Array<Record<string, unknown>>;

    if (!Array.isArray(members) || members.length === 0) continue;

    let changed = false;

    for (const member of members) {
      const hasPhoto = !!(member.photo_url || member.image_url);
      if (hasPhoto) continue;

      const name = (member.name as string | undefined) ?? '';
      const match = idolPhotos.get(name.toLowerCase().trim());
      if (match) {
        member.photo_url = match;
        changed = true;
        details.push({
          game: game.title as string,
          member: name,
          photo_url: match,
        });
      }
    }

    if (changed) {
      await svc
        .from('games')
        .update({ content: { ...content, [contentKey]: members } })
        .eq('id', game.id);
    }
  }

  return NextResponse.json({
    updated: details.length,
    details,
    idols_with_photos: idolPhotos.size,
  });
}
