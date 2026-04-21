import { createServerClient } from '@/lib/supabase/server';
import { getByeolBalance } from '@/lib/byeol';
import { getActiveGroupPack } from '@/lib/pack-rotation';
import { GROUPS } from '@/lib/cards/constants';
import { CardsLanding } from './cards-landing';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cards - K-pop Card Collection | KpopQuiz',
  description: 'Collect K-pop idol cards from BTS, BLACKPINK, aespa, Stray Kids, and NewJeans. Open packs, complete your collection, earn Byeol.',
  alternates: { canonical: '/cards' },
};

async function fetchCardsData() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [allCardsRes, packsRes] = await Promise.all([
    supabase.from('dev_cards').select('id, group_slug, rarity, name, slug').eq('is_published', true),
    supabase.from('dev_card_packs').select('*').order('rotation_order', { ascending: true, nullsFirst: true }),
  ]);

  let byeol = 0;
  let ownedCardIds: string[] = [];
  let needsStarter = false;
  let recentPulls: unknown[] = [];

  if (user) {
    byeol = await getByeolBalance(user.id);

    const [ownedRes, byeolRes, pullsRes] = await Promise.all([
      supabase.from('dev_user_cards').select('card_id').eq('user_id', user.id),
      supabase.from('dev_user_byeol').select('has_opened_starter').eq('user_id', user.id).maybeSingle(),
      supabase.from('dev_pack_opens').select('cards_pulled, created_at, best_rarity').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    ownedCardIds = ownedRes.data?.map(c => c.card_id as string) ?? [];
    needsStarter = !byeolRes.data?.has_opened_starter;
    recentPulls = pullsRes.data ?? [];
  }

  const rotation = getActiveGroupPack();

  // Compute per-group stats
  const allCards = allCardsRes.data ?? [];
  const groupStats = GROUPS.map(g => {
    const total = allCards.filter(c => c.group_slug === g.slug).length;
    const owned = allCards.filter(c => c.group_slug === g.slug && ownedCardIds.includes(c.id)).length;
    return { ...g, total, owned };
  });

  return {
    isLoggedIn: !!user,
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
  const data = await fetchCardsData();
  return <CardsLanding data={data} />;
}
