'use client';

import Link from 'next/link';
import { getGroupMeta, RARITY_CONFIG } from '@/lib/cards/constants';
import type { Rarity } from '@/lib/cards/constants';

interface CardData {
  name: string;
  rarity: string;
  group_slug: string;
  art_url?: string | null;
  tags?: string[];
  position?: string | null;
  slug?: string;
  group_name?: string;
  card_number?: number;
}

interface CardTileProps {
  card: CardData;
  owned: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showHoverEffect?: boolean;
  linkTo?: string;
  hideTags?: boolean;
}

export function CardTile({ card, owned, size = 'md', onClick, showHoverEffect = true, linkTo, hideTags: _hideTags = false }: CardTileProps) {
  const rarity = (card.rarity as Rarity) in RARITY_CONFIG ? (card.rarity as Rarity) : 'R';

  if (!owned) {
    const el = <LockedCard card={card} size={size} onClick={onClick} />;
    if (linkTo) return <Link href={linkTo}>{el}</Link>;
    return el;
  }

  const g = getGroupMeta(card.group_slug);
  const r = RARITY_CONFIG[rarity];
  const isTopTier = rarity === 'SSS' || rarity === 'SS';
  const hasLogo = !!card.art_url;

  const content = (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        aspectRatio: '5/7',
        borderRadius: 14,
        padding: 0,
        border: 0,
        background: 'transparent',
        cursor: onClick || linkTo ? 'pointer' : 'default',
        position: 'relative',
        filter: `drop-shadow(0 14px 24px ${r.color}40)`,
        transition: showHoverEffect ? 'transform 200ms ease' : 'none',
      }}
      onMouseEnter={showHoverEffect ? (e) => { e.currentTarget.style.transform = 'translateY(-3px) scale(1.015)'; } : undefined}
      onMouseLeave={showHoverEffect ? (e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; } : undefined}
    >
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden',
        background: `linear-gradient(160deg, color-mix(in srgb, ${g.textColor} 80%, #000), ${g.textColor})`,
        boxShadow: `inset 0 0 0 2px ${r.color}, 0 6px 20px -4px ${r.color}55`,
      }}>
        {/* Group photo - full bleed */}
        {hasLogo ? (
          <img src={card.art_url!} alt={card.name} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(160deg, color-mix(in srgb, ${g.textColor} 80%, #000), ${g.textColor})`,
          }} />
        )}

        {/* Foil sheen for S+ */}
        {rarity !== 'R' && <span className="holo-foil" />}
        {isTopTier && <span className="holo-prism" />}
        {isTopTier && <span className="holo-grain" />}

        {/* Bottom darken for legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.85) 100%)',
        }} />

        {/* Top stamp - group name */}
        <div style={{
          position: 'absolute', top: 8, left: 10,
          letterSpacing: '0.16em', fontWeight: 900, textTransform: 'uppercase',
          color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.35)',
          fontSize: size === 'sm' ? 6 : size === 'lg' ? 11 : 9,
        }}>{g.name.replace(/\s/g, '')}</div>

        {/* Rarity gem (top-right) */}
        <div style={{
          position: 'absolute', top: 6, right: 6,
          padding: size === 'sm' ? '2px 5px' : '3px 7px', borderRadius: 6,
          background: `linear-gradient(140deg, ${r.color}, color-mix(in srgb, ${r.color} 50%, #fff))`,
          color: '#fff',
          fontSize: size === 'sm' ? 7 : 9, fontWeight: 900, letterSpacing: '0.08em',
          boxShadow: `0 2px 6px ${r.color}66, inset 0 1px 0 rgba(255,255,255,0.4)`,
        }}>{r.label}</div>

        {/* Member name plate (bottom) */}
        <div style={{
          position: 'absolute', bottom: size === 'sm' ? 5 : 8, left: size === 'sm' ? 6 : 10, right: size === 'sm' ? 6 : 10,
          color: '#fff', textAlign: 'left',
        }}>
          <div style={{
            fontSize: size === 'sm' ? 5 : size === 'lg' ? 9 : 8,
            fontWeight: 700, letterSpacing: '0.16em',
            opacity: 0.85, textTransform: 'uppercase',
          }}>{g.name === card.group_name ? (card.group_name ?? g.name) : g.name}</div>
          <div style={{
            fontSize: size === 'sm' ? 9 : size === 'lg' ? 18 : 16,
            fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05,
            textShadow: '0 1px 6px rgba(0,0,0,0.65)',
            marginTop: 2,
          }}>{card.name}</div>
        </div>

        {/* Embossed inner edge */}
        <span className="holo-edge" />
      </div>
    </div>
  );

  if (linkTo) return <Link href={linkTo}>{content}</Link>;
  return content;
}

function LockedCard({ card, size, onClick }: { card: CardData; size: string; onClick?: (() => void) | undefined }) {
  const g = getGroupMeta(card.group_slug);
  const rarity = (card.rarity as Rarity) in RARITY_CONFIG ? (card.rarity as Rarity) : 'R';
  const r = RARITY_CONFIG[rarity];

  return (
    <div
      onClick={onClick}
      style={{
        width: '100%',
        aspectRatio: '5/7',
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        border: '1.5px dashed var(--border)',
        background: 'linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Rarity badge top-left */}
      <div style={{
        position: 'absolute', top: 8, left: 8,
        padding: '3px 8px', borderRadius: 6, background: 'var(--bg-surface)',
        border: '1px solid var(--border)', color: 'var(--text-tertiary)',
        fontSize: size === 'sm' ? 7 : 9, fontWeight: 800, letterSpacing: '0.08em',
      }}>{r.label}</div>

      {/* Center lock */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-tertiary)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '1.5px dashed var(--text-tertiary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>?</div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Locked</div>
      </div>

      {/* Group name at bottom */}
      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center',
        fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>{g.name}</div>
    </div>
  );
}
