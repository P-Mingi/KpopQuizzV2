'use client';

import { useRouter } from 'next/navigation';

export function PlayButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/modes')}
      className="w-[130px] h-[130px] md:w-[160px] md:h-[160px] rounded-full relative flex items-center justify-center group cursor-pointer"
    >
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-2 border-accent/30" />
      {/* Inner ring */}
      <div className="absolute inset-2 md:inset-[10px] rounded-full border-[1.5px] border-accent/15" />
      {/* Button */}
      <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full bg-accent flex flex-col items-center justify-center relative z-[2] transition-all group-hover:brightness-110 group-active:scale-95">
        <svg width="24" height="24" className="md:w-[28px] md:h-[28px] mb-1" viewBox="0 0 24 24" fill="#fff">
          <path d="M6 3l14 9-14 9z" />
        </svg>
        <span className="text-sm md:text-base font-medium text-white tracking-wider">PLAY</span>
      </div>
    </button>
  );
}
