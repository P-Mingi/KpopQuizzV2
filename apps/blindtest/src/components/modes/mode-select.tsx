'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import { TipBanner } from '@/components/shared/tip-banner';

const MODES = [
  {
    id: 'solo',
    badge: 'No pressure',
    title: 'Solo',
    desc: 'Practice at your own pace. Pick any playlist.',
    meta: 'Unlimited plays',
    light: {
      bg: '#EEEDFE',
      border: '#CECBF6',
      badgeBg: '#CECBF6',
      badgeText: '#3C3489',
      title: '#26215C',
      desc: '#7F77DD',
      meta: '#AFA9EC',
      iconStroke: '#534AB7',
    },
    dark: {
      bg: 'rgba(83,74,183,0.12)',
      border: 'rgba(83,74,183,0.25)',
      badgeBg: 'rgba(83,74,183,0.3)',
      badgeText: '#CECBF6',
      title: 'rgba(255,255,255,0.9)',
      desc: '#AFA9EC',
      meta: '#AFA9EC',
      iconStroke: '#534AB7',
    },
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
    light: {
      bg: '#FBEAF0',
      border: '#F4C0D1',
      badgeBg: '#F4C0D1',
      badgeText: '#72243E',
      title: '#4B1528',
      desc: '#D4537E',
      meta: '#ED93B1',
      iconStroke: '#993556',
    },
    dark: {
      bg: 'rgba(212,83,126,0.12)',
      border: 'rgba(212,83,126,0.25)',
      badgeBg: 'rgba(212,83,126,0.3)',
      badgeText: '#F4C0D1',
      title: 'rgba(255,255,255,0.9)',
      desc: '#ED93B1',
      meta: '#ED93B1',
      iconStroke: '#993556',
    },
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
    light: {
      bg: '#EAF3DE',
      border: '#C0DD97',
      badgeBg: '#C0DD97',
      badgeText: '#27500A',
      title: '#173404',
      desc: '#639922',
      meta: '#97C459',
      iconStroke: '#3B6D11',
    },
    dark: {
      bg: 'rgba(99,153,34,0.12)',
      border: 'rgba(99,153,34,0.25)',
      badgeBg: 'rgba(99,153,34,0.3)',
      badgeText: '#C0DD97',
      title: 'rgba(255,255,255,0.9)',
      desc: '#97C459',
      meta: '#97C459',
      iconStroke: '#3B6D11',
    },
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
    light: {
      bg: '#FAEEDA',
      border: '#FAC775',
      badgeBg: '#FAC775',
      badgeText: '#633806',
      title: '#412402',
      desc: '#BA7517',
      meta: '#EF9F27',
      iconStroke: '#854F0B',
    },
    dark: {
      bg: 'rgba(186,117,23,0.12)',
      border: 'rgba(186,117,23,0.25)',
      badgeBg: 'rgba(186,117,23,0.3)',
      badgeText: '#FAC775',
      title: 'rgba(255,255,255,0.9)',
      desc: '#EF9F27',
      meta: '#EF9F27',
      iconStroke: '#854F0B',
    },
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
    <div className="px-3.5 md:px-0 py-4 md:py-6 max-w-[800px] mx-auto">
      {/* Back button + title */}
      <div className="flex items-center gap-2.5 mb-3 md:mb-4 px-3.5 md:px-0">
        <button
          onClick={() => router.push('/')}
          className="w-[30px] h-[30px] rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0"
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

      {/* Mode cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-2.5">
        {MODES.map((mode) => {
          const c = isDark ? mode.dark : mode.light;

          return (
            <button
              key={mode.id}
              onClick={() => handleSelect(mode.id)}
              className="cursor-pointer transition-all hover:-translate-y-[2px] active:scale-[0.98] text-left border-[1.5px] relative overflow-hidden rounded-[14px] p-3.5 flex gap-3 items-center md:rounded-2xl md:p-5 md:flex-col md:items-start md:justify-end md:min-h-[200px]"
              style={{
                background: c.bg,
                borderColor: c.border,
              }}
            >
              {/* Background icon - desktop only */}
              <div
                className="hidden md:flex absolute top-3.5 right-3.5 w-11 h-11 rounded-xl items-center justify-center opacity-[0.08] dark:opacity-[0.06]"
                style={{ background: c.badgeBg }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke={c.iconStroke}
                  strokeWidth="1.4"
                >
                  {mode.icon}
                </svg>
              </div>

              {/* Mobile icon - mobile only */}
              <div
                className="md:hidden w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: c.badgeBg }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke={c.iconStroke}
                  strokeWidth="1.4"
                >
                  {mode.icon}
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 md:flex-none">
                <span
                  className="inline-flex px-[7px] py-[2px] md:px-[9px] md:py-[3px] rounded-[5px] md:rounded-md text-[9px] md:text-[10px] font-medium mb-[3px] md:mb-2"
                  style={{ background: c.badgeBg, color: c.badgeText }}
                >
                  {mode.badge}
                </span>
                <p
                  className="text-sm md:text-[17px] font-medium mb-[2px] md:mb-1"
                  style={{ color: c.title }}
                >
                  {mode.title}
                </p>
                <p
                  className="text-[11px] leading-snug md:mb-2"
                  style={{ color: c.desc }}
                >
                  {mode.desc}
                </p>
                <p
                  className="text-[10px] hidden md:block"
                  style={{ color: c.meta }}
                >
                  {mode.meta}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tip banner */}
      <TipBanner
        tips={[
          'Ranked mode gives +20% bonus XP',
          'Party mode supports up to 8 players',
          'Daily challenge resets at midnight KST',
        ]}
      />
    </div>
  );
}
