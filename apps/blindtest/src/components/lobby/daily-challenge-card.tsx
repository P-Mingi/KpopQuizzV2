import Link from 'next/link';

export function DailyChallengeCard({ timeLeft, played }: { timeLeft: string; played?: boolean }) {
  return (
    <Link
      href="/daily"
      className={`w-full p-3 rounded-xl border-[1.5px] bg-primary flex items-center gap-2.5 relative cursor-pointer transition-colors ${
        played
          ? 'border-subtle opacity-60'
          : 'border-[#C0DD97] hover:border-[#97C459]'
      }`}
    >
      {!played && (
        <div className="absolute top-2 right-2 w-[7px] h-[7px] rounded-full bg-[#639922] animate-pulse" />
      )}

      <div className="w-8 h-8 rounded-lg bg-[#EAF3DE] flex items-center justify-center flex-shrink-0">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#639922" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="9" cy="9" r="7" />
          <path d="M9 5v4l3 2" />
        </svg>
      </div>

      <div className="flex-1">
        <p className="text-xs font-medium text-primary">Daily challenge</p>
        <p className="text-[10px] text-tertiary">
          {played ? 'Completed today' : 'Same songs for everyone. One attempt.'}
        </p>
      </div>

      <span className="text-[11px] font-medium text-[#639922] tabular-nums">{timeLeft}</span>
    </Link>
  );
}
