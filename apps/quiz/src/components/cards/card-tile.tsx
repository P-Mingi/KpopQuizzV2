'use client';

import Link from 'next/link';
import { getGroupMeta, RARITY_CONFIG, getDecoPositions } from '@/lib/cards/constants';
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
}

const SIZES = {
  sm: { nameFs: 10, groupFs: 6, tagFs: 5, rarityFs: 7, groupBadgeFs: 5.5, padBottom: '14px 6px 6px' },
  md: { nameFs: 13, groupFs: 7, tagFs: 5.5, rarityFs: 9, groupBadgeFs: 7, padBottom: '18px 10px 10px' },
  lg: { nameFs: 15, groupFs: 7, tagFs: 5.5, rarityFs: 9, groupBadgeFs: 7, padBottom: '18px 10px 10px' },
};

export function CardTile({ card, owned, size = 'md', onClick, showHoverEffect = true, linkTo }: CardTileProps) {
  const rarity = (card.rarity as Rarity) in RARITY_CONFIG ? (card.rarity as Rarity) : 'R';

  if (!owned) {
    const el = <MissingCard card={card} size={size} onClick={onClick} />;
    if (linkTo) return <Link href={linkTo}>{el}</Link>;
    return el;
  }

  const g = getGroupMeta(card.group_slug);
  const r = RARITY_CONFIG[rarity];
  const s = SIZES[size];
  const cardIdx = card.card_number ?? 0;
  const bubbles = getDecoPositions(cardIdx, r.bubbleCount, 'bubble');
  const stars = getDecoPositions(cardIdx, r.starCount, 'star');
  const starChars = ['\u2726', '\u2727', '\u2726', '\u22C6', '\u2727'];

  const content = (
    <div
      onClick={onClick}
      style={{
        aspectRatio: '2/3',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
        border: `${r.borderWidth}px solid ${g.borderColor}`,
        boxShadow: r.glowSpread > 0
          ? `0 4px 20px ${g.shadowColor}, 0 0 ${r.glowSpread}px ${g.shadowColor}`
          : `0 4px 20px ${g.shadowColor}`,
        cursor: onClick || linkTo ? 'pointer' : 'default',
        transition: showHoverEffect ? 'transform 0.2s, box-shadow 0.2s' : 'none',
      }}
      onMouseEnter={showHoverEffect ? (e) => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)';
        e.currentTarget.style.boxShadow = `0 8px 28px ${g.shadowColor}, 0 0 ${r.glowSpread + 10}px ${g.shadowColor}`;
      } : undefined}
      onMouseLeave={showHoverEffect ? (e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = r.glowSpread > 0
          ? `0 4px 20px ${g.shadowColor}, 0 0 ${r.glowSpread}px ${g.shadowColor}`
          : `0 4px 20px ${g.shadowColor}`;
      } : undefined}
    >
      {card.art_url ? (
        <img src={card.art_url} alt={card.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: g.bg }} />
      )}

      {!card.art_url && bubbles.map((b, i) => (
        <div key={`b${i}`} style={{
          position: 'absolute', top: b.top, left: `${b.left}%`,
          width: b.size, height: b.size, borderRadius: '50%',
          background: 'rgba(255,255,255,0.35)',
          border: b.hasBorder ? `1px solid ${g.bubbleBorder}` : 'none',
        }} />
      ))}

      {!card.art_url && stars.map((st, i) => (
        <div key={`s${i}`} style={{
          position: 'absolute', top: st.top, left: `${st.left}%`,
          fontSize: st.size, color: g.starColor,
        }}>{starChars[i % starChars.length]}</div>
      ))}

      {rarity === 'SSS' && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'linear-gradient(135deg, transparent 20%, rgba(255,220,150,0.08) 40%, transparent 50%, rgba(255,200,100,0.06) 70%, transparent 85%)',
        }} />
      )}

      {r.shimmer && (
        <div className="card-shimmer" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          opacity: 0, transition: 'opacity 0.3s',
          background: 'linear-gradient(135deg, transparent 25%, rgba(255,255,255,0.12) 42%, transparent 50%, rgba(255,200,255,0.06) 68%, transparent 80%)',
        }} />
      )}

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${g.ribbonA}, ${g.ribbonB}, ${g.ribbonA})`,
      }} />

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: s.padBottom,
        paddingTop: size === 'lg' ? 40 : 30,
        background: `linear-gradient(transparent, ${g.fadeBg} 35%, ${g.fadeBgStrong})`,
      }}>
        <p style={{ fontSize: s.nameFs, fontWeight: 700, color: g.textColor, margin: 0, textAlign: 'center' }}>{card.name}</p>
        <p style={{ fontSize: s.groupFs, color: g.textMuted, margin: 0, marginTop: 2, textAlign: 'center', letterSpacing: 1 }}>{g.name} {g.emoji}</p>
      </div>

      {card.tags && card.tags.length > 0 && size !== 'sm' && (
        <div style={{
          position: 'absolute', bottom: size === 'lg' ? 52 : 45, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 3,
        }}>
          {card.tags.slice(0, 3).map(t => (
            <span key={t} style={{
              fontSize: s.tagFs, color: g.textTags,
              padding: '1px 6px', borderRadius: 10,
              background: 'rgba(255,255,255,0.5)',
              border: `0.5px solid ${g.bubbleBorder}`,
            }}>{t}</span>
          ))}
        </div>
      )}

      <div style={{
        position: 'absolute', top: 8, right: 8,
        width: r.badgeSize, height: r.badgeSize, borderRadius: '50%',
        background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(4px)',
        border: `1.5px solid ${g.borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: s.rarityFs, fontWeight: 800, color: g.textColor,
      }}>{rarity}</div>

      <div style={{
        position: 'absolute', top: 8, left: 8,
        fontSize: s.groupBadgeFs, fontWeight: 700, color: g.textTags,
        padding: '2px 6px', borderRadius: 10,
        background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(4px)',
      }}>{'\u2661'} {g.abbr}</div>
    </div>
  );

  if (linkTo) return <Link href={linkTo}>{content}</Link>;
  return content;
}

