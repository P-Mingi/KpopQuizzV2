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
  const bgColor = group?.color ?? '#3a2a5a';
  const label = group?.name ? `${group.name} Pack` : 'Standard Pack';
  const abbr = group?.abbr ?? '\u2B50';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex-shrink-0 w-[160px] h-[230px] md:w-[200px] md:h-[290px] rounded-[14px] md:rounded-[18px] overflow-hidden transition-all ${
        disabled ? 'opacity-50 cursor-default' : 'cursor-pointer hover:-translate-y-1 hover:scale-[1.02] hover:brightness-110'
      }`}
      style={{
        background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd, ${bgColor}99)`,
        border: `2px solid ${type === 'standard' ? 'rgba(212,83,126,0.4)' : 'rgba(154,122,204,0.4)'}`,
        boxShadow: disabled ? 'none' : `0 0 25px ${bgColor}40`,
        animation: disabled ? 'none' : 'packFloat 3s ease-in-out infinite',
      }}
    >
      {/* Diagonal stripes */}
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 8px)',
      }} />

      {/* Tear line */}
      <div className="absolute left-0 right-0 top-[40%] h-px bg-white/[0.05]" />

      {/* Badge */}
      <div className="absolute top-2.5 left-2.5 md:top-3 md:left-3">
        <span className="px-2 py-[3px] rounded-md text-[8px] md:text-[9px] font-medium text-white/80 backdrop-blur-sm"
          style={{ background: 'rgba(255,255,255,0.12)' }}>
          {type === 'standard' ? 'Always available' : `This week`}
        </span>
      </div>

      {/* Countdown for group */}
      {endsIn && (
        <div className="absolute top-2.5 right-2.5 md:top-3 md:right-3">
          <span className="px-2 py-[3px] rounded-md text-[8px] font-medium text-white/60 backdrop-blur-sm"
            style={{ background: 'rgba(0,0,0,0.25)' }}>
            {endsIn}
          </span>
        </div>
      )}

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl backdrop-blur-md flex items-center justify-center mb-3"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-lg md:text-xl font-extrabold text-white/70">{abbr}</span>
        </div>
        <p className="text-[13px] md:text-[15px] font-bold text-white mb-0.5">{label}</p>
        <p className="text-[10px] md:text-[11px] text-white/50">5 cards per pack</p>
      </div>

      {/* Bottom price bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 md:px-4 md:py-3 flex items-center justify-between backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.35)' }}>
        <span className="text-[12px] md:text-[13px] font-bold text-amber-400 tabular-nums">{cost} \u2B50</span>
        <span className="px-3 py-1 rounded-lg text-[10px] md:text-[11px] font-semibold text-white"
          style={{ background: 'rgba(212,83,126,0.8)' }}>
          Open
        </span>
      </div>
    </button>
  );
}
