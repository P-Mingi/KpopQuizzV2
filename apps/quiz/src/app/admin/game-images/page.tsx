import { redirect } from 'next/navigation';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { GameImageManager } from '@/components/admin/game-image-manager';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Game images', robots: { index: false, follow: false } };

const BUCKET = 'game-images';

// Game modes that have a page header (the gradient art above the player).
const HEADER_MODES = [
  { slug: 'sort-it', label: 'Sort It' },
  { slug: 'name-them-all', label: 'Name Them All' },
  { slug: 'match-up', label: 'Match-Up' },
  { slug: 'blindtest', label: 'Blind Test' },
  { slug: 'this-or-that', label: 'This or That' },
];

// Game hub tiles on /games page.
const HUB_TILES = [
  { slug: 'name-them-all', label: 'Name Them All' },
  { slug: 'sort-it', label: 'Sort It' },
  { slug: 'match-up', label: 'Match-Up' },
  { slug: 'this-or-that', label: 'This or That' },
  { slug: 'personality', label: 'Personality Quiz' },
  { slug: 'duel', label: 'Duel 1v1' },
  { slug: 'blind-test', label: 'Blind Test (daily)' },
  { slug: 'idle', label: 'K-pop Idle (daily)' },
];

const NAME_ALL_TYPES = ['name_all_members', 'name_all_songs', 'name_top_songs', 'name_all_groups', 'name_all_idols'];

export default async function GameImagesAdminPage(): Promise<React.ReactElement> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !isAdmin(user.id)) redirect('/');

  const svc = createServiceRoleClient();

  // List existing images in the bucket (if it exists).
  let existingFiles: string[] = [];
  try {
    const categories = ['header', 'hub', 'idol', 'group'];
    const lists = await Promise.all(
      categories.map(async (cat) => {
        const { data } = await svc.storage.from(BUCKET).list(cat, { limit: 500 });
        return (data ?? []).map((f) => `${cat}/${f.name}`);
      }),
    );
    existingFiles = lists.flat();
  } catch {
    // Bucket may not exist yet; that is fine.
  }

  // Helper: find existing image URL for a key prefix.
  function findImage(prefix: string): string | null {
    const match = existingFiles.find((f) => f.startsWith(prefix));
    if (!match) return null;
    return svc.storage.from(BUCKET).getPublicUrl(match).data.publicUrl;
  }

  // Header slots
  const headerSlots = HEADER_MODES.map((m) => ({
    key: `header:${m.slug}`,
    label: m.label,
    current: findImage(`header/${m.slug}`),
  }));

  // Hub slots
  const hubSlots = HUB_TILES.map((t) => ({
    key: `hub:${t.slug}`,
    label: t.label,
    current: findImage(`hub/${t.slug}`),
  }));

  // All groups (for logo/image editing)
  const { data: groupsRaw } = await svc
    .from('groups')
    .select('id, name, slug, logo_url, display_color, text_color')
    .order('quiz_count', { ascending: false })
    .order('name', { ascending: true })
    .limit(200);

  const groups = (groupsRaw ?? []).map((g) => ({
    id: g.id as number,
    name: g.name as string,
    slug: g.slug as string,
    logo_url: (g.logo_url as string | null) ?? findImage(`group/${g.slug}`) ?? null,
    display_color: (g.display_color as string) ?? '#888',
    text_color: (g.text_color as string) ?? '#fff',
  }));

  // Name-all-members games
  const { data: nameAllRaw } = await svc
    .from('games')
    .select('id, slug, title, content, game_type')
    .in('game_type', NAME_ALL_TYPES)
    .eq('status', 'published')
    .order('title', { ascending: true })
    .limit(200);

  // Show all name-all games that have a members or items array (any type can have
  // idol photos). The content shape varies: members for name_all_members, items for
  // name_all_songs/groups/idols. Both have a photo_url field.
  const nameAllGames = (nameAllRaw ?? [])
    .map((g) => {
      const content = g.content as Record<string, unknown>;
      const raw = (content?.members ?? content?.items ?? []) as Array<Record<string, unknown>>;
      if (!Array.isArray(raw) || raw.length === 0) return null;
      const members = raw.map((m) => ({
        name: (m.name as string) ?? '',
        photo_url: (m.photo_url as string | null) ?? (m.image_url as string | null) ?? null,
        position: (m.position as string) ?? '',
      }));
      return { id: g.id as string, slug: g.slug as string, title: g.title as string, members };
    })
    .filter(Boolean) as Array<{ id: string; slug: string; title: string; members: Array<{ name: string; photo_url: string | null; position: string }> }>;

  return (
    <GameImageManager
      headerSlots={headerSlots}
      hubSlots={hubSlots}
      nameAllGames={nameAllGames}
      groups={groups}
    />
  );
}
