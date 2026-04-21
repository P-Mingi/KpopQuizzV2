import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { RARITY_CONFIG, getGroupMeta, type Rarity } from '@/lib/cards/constants';
import { CardTile } from '@/components/cards/card-tile';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ groupSlug: string; cardSlug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { groupSlug, cardSlug } = await params;
  const supabase = await createServerClient();
  const { data: card } = await supabase.from('dev_cards').select('*').eq('slug', cardSlug).eq('group_slug', groupSlug).single();
  if (!card) return { title: 'Card not found' };

  const desc = card.idol_name
    ? `${card.idol_name} from ${card.group_name} -- ${card.rarity}-rank collectible card. ${card.era} era. Collect all ${card.group_name} cards on KpopQuiz.`
    : `${card.group_name} ${card.era} -- ${card.rarity}-rank collectible group card.`;

  return {
    title: `${card.name} -- ${card.group_name} Card | KpopQuiz`,
    description: desc,
    openGraph: { title: `${card.name} -- ${card.rarity} Card`, description: desc },
    alternates: { canonical: `/cards/${groupSlug}/${cardSlug}` },
  };
}

export default async function CardDetailPage({ params }: PageProps) {
  const { groupSlug, cardSlug } = await params;
  const group = getGroupMeta(groupSlug);

  const supabase = await createServerClient();
  const { data: card } = await supabase.from('dev_cards').select('*').eq('slug', cardSlug).eq('group_slug', groupSlug).single();
  if (!card) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let isOwned = false;
  if (user) {
    const { data } = await supabase.from('dev_user_cards').select('id').eq('user_id', user.id).eq('card_id', card.id).maybeSingle();
    isOwned = !!data;
  }

  const rarity = RARITY_CONFIG[card.rarity as Rarity] ?? RARITY_CONFIG.R;
  const idolInfo = (card.idol_info ?? {}) as Record<string, string>;

  const detailRows = [
    idolInfo.real_name && ['Real name', idolInfo.real_name],
    ['Group', card.group_name],
    card.position && ['Position', card.position],
    ['Era', card.era],
    idolInfo.birthday && ['Birthday', idolInfo.birthday],
    idolInfo.nationality && ['Nationality', idolInfo.nationality],
    idolInfo.height && ['Height', idolInfo.height],
    idolInfo.zodiac && ['Zodiac', idolInfo.zodiac],
    idolInfo.mbti && ['MBTI', idolInfo.mbti],
    ['Rarity', `${card.rarity} (${rarity.drop} per slot)`],
  ].filter(Boolean) as [string, string][];

  // Count total cards
  const { count: totalCards } = await supabase.from('dev_cards').select('*', { count: 'exact', head: true }).eq('is_published', true);

  return (
    <div className="pb-12">
      <Link href={`/cards/${groupSlug}`} className="text-xs text-secondary hover:text-primary transition-colors">
        &larr; {group.name} collection
      </Link>

      <div className="flex flex-col md:flex-row gap-8 mt-4">
        {/* Left: Card art */}
        <div className="flex-shrink-0 flex justify-center md:justify-start relative">
          <CardTile card={card} owned={isOwned} size="lg" showHoverEffect={false} />
          {!isOwned && (
            <div className="absolute inset-0 w-[200px] md:w-[260px] rounded-2xl bg-black/30 flex items-center justify-center backdrop-blur-[2px]" style={{ aspectRatio: '2/3' }}>
              <div className="text-center">
                <svg width="32" height="32" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" className="mx-auto mb-2">
                  <rect x="5" y="9" width="10" height="8" rx="2" />
                  <path d="M7 9V6a3 3 0 0 1 6 0v3" />
                </svg>
                <p className="text-xs text-white/60 font-medium">Not in your collection yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold"
              style={{ background: rarity.badgeBg, color: rarity.badgeText }}>
              {rarity.label}
            </span>
            <span className="text-xs text-ghost">#{String(card.card_number).padStart(3, '0')} / {totalCards ?? '?'}</span>
          </div>

          <h1 className="text-2xl font-bold text-primary mb-0.5">{card.name}</h1>
          <p className="text-sm text-secondary mb-4">{card.era}</p>

          {/* About */}
          {card.description && (
            <div className="mb-4 p-4 rounded-xl bg-surface border border-default">
              <h3 className="text-[10px] font-semibold text-ghost uppercase tracking-wider mb-2">About</h3>
              <p className="text-xs text-secondary leading-relaxed">{card.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="mb-4 p-4 rounded-xl bg-surface border border-default">
            <h3 className="text-[10px] font-semibold text-ghost uppercase tracking-wider mb-2">Details</h3>
            <div className="space-y-1.5">
              {detailRows.map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-secondary">{label}</span>
                  <span className="font-medium text-primary">{value}</span>
                </div>
              ))}
            </div>
            {card.tags && card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-default">
                {(card.tags as string[]).map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-elevated text-secondary">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* How to get */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <h3 className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider mb-2">How to get this card</h3>
            <p className="text-xs text-amber-700 mb-3">
              Rarity: {card.rarity} ({rarity.drop} per card slot). Available in Standard Pack and {group.name} Group Pack.
            </p>
            <Link href="/cards" className="inline-block px-5 py-2 rounded-lg bg-[#D4537E] text-white text-xs font-semibold hover:bg-[#C44A72] transition-colors">
              Open a pack
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
