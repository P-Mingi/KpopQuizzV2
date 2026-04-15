'use client';

import { useRouter } from 'next/navigation';

const MODES = [
  {
    id: 'solo',
    badge: 'No pressure',
    title: 'Solo',
    desc: 'Practice at your own pace. Pick any playlist.',
    meta: 'Unlimited plays',
    colorClass: 'bg-[#EEEDFE] border-[#CECBF6]',
    badgeClass: 'bg-[#CECBF6] text-[#3C3489]',
    titleColor: 'text-[#26215C]',
    descColor: 'text-[#7F77DD]',
    metaColor: 'text-[#AFA9EC]',
    iconStroke: '#534AB7',
    icon: (
      <>
        <circle cx="10" cy="10" r="7" />
        <path d="M10 6v4l3 2" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'ranked',
    badge: 'Competitive',
    title: 'Ranked',
    desc: 'Climb the leaderboard. Your rank is on the line.',
    meta: 'Trainee to Legend',
    colorClass: 'bg-[#FBEAF0] border-[#F4C0D1]',
    badgeClass: 'bg-[#F4C0D1] text-[#72243E]',
    titleColor: 'text-[#4B1528]',
    descColor: 'text-[#D4537E]',
    metaColor: 'text-[#ED93B1]',
    iconStroke: '#993556',
    icon: (
      <path
        d="M10 3l2.5 5 5.5 1-4 3.5 1 5.5-5-3-5 3 1-5.5-4-3.5 5.5-1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    id: 'daily',
    badge: 'One shot',
    title: 'Daily',
    desc: 'Same songs for everyone. One attempt. Compare globally.',
    meta: 'Resets at midnight KST',
    colorClass: 'bg-[#EAF3DE] border-[#C0DD97]',
    badgeClass: 'bg-[#C0DD97] text-[#27500A]',
    titleColor: 'text-[#173404]',
    descColor: 'text-[#639922]',
    metaColor: 'text-[#97C459]',
    iconStroke: '#3B6D11',
    icon: (
      <>
        <rect x="4" y="5" width="12" height="11" rx="2" />
        <path d="M4 9h12M8 3v4M12 3v4" strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'party',
    badge: 'Multiplayer',
    title: 'Party',
    desc: 'Play with friends. Up to 8 players.',
    meta: 'Create or join room',
    colorClass: 'bg-[#FAEEDA] border-[#FAC775]',
    badgeClass: 'bg-[#FAC775] text-[#633806]',
    titleColor: 'text-[#412402]',
    descColor: 'text-[#BA7517]',
    metaColor: 'text-[#EF9F27]',
    iconStroke: '#854F0B',
    icon: (
      <>
        <circle cx="7" cy="6" r="2.5" />
        <path d="M2.5 15c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" strokeLinecap="round" />
        <circle cx="14" cy="7" r="2" />
        <path d="M17 15c0-2 1.2-3 3-3" strokeLinecap="round" />
        <path d="M11 15c0-1.5 1-2.5 3-3" strokeLinecap="round" />
      </>
    ),
  },
];

export function ModeSelect() {
  const router = useRouter();

  function handleSelect(modeId: string) {
    if (modeId === 'daily') {
      router.push('/daily');
    } else if (modeId === 'party') {
      router.push('/party');
    } else {
      router.push(`/modes/playlist?mode=${modeId}`);
    }
  }

  return (
    <div className="px-1 md:px-0 py-4 md:py-6">
      <div className="flex items-center gap-2.5 mb-3 md:mb-4">
        <button
          onClick={() => router.push('/')}
          className="w-[30px] h-[30px] rounded-full bg-elevated flex items-center justify-center flex-shrink-0"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-primary"
          >
            <path d="M8 1.5L3 6l5 4.5" />
          </svg>
        </button>
        <h1 className="text-base md:text-lg font-medium text-primary">Choose your mode</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-2.5">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleSelect(mode.id)}
            className={`${mode.colorClass} rounded-[14px] md:rounded-2xl p-3.5 md:p-5 border-[1.5px] cursor-pointer transition-all hover:-translate-y-[2px] active:scale-[0.98] text-left flex md:flex-col gap-3 md:gap-0 items-center md:items-start md:min-h-[180px] md:justify-end relative overflow-hidden`}
          >
            {/* Icon */}
            <div
              className={`w-11 h-11 md:absolute md:top-3.5 md:right-3.5 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 md:opacity-50 ${mode.badgeClass.split(' ')[0]}`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 20 20"
                fill="none"
                stroke={mode.iconStroke}
                strokeWidth="1.4"
              >
                {mode.icon}
              </svg>
            </div>

            <div className="flex-1 md:flex-none">
              <span
                className={`inline-flex px-[7px] py-[2px] md:px-[9px] md:py-[3px] rounded-[5px] md:rounded-md text-[9px] md:text-[10px] font-medium mb-[3px] md:mb-2 ${mode.badgeClass}`}
              >
                {mode.badge}
              </span>
              <p className={`text-sm md:text-[17px] font-medium mb-[2px] md:mb-1 ${mode.titleColor}`}>
                {mode.title}
              </p>
              <p className={`text-[11px] leading-snug md:mb-2 ${mode.descColor}`}>{mode.desc}</p>
              <p className={`text-[10px] hidden md:block ${mode.metaColor}`}>{mode.meta}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
