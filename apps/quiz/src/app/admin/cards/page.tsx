import { createServiceRoleClient } from '@/lib/supabase/server';
import { getActiveGroupPack } from '@/lib/pack-rotation';
import { AdminCardsPanel } from './admin-cards-panel';

export const dynamic = 'force-dynamic';

async function fetchAdminCardData() {
  const supabase = createServiceRoleClient();

  const [
    { data: cards },
    { data: packs },
    { count: totalUsers },
    { data: economyAgg },
    { data: recentOpens },
    { data: topCards },
    { data: _leastCards },
    { count: pityCount },
  ] = await Promise.all([
    supabase.from('dev_cards').select('*').order('card_number'),
    supabase.from('dev_card_packs').select('*').order('rotation_order', { ascending: true, nullsFirst: true }),
    supabase.from('dev_user_byeol').select('*', { count: 'exact', head: true }),
    supabase.from('dev_user_byeol').select('balance, total_earned, total_spent, total_packs_opened, total_cards_collected'),
    supabase.from('dev_pack_opens').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('dev_user_cards').select('card_id').limit(1000),
    supabase.from('dev_user_cards').select('card_id').limit(1000),
    supabase.from('dev_pack_opens').select('*', { count: 'exact', head: true }).eq('pity_triggered', true),
  ]);

  // Compute economy metrics
  const users = economyAgg ?? [];
  const totalByeol = users.reduce((s, u) => s + ((u.balance as number) ?? 0), 0);
  const avgBalance = users.length > 0 ? Math.round(totalByeol / users.length) : 0;
  const totalPacksOpened = users.reduce((s, u) => s + ((u.total_packs_opened as number) ?? 0), 0);
  const totalCardsCollected = users.reduce((s, u) => s + ((u.total_cards_collected as number) ?? 0), 0);

  // Card collection frequency
  const cardFreq: Record<string, number> = {};
  for (const uc of (topCards ?? [])) {
    const cid = uc.card_id as string;
    cardFreq[cid] = (cardFreq[cid] ?? 0) + 1;
  }

  const rot = getActiveGroupPack();
  const rotation = { ...rot, endsAt: rot.endsAt.toISOString() };

  return {
    cards: cards ?? [],
    packs: packs ?? [],
    economy: {
      totalByeol,
      avgBalance,
      totalPacksOpened,
      totalCardsCollected,
      totalUsers: totalUsers ?? 0,
      pityTriggers: pityCount ?? 0,
    },
    recentOpens: recentOpens ?? [],
    cardFrequency: cardFreq,
    rotation,
  };
}

export default async function AdminCardsPage() {
  const data = await fetchAdminCardData();

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Card System</h1>
      <AdminCardsPanel initialData={data} />
    </div>
  );
}
