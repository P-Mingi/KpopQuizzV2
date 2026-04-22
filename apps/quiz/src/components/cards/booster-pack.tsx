'use client';

import { getGroupMeta } from '@/lib/cards/constants';

interface Props {
  type: 'standard' | 'group';
  cost: number;
  groupSlug?: string;
  endsIn?: string;
  onClick: () => void;
  disabled?: boolean;
}

export function BoosterPack({ type, cost, groupSlug, endsIn, onClick, disabled }: Props) {
  const group = groupSlug ? getGroupMeta(groupSlug) : null;
  const label = group?.name ? `${group.name} Pack` : 'Standard Pack';
  const emoji = group?.emoji ?? '\u2B50';

  // Candy gradient: use group bg or default pink
  const bgGradient = group?.bg ?? 'linear-gradient(155deg, #fff0f3, #ffe0e8, #ffd0d8)';
  const borderColor = group?.borderColor ?? 'rgba(255,200,210,0.5)';
  const shadowColor = group?.shadowColor ?? 'rgba(255,150,180,0.15)';
  const textColor = group?.textColor ?? '#d06080';
  const textMuted = group?.textMuted ?? 'rgba(220,100,140,0.4)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        flexShrink: 0,
        width: 160,
        height: 230,
        borderRadius: 18,
        overflow: 'hidden',
        transition: 'all 0.2s',
        background: bgGradient,
        border: `2.5px solid ${borderColor}`,
        boxShadow: disabled ? 'none' : `0 4px 20px ${shadowColor}`,
        animation: disabled ? 'none' : 'packFloat 3s ease-in-out infinite',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
      }}
    >
      {/* Shimmer overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(135deg, transparent 25%, rgba(255,255,255,0.18) 42%, transparent 50%)',
      }} />

      {/* Diagonal stripes */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 8px)',
      }} />

      {/* Top badge */}
      <div style={{ position: 'absolute', top: 10, left: 10 }}>
        <span style={{
          padding: '3px 8px', borderRadius: 8,
          fontSize: 8, fontWeight: 600, color: textColor,
          background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(4px)',
          border: `1px solid ${borderColor}`,
        }}>
          {type === 'standard' ? 'Always available' : 'This week'}
        </span>
      </div>

      {/* Countdown */}
      {endsIn && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{
            padding: '3px 8px', borderRadius: 8,
            fontSize: 8, fontWeight: 600, color: textMuted,
            background: 'rgba(255,255,255,0.4)',
          }}>
            {endsIn}
          </span>
        </div>
      )}

      {/* Center content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(4px)',
          border: `1.5px solid ${borderColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 10, fontSize: 22,
        }}>
          {emoji}
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: textColor, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 10, color: textMuted, margin: 0, marginTop: 2 }}>5 cards per pack</p>
      </div>

      {/* Bottom price bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '10px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(4px)',
        borderTop: `1px solid ${borderColor}`,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e8a060' }}>{cost} \u2B50</span>
        <span style={{
          padding: '4px 12px', borderRadius: 10,
          fontSize: 10, fontWeight: 700, color: '#fff',
          background: textColor,
        }}>
          Open
        </span>
      </div>
    </button>
  );
}
