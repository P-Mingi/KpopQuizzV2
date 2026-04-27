import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { RARITY_CONFIG, getGroupMeta, type Rarity } from '@/lib/cards/constants';
import { CardDetailView } from '@/components/cards/card-detail-view';

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
    ? `${card.idol_name} from ${card.group_name} - ${card.rarity}-rank collectible card. ${card.era} era. Collect all ${card.group_name} cards on KpopQuiz.`
    : `${card.group_name} ${card.era} - ${card.rarity}-rank collectible group card.`;

  return {
    title: `${card.name} - ${card.group_name} Card | KpopQuiz`,
    description: desc,
    openGraph: { title: `${card.name} - ${card.rarity} Card`, description: desc },
    alternates: { canonical: `/cards/${groupSlug}/${cardSlug}` },
  };
}

export default async function CardDetailPage({ params }: PageProps) {
  const { groupSlug, cardSlug } = await params;
  void getGroupMeta(groupSlug); // validate slug

  const supabase = await createServerClient();
  const { data: card } = await supabase.from('dev_cards').select('*').eq('slug', cardSlug).eq('group_slug', groupSlug).single();
  if (!card) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let isOwned = false;
  if (user) {
    const { data } = await supabase.from('dev_user_cards').select('id').eq('user_id', user.id).eq('card_id', card.id).maybeSingle();
    isOwned = !!data;
  }

  const { count: totalCards } = await supabase.from('dev_cards').select('*', { count: 'exact', head: true }).eq('is_published', true).eq('group_slug', groupSlug);
  const idolInfo = (card.idol_info ?? {}) as Record<string, string>;

  return (
    <div className="pb-12">
      <CardDetailView
        card={{
          name: card.name as string,
          group_slug: card.group_slug as string,
          group_name: card.group_name as string,
          rarity: (card.rarity as Rarity) in RARITY_CONFIG ? (card.rarity as Rarity) : 'R',
          era: (card.era as string) ?? '',
          position: (card.position as string) ?? undefined,
          card_number: (card.card_number as number) ?? 0,
          total_cards: totalCards ?? 0,
          tags: (card.tags as string[]) ?? undefined,
          description: (card.description as string) ?? undefined,
          art_url: (card.art_url as string | null) ?? null,
          slug: card.slug as string,
          idol_info: {
            ...(idolInfo.real_name ? { real_name: idolInfo.real_name } : {}),
            ...(idolInfo.birthday ? { birthday: idolInfo.birthday } : {}),
            ...(idolInfo.nationality ? { nationality: idolInfo.nationality } : {}),
            ...(idolInfo.height ? { height: idolInfo.height } : {}),
            ...(idolInfo.zodiac ? { zodiac: idolInfo.zodiac } : {}),
            ...(idolInfo.mbti ? { mbti: idolInfo.mbti } : {}),
          },
        }}
        isOwned={isOwned}
      />
    </div>
  );
}
