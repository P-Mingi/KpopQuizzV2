'use client';

import { useEffect } from 'react';
import { LightstickMascot } from '@/components/mascot/lightstick-mascot';

interface LevelUpOverlayProps {
  newRankTitle: string;
  newRankLevel: number;
  onDismiss: () => void;
}

export function LevelUpOverlay({ newRankTitle, newRankLevel, onDismiss }: LevelUpOverlayProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', handler);
    return () => { clearTimeout(t); window.removeEventListener('keydown', handler); };
  }, [onDismiss]);

  return (
    <div onClick={onDismiss} className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer" style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(212,83,126,0.85) 0%, rgba(0,0,0,0.9) 100%)' }}>

      {/* Confetti particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="absolute rounded-sm" style={{
            left: `${Math.random() * 100}%`,
            top: '-5%',
            width: `${5 + Math.random() * 4}px`,
            height: `${7 + Math.random() * 5}px`,
            background: ['#D4537E','#7F77DD','#EF9F27','#4CAF50','#F4C0D1','#85B7EB','#F0997B','#CECBF6'][i % 8],
            animation: `confettiFall ${5 + Math.random() * 4}s linear ${Math.random() * 3}s infinite`,
          }} />
        ))}
      </div>

      {/* Content */}
      <div onClick={e => e.stopPropagation()} className="relative z-10 flex flex-col items-center gap-3 md:gap-4 px-6">
        <h1 className="text-[28px] md:text-[36px] font-semibold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>Rank Up!</h1>

        {/* Rank icon */}
        <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-3xl bg-gradient-to-br from-[#D4537E] to-[rgba(0,0,0,0.2)] flex items-center justify-center" style={{ animation: 'iconSway 2s ease-in-out infinite' }}>
          <LightstickMascot size={56} />
        </div>

        <p className="text-white/60 text-xs md:text-sm font-medium uppercase tracking-wider">kpop blindtest</p>
        <h2 className="text-[36px] md:text-[44px] font-semibold text-white capitalize" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{newRankTitle}</h2>
        <p className="text-white/40 text-sm font-medium">Level {newRankLevel}</p>

        {/* Rewards */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"><rect x="2" y="4" width="10" height="7" rx="1.5" /><path d="M4.5 4V3a2.5 2.5 0 0 1 5 0v1" /></svg>
            <span className="text-white text-[11px] font-medium">New playlist unlocked</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"><path d="M7 2l1.5 3 3.5 0.5-2.5 2.5.6 3.5L7 9.5l-3.1 2L4.5 8 2 5.5l3.5-.5z" /></svg>
            <span className="text-white text-[11px] font-medium">+1 Power-up slot</span>
          </div>
        </div>

        <button onClick={onDismiss} className="mt-3 px-8 py-3 rounded-full bg-white text-[#D4537E] text-sm font-semibold hover:scale-[1.02] active:scale-95 transition-transform">
          Continue
        </button>
      </div>
    </div>
  );
}
