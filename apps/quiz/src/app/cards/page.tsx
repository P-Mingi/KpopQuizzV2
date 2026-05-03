import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { getActiveGroupPack } from '@/lib/pack-rotation';
import { GROUPS } from '@/lib/cards/constants';
import { CardsLanding } from './cards-landing';
import { CardsComingSoon } from './cards-coming-soon';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cards - K-pop Card Collection | KpopQuiz',
  description: 'Collect K-pop idol cards from BTS, BLACKPINK, aespa, Stray Kids, and NewJeans. Open packs, complete your collection, earn Byeol.',
  alternates: { canonical: '/cards' },
};

async function fetchCardsData() {
  const supabase = await createServerClient();

  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  // These queries work for everyone (RLS allows SELECT)
  const [allCardsRes, packsRes, groupLogosRes] = await Promise.all([
    supabase.from('dev_cards').select('id, group_slug, rarity, name, slug').eq('is_published', true),
    supabase.from('dev_card_packs').select('*').order('rotation_order', { ascending: true, nullsFirst: true }),
    supabase.from('groups').select('slug, logo_url, display_color, text_color, name'),
  ]);

  let byeol = 0;
  let ownedCardIds: string[] = [];
  let needsStarter = false;
  let recentPulls: unknown[] = [];

  if (user) {
    try {
      const [byeolRes, ownedRes, starterRes, pullsRes] = await Promise.all([
        supabase.from('dev_user_byeol').select('balance, has_opened_starter').eq('user_id', user.id).maybeSingle(),
        supabase.from('dev_user_cards').select('card_id').eq('user_id', user.id),
        Promise.resolve(null), // placeholder
        supabase.from('dev_pack_opens').select('cards_pulled, created_at, best_rarity').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      ]);
      void starterRes;

      byeol = (byeolRes.data?.balance as number) ?? 0;
      needsStarter = byeolRes.data ? !(byeolRes.data.has_opened_starter as boolean) : true;
      ownedCardIds = ownedRes.data?.map(c => c.card_id as string) ?? [];
      recentPulls = pullsRes.data ?? [];
    } catch {
      // User data fetch failed - continue with defaults
    }
  }

  const rotation = getActiveGroupPack();
  const allCards = allCardsRes.data ?? [];
  const groupLogos = groupLogosRes.data ?? [];

  // Build a map of group slug -> logo info from the groups table
  const logoMap = new Map(groupLogos.map(g => [g.slug, g]));

  const groupStats = GROUPS.map(g => {
    const total = allCards.filter(c => c.group_slug === g.slug).length;
    const owned = allCards.filter(c => c.group_slug === g.slug && ownedCardIds.includes(c.id)).length;
    const dbGroup = logoMap.get(g.slug);
    return {
      ...g,
      total,
      owned,
      logoUrl: (dbGroup?.logo_url as string | null) ?? null,
      groupDisplayColor: (dbGroup?.display_color as string | null) ?? g.textColor,
      groupTextColor: (dbGroup?.text_color as string | null) ?? '#fff',
    };
  });

  return {
    isLoggedIn: !!user,
    isAdminUser: user ? isAdmin(user.id) : false,
    userId: user?.id ?? null,
    byeol,
    groupStats,
    totalCards: allCards.length,
    totalOwned: ownedCardIds.length,
    needsStarter,
    recentPulls,
    rotation: {
      groupSlug: rotation.groupSlug,
      groupName: rotation.groupName,
      nextGroupName: rotation.nextGroupName,
      endsAt: rotation.endsAt.toISOString(),
      msRemaining: rotation.msRemaining,
    },
    packs: packsRes.data ?? [],
  };
}

export default async function CardsPage() {

  try {
    const data = await fetchCardsData();
    if (!data.isAdminUser) {
      return <CardsComingSoon />;
    }
    return <CardsLanding data={data} />;
  } catch (err) {
    console.error('[cards] page error:', err);
    return <CardsComingSoon />;
  }
}
