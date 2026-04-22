import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { RARITY_CONFIG, getGroupMeta, type Rarity } from '@/lib/cards/constants';
import { CardTile } from '@/components/cards/card-tile';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ groupSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groupSlug } = await params;
  const group = getGroupMeta(groupSlug);
  return {
    title: `${group.name} Cards | KpopQuiz`,
    description: `Collect all ${group.name} cards. Open packs, complete your collection.`,
    alternates: { canonical: `/cards/${groupSlug}` },
  };
}

export default async function GroupCollectionPage({ params }: PageProps) {
  const { groupSlug } = await params;
  const group = getGroupMeta(groupSlug);

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: cards } = await supabase
    .from('dev_cards')
    .select('*')
    .eq('group_slug', groupSlug)
    .eq('is_published', true)
    .order('card_number');

  if (!cards || cards.length === 0) notFound();

  const ownedIds = new Set<string>();
  if (user) {
    const { data } = await supabase.from('dev_user_cards').select('card_id').eq('user_id', user.id);
    data?.forEach(c => ownedIds.add(c.card_id as string));
  }

  const totalOwned = cards.filter(c => ownedIds.has(c.id)).length;

  // Group by rarity
  const rarities: Rarity[] = ['R', 'S', 'SS', 'SSS'];

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="mb-5">
        <Link href="/cards" className="text-xs text-secondary hover:text-primary transition-colors">
          &larr; Cards
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: group.bg,
            border: `1.5px solid ${group.borderColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>
            {group.emoji}
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">{group.name}</h1>
            <p className="text-xs text-secondary">{totalOwned}/{cards.length} collected</p>
          </div>
        </div>
        <div className="h-[5px] rounded-full bg-[#F0EDE8] overflow-hidden mt-3">
          <div className="h-[5px] rounded-full bg-[#D4537E] transition-all"
            style={{ width: `${(totalOwned / cards.length) * 100}%` }} />
        </div>
      </div>

      {/* Rarity sections */}
      {rarities.map(rarity => {
        const cfg = RARITY_CONFIG[rarity];
        const rarityCards = cards.filter(c => c.rarity === rarity);
        const ownedInRarity = rarityCards.filter(c => ownedIds.has(c.id)).length;

        if (rarityCards.length === 0 && (rarity === 'SS' || rarity === 'SSS')) {
          return (
            <div key={rarity} className="mb-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold"
                  style={{ background: 'rgba(255,255,255,0.65)', color: getGroupMeta(groupSlug).textColor }}>
                  {cfg.label}
                </span>
                <span className="text-xs text-ghost">Coming soon</span>
                <div className="flex-1 h-px bg-[#F0EDE8]" />
              </div>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border-2 border-dashed border-[#e0ddd6] bg-[#F5F3EE]/50 aspect-[2/3] flex flex-col items-center justify-center gap-1">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#d3d1c7" strokeWidth="1.5">
                      <rect x="5" y="9" width="10" height="8" rx="2" />
                      <path d="M7 9V6a3 3 0 0 1 6 0v3" />
                    </svg>
                    <span className="text-[8px] font-semibold text-[#d3d1c7]">Coming soon</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (rarityCards.length === 0) return null;

        return (
          <div key={rarity} className="mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold"
                style={{ background: 'rgba(255,255,255,0.65)', color: getGroupMeta(groupSlug).textColor }}>
                {cfg.label}
              </span>
              <span className="text-xs text-secondary">{ownedInRarity}/{rarityCards.length}</span>
              <div className="flex-1 h-px bg-[#F0EDE8]" />
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
              {rarityCards.map(card => (
                <CardTile
                  key={card.id}
                  card={card}
                  owned={ownedIds.has(card.id)}
                  size="md"
                  linkTo={`/cards/${groupSlug}/${card.slug}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
