'use client';

import { getGroupMeta } from '@/lib/cards/constants';

interface Props {
  type: 'standard' | 'group';
  cost: number;
  groupSlug?: string;
  endsIn?: string;
  onClick: () => void;
  disabled?: boolean;
  isLoggedIn?: boolean;
}

export function BoosterPack({ type, cost, groupSlug, endsIn, onClick, disabled, isLoggedIn = true }: Props) {
  const group = groupSlug ? getGroupMeta(groupSlug) : null;
  const label = group?.name ? `${group.name} Pack` : 'Standard Pack';
  const subtitle = type === 'standard' ? '5 cards \u00B7 guaranteed \u22651 S' : '5 cards \u00B7 better SS & SSS odds';
  const abbr = group?.abbr ?? '\u2605';

  // Dark gradient with group tint
  const bgDark = group
    ? `linear-gradient(155deg, ${group.textColor}18, #1a1a2e, ${group.textColor}10)`
    : 'linear-gradient(155deg, #2a1a3a, #1a1a2e, #1a2a3a)';
  const borderTint = group ? `${group.textColor}40` : 'rgba(212,83,126,0.3)';
  const glowColor = group ? `${group.textColor}25` : 'rgba(212,83,126,0.15)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position: 'relative',
        flexShrink: 0,
        width: 200,
        height: 290,
        borderRadius: 20,
        overflow: 'hidden',
        transition: 'all 0.2s',
        background: bgDark,
        border: `2px solid ${borderTint}`,
        boxShadow: disabled ? 'none' : `0 8px 30px ${glowColor}`,
        animation: disabled ? 'none' : 'packFloat 3s ease-in-out infinite',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {/* Diagonal stripes */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 8px)',
      }} />

      {/* Shimmer */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(135deg, transparent 25%, rgba(255,255,255,0.05) 42%, transparent 50%)',
      }} />

      {/* Top badge */}
      <div style={{ position: 'absolute', top: 12, left: 12 }}>
        <span style={{
          padding: '4px 10px', borderRadius: 8,
          fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(4px)',
        }}>
          {type === 'standard' ? 'Always available' : 'This week'}
        </span>
      </div>

      {/* Countdown */}
      {endsIn && (
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span style={{
            padding: '4px 10px', borderRadius: 8,
            fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
            background: 'rgba(0,0,0,0.3)',
          }}>
            {endsIn}
          </span>
        </div>
      )}

      {/* Center */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14, fontSize: 20, fontWeight: 800,
          color: 'rgba(255,255,255,0.6)',
        }}>
          {type === 'standard' ? '\u2605' : abbr}
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: 0, marginTop: 3 }}>{subtitle}</p>
      </div>

      {/* Bottom price bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(4px)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#e8a060' }}>{cost} byeol</span>
        {isLoggedIn ? (
          <span style={{
            padding: '6px 16px', borderRadius: 10,
            fontSize: 11, fontWeight: 700, color: '#fff',
            background: 'rgba(212,83,126,0.8)',
          }}>
            Open
          </span>
        ) : (
          <span style={{
            padding: '6px 16px', borderRadius: 10,
            fontSize: 10, fontWeight: 600, color: '#888780',
            background: 'rgba(255,255,255,0.1)',
          }}>
            Sign in to open
          </span>
        )}
      </div>
    </button>
  );
}
