'use client';

import Link from 'next/link';
import { RARITY_CONFIG, getGroupMeta, type Rarity } from '@/lib/cards/constants';

interface CardData {
  slug: string;
  name: string;
  rarity: string;
  group_slug: string;
  group_name: string;
  art_url?: string | null;
  tags?: string[];
  position?: string | null;
  card_number?: number;
}

interface Props {
  card: CardData;
  owned: boolean;
  size?: 'sm' | 'md' | 'lg';
  showHoverEffect?: boolean;
  linkTo?: string;
}

export function CardTile({ card, owned, size = 'md', showHoverEffect = true, linkTo }: Props) {
  const rarity = RARITY_CONFIG[card.rarity as Rarity] ?? RARITY_CONFIG.R;
  const group = getGroupMeta(card.group_slug);

  const sizeClasses = {
    sm: 'rounded-[10px] text-[9px]',
    md: 'rounded-xl text-[11px]',
    lg: 'rounded-2xl text-[16px] w-[200px] md:w-[260px]',
  };

  const badgeSize = size === 'lg' ? 'text-[11px] px-2 py-0.5' : size === 'md' ? 'text-[8px] px-1.5 py-[2px]' : 'text-[7px] px-1 py-[1px]';
  const nameSize = size === 'lg' ? 'text-[16px]' : size === 'md' ? 'text-[11px]' : 'text-[9px]';

  const content = (
    <div
      className={`relative overflow-hidden aspect-[2/3] ${sizeClasses[size]} ${
        showHoverEffect && owned ? 'transition-all duration-200 hover:-translate-y-1 hover:scale-[1.03] cursor-pointer' : ''
      } group`}
      style={{
        border: owned
          ? `${rarity.borderWidth}px solid ${rarity.color}`
          : '2px dashed #e0ddd6',
        boxShadow: owned && rarity.glow !== 'none' ? `0 0 20px ${rarity.glow}` : owned ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
        background: owned ? (card.art_url ? undefined : group.color) : '#F5F3EE',
      }}
    >
      {owned ? (
        <>
          {/* Art or color fallback */}
          {card.art_url ? (
            <img src={card.art_url} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-bold text-white/[0.06]" style={{ fontSize: size === 'lg' ? '72px' : size === 'md' ? '48px' : '32px' }}>
                {card.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.65) 65%, rgba(0,0,0,0.88))' }} />

          {/* Group badge top-left */}
          <div className={`absolute top-1.5 left-1.5 ${badgeSize} rounded font-extrabold text-white/70 backdrop-blur-sm`}
            style={{ background: 'rgba(0,0,0,0.35)' }}>
            {group.abbr}
          </div>

          {/* Rarity badge top-right */}
          <div className={`absolute top-1.5 right-1.5 ${badgeSize} rounded font-extrabold`}
            style={{ background: rarity.badgeBg, color: rarity.badgeText }}>
            {rarity.label}
          </div>

          {/* Info bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className={`${nameSize} font-bold text-white leading-tight truncate`}>{card.name}</p>
            <p className="text-white/45 truncate" style={{ fontSize: size === 'lg' ? '11px' : '8px' }}>{card.group_name}</p>
            {size !== 'sm' && card.tags && card.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {card.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="px-1.5 py-[1px] rounded text-white/70 backdrop-blur-sm"
                    style={{ fontSize: '7px', background: 'rgba(0,0,0,0.3)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Missing card */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="font-bold text-[#d3d1c7]" style={{ fontSize: size === 'lg' ? '48px' : size === 'md' ? '32px' : '24px' }}>?</span>
            <span className="text-[#d3d1c7]" style={{ fontSize: size === 'lg' ? '10px' : '8px' }}>{rarity.drop} chance</span>
          </div>
          {/* Rarity badge faded */}
          <div className={`absolute top-1.5 right-1.5 ${badgeSize} rounded font-extrabold opacity-35`}
            style={{ background: rarity.badgeBg, color: rarity.badgeText }}>
            {rarity.label}
          </div>
          {/* Group badge faded */}
          <div className={`absolute top-1.5 left-1.5 ${badgeSize} rounded font-extrabold opacity-40 text-[#d3d1c7]`}
            style={{ background: 'rgba(0,0,0,0.08)' }}>
            {group.abbr}
          </div>
          {/* Name ghost */}
          <div className="absolute bottom-0 left-0 right-0 p-2">
            <p className={`${nameSize} font-medium text-[#d3d1c7] truncate`}>{card.name}</p>
          </div>
        </>
      )}
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }
  return content;
}