function MissingCard({ card, size, onClick }: { card: CardData; size: string; onClick?: (() => void) | undefined }) {
  const g = getGroupMeta(card.group_slug);
  const rarity = (card.rarity as Rarity) in RARITY_CONFIG ? (card.rarity as Rarity) : 'R';
  const r = RARITY_CONFIG[rarity];
  const s = SIZES[size as keyof typeof SIZES] ?? SIZES.md;

  return (
    <div
      onClick={onClick}
      style={{
        aspectRatio: '2/3',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
        border: `2px dashed ${g.borderColor}`,
        background: 'linear-gradient(170deg, #fef8fa, #fdf2f5, #fcecf0)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 28, color: g.borderColor, opacity: 0.35 }}>?</span>
        <span style={{ fontSize: 7, color: g.borderColor, opacity: 0.3, marginTop: 2 }}>{r.drop} chance</span>
      </div>

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${g.ribbonA}, ${g.ribbonB}, ${g.ribbonA})`,
        opacity: 0.4,
      }} />

      <div style={{
        position: 'absolute', top: 8, right: 8,
        width: r.badgeSize, height: r.badgeSize, borderRadius: '50%',
        background: 'rgba(255,255,255,0.4)',
        border: `1.5px solid ${g.borderColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: s.rarityFs, fontWeight: 800, color: g.textColor,
        opacity: 0.3,
      }}>{rarity}</div>

      <div style={{
        position: 'absolute', top: 8, left: 8,
        fontSize: s.groupBadgeFs, fontWeight: 700, color: g.textTags,
        padding: '2px 6px', borderRadius: 10,
        background: 'rgba(255,255,255,0.3)',
        opacity: 0.35,
      }}>{'\u2661'} {g.abbr}</div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: s.padBottom }}>
        <p style={{ fontSize: s.nameFs, fontWeight: 700, color: g.textColor, margin: 0, textAlign: 'center', opacity: 0.2 }}>{card.name}</p>
      </div>
    </div>
  );
}
