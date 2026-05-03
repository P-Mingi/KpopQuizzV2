import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { CollectionGrid } from './collection-grid';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Card Collection | KpopQuiz',
  description: 'Browse all K-pop collectible cards. Filter by group, rarity, and status.',
  alternates: { canonical: '/cards/collection' },
};

export default async function CollectionPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.id)) {
    redirect('/cards');
  }

  const { data: allCards } = await supabase
    .from('dev_cards')
    .select('*')
    .eq('is_published', true)
    .order('card_number');

  const ownedIds = new Set<string>();
  if (user) {
    const { data } = await supabase.from('dev_user_cards').select('card_id').eq('user_id', user.id);
    data?.forEach(c => ownedIds.add(c.card_id as string));
  }

  return (
    <div className="pb-12">
      <h1 className="text-xl font-bold text-primary mb-1">Collection</h1>
      <p className="text-xs text-secondary mb-4">{ownedIds.size}/{allCards?.length ?? 0} cards collected</p>
      <CollectionGrid cards={allCards ?? []} ownedIds={[...ownedIds]} />
    </div>
  );
}
