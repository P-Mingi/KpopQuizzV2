'use client';

import { useState } from 'react';
import { createBrowserClient } from '@kpopquiz/shared/supabase/client';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import { getSoundEnabled, toggleSound } from '@/lib/sounds';

function SettingsRow({ icon, label, right, onClick, destructive }: {
  icon: React.ReactNode; label: string; right?: React.ReactNode; onClick?: (() => void) | undefined; destructive?: boolean | undefined;
}) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] ${onClick ? 'cursor-pointer hover:bg-[#FAF9F6] dark:hover:bg-[rgba(255,255,255,0.06)] active:scale-[0.99]' : ''} transition-all w-full text-left`}
    >
      <div className={`w-8 h-8 rounded-lg ${destructive ? 'bg-[#FCEBEB] dark:bg-[rgba(226,75,74,0.12)]' : 'bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)]'} flex items-center justify-center ${destructive ? 'text-[#A32D2D] dark:text-[#F09595]' : 'text-[#888780] dark:text-white/40'}`}>
        {icon}
      </div>
      <span className={`flex-1 text-xs font-medium ${destructive ? 'text-[#A32D2D] dark:text-[#F09595]' : 'text-primary'}`}>{label}</span>
      {right || (onClick && !right && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[#D3D1C7] dark:text-white/20"><path d="M4 2l4 4-4 4" /></svg>
      ))}
    </Wrapper>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`w-[38px] h-[22px] rounded-full transition-colors relative ${checked ? 'bg-[#D4537E]' : 'bg-[#E8E6E0] dark:bg-[rgba(255,255,255,0.12)]'}`}>
      <div className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => getSoundEnabled());
  const [hapticEnabled, setHapticEnabled] = useState(true);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  function handleToggleSound() {
    const next = toggleSound();
    setSoundEnabled(next);
  }

  function setTheme(target: 'light' | 'dark') {
    if (theme !== target) toggleTheme();
  }

  return (
    <div className="max-w-[500px] mx-auto px-3.5 md:px-7 py-4 md:py-6 min-h-screen bg-primary">
      {/* Top bar */}
      <div className="flex items-center gap-2.5 mb-4">
        <button onClick={() => router.push('/profile')} className="w-[30px] h-[30px] rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary"><path d="M8 1.5L3 6l5 4.5" /></svg>
        </button>
        <h1 className="text-base font-semibold text-primary">Settings</h1>
      </div>

      {/* Settings rows */}
      <div className="flex flex-col gap-2">
        {/* Theme */}
        <SettingsRow
          icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><circle cx="7" cy="7" r="3.5" /><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1 1M10.2 10.2l1 1M2.8 11.2l1-1M10.2 3.8l1-1" /></svg>}
          label="Theme"
          right={
            <div className="flex gap-1 p-0.5 rounded-lg bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)]">
              <button onClick={() => setTheme('light')} className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${theme === 'light' ? 'bg-white dark:bg-[rgba(255,255,255,0.12)] text-primary shadow-sm' : 'text-secondary'}`}>Light</button>
              <button onClick={() => setTheme('dark')} className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${theme === 'dark' ? 'bg-white dark:bg-[rgba(255,255,255,0.12)] text-primary shadow-sm' : 'text-secondary'}`}>Dark</button>
            </div>
          }
        />

        {/* Sound effects */}
        <SettingsRow
          icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M7 1.5v11M4.5 4l-2 2H1v2h1.5l2 2M10 4.5a3 3 0 010 5M11.5 2.5a6 6 0 010 9" /></svg>}
          label="Sound effects"
          right={<ToggleSwitch checked={soundEnabled} onChange={handleToggleSound} />}
        />

        {/* Haptic feedback */}
        <SettingsRow
          icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><rect x="3.5" y="1" width="7" height="12" rx="1.5" /><path d="M6 10.5h2" /></svg>}
          label="Haptic feedback"
          right={<ToggleSwitch checked={hapticEnabled} onChange={setHapticEnabled} />}
        />

        {/* Divider */}
        <div className="h-px bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] my-2" />

        {/* Community */}
        <SettingsRow
          icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><circle cx="7" cy="7" r="5.5" /><path d="M4.5 5.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5M7 11v.5" /></svg>}
          label="Community"
          onClick={() => window.open('https://www.reddit.com/r/Kpop_Verse', '_blank')}
        />

        {/* Sign out */}
        <SettingsRow
          icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M5 12.5H2.5a1 1 0 01-1-1v-9a1 1 0 011-1H5M9.5 10l3-3-3-3M12.5 7H5" /></svg>}
          label={signingOut ? 'Signing out...' : 'Sign out'}
          onClick={signingOut ? undefined : handleSignOut}
          destructive
        />
      </div>
    </div>
  );
}
