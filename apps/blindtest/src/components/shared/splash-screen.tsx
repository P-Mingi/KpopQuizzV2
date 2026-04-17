'use client';

import { useEffect, useState } from 'react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('bt_splash_seen');
    if (seen) {
      onComplete();
      return;
    }
    setShow(true);
    const timer = setTimeout(() => {
      localStorage.setItem('bt_splash_seen', '1');
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  function handleTap() {
    localStorage.setItem('bt_splash_seen', '1');
    // Unlock audio context on user gesture
    try {
      const ctx = new AudioContext();
      ctx.resume();
    } catch {}
    onComplete();
  }

  return (
    <div
      onClick={handleTap}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #D4537E 0%, #7F77DD 50%, #26215C 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-[28px] md:text-[36px] font-semibold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>kpop</span>
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#2C2C2A] to-[#0C0C0E] flex items-center justify-center animate-[spin_4s_linear_infinite]">
          <div className="w-3 h-3 md:w-3.5 md:h-3.5 rounded-full bg-[#D4537E]" />
        </div>
        <span className="text-[28px] md:text-[36px] font-semibold text-white" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>blindtest</span>
      </div>
      <p className="text-white/50 text-xs md:text-sm font-medium">guess the song. prove you&apos;re the #1 stan.</p>

      {/* Bottom callouts */}
      <div className="absolute bottom-16 md:bottom-20 left-0 right-0 flex justify-center gap-6 md:gap-10 px-6">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round">
            <circle cx="10" cy="10" r="8" /><path d="M7 10c0-1.7 1.3-3 3-3s3 1.3 3 3" /><circle cx="10" cy="10" r="1" fill="rgba(255,255,255,0.7)" />
          </svg>
          <div>
            <p className="text-white text-[11px] md:text-xs font-semibold">This game plays music</p>
            <p className="text-white/50 text-[9px] md:text-[10px]">Make sure audio is on</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round">
            <circle cx="7" cy="7" r="4" /><circle cx="13" cy="13" r="4" />
          </svg>
          <div>
            <p className="text-white text-[11px] md:text-xs font-semibold">Play with friends</p>
            <p className="text-white/50 text-[9px] md:text-[10px]">Party mode up to 8 players</p>
          </div>
        </div>
      </div>
    </div>
  );
}
