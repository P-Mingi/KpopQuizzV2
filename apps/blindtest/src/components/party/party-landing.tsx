'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TipBanner } from '@/components/shared/tip-banner';

export function PartyLanding() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName] = useState('');

  const handleCreate = useCallback(async (mode: 'everyone' | 'kahoot') => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/party/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, playlist: 'all' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create room');
        setCreating(false);
        return;
      }
      router.push(`/party/${data.code}`);
    } catch {
      setError('Network error');
      setCreating(false);
    }
  }, [router]);

  const handleJoin = useCallback(async () => {
    if (joinCode.length !== 6) return;
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`/api/party/${joinCode.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: displayName || 'Player' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to join room');
        setJoining(false);
        return;
      }
      router.push(`/party/${joinCode.toUpperCase()}`);
    } catch {
      setError('Network error');
      setJoining(false);
    }
  }, [joinCode, displayName, router]);

  return (
    <div className="px-3.5 md:px-0 py-4 md:py-6 max-w-[500px] mx-auto">
      <div className="flex items-center gap-2.5 mb-4">
        <button
          onClick={() => router.push('/')}
          className="w-[30px] h-[30px] rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary">
            <path d="M8 1.5L3 6l5 4.5" />
          </svg>
        </button>
        <h1 className="text-base md:text-lg font-medium text-primary">Party mode</h1>
      </div>

      {/* Everyone card */}
      <button
        onClick={() => handleCreate('everyone')}
        disabled={creating}
        className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-[14px] border-[1.5px] border-[#CECBF6] dark:border-[rgba(83,74,183,0.25)] bg-[#EEEDFE] dark:bg-[rgba(83,74,183,0.12)] text-left transition-all hover:-translate-y-[2px] active:scale-[0.98] disabled:opacity-50"
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#CECBF6] dark:bg-[rgba(83,74,183,0.3)] flex items-center justify-center flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#534AB7" strokeWidth="1.5" strokeLinecap="round"><path d="M3 13h2l2-4 3 8 3-8 2 4h2" /><path d="M1 17h20" /></svg>
        </div>
        <div className="flex-1">
          <p className="text-[13px] md:text-sm font-semibold text-[#26215C] dark:text-[rgba(255,255,255,0.9)] mb-[2px]">Everyone hears the music</p>
          <p className="text-[10px] md:text-[11px] text-[#7F77DD] dark:text-[#AFA9EC] leading-snug mb-1.5">All players answer on their own device. Live leaderboard.</p>
          <span className="text-[9px] font-medium text-[#AFA9EC] dark:text-[#CECBF6]">Best for remote friends</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#AFA9EC" strokeWidth="1.2" strokeLinecap="round"><path d="M5 2.5L9.5 7 5 11.5" /></svg>
      </button>

      {/* Kahoot card */}
      <button
        onClick={() => handleCreate('kahoot')}
        disabled={creating}
        className="w-full flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-[14px] border-[1.5px] border-[#FAC775] dark:border-[rgba(186,117,23,0.25)] bg-[#FAEEDA] dark:bg-[rgba(186,117,23,0.12)] text-left transition-all hover:-translate-y-[2px] active:scale-[0.98] mt-2 disabled:opacity-50"
      >
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#FAC775] dark:bg-[rgba(186,117,23,0.3)] flex items-center justify-center flex-shrink-0">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#854F0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="16" height="11" rx="2" /><path d="M8 17h6" /><path d="M11 13v4" /></svg>
        </div>
        <div className="flex-1">
          <p className="text-[13px] md:text-sm font-semibold text-[#412402] dark:text-[rgba(255,255,255,0.9)] mb-[2px]">One screen plays the music</p>
          <p className="text-[10px] md:text-[11px] text-[#BA7517] dark:text-[#EF9F27] leading-snug mb-1.5">Others see only answer buttons on their phone.</p>
          <span className="text-[9px] font-medium text-[#EF9F27] dark:text-[#FAC775]">Best for same room</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#EF9F27" strokeWidth="1.2" strokeLinecap="round"><path d="M5 2.5L9.5 7 5 11.5" /></svg>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-[#E8E6E0] dark:bg-[rgba(255,255,255,0.06)]" />
        <span className="text-[10px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] font-medium">or</span>
        <div className="flex-1 h-px bg-[#E8E6E0] dark:bg-[rgba(255,255,255,0.06)]" />
      </div>

      {/* Join room */}
      <div>
        <p className="text-xs font-semibold text-primary mb-2">Join a room</p>
        <div className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            maxLength={6}
            placeholder="ABCDEF"
            className="flex-1 px-4 py-3 rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.1)] bg-white dark:bg-[rgba(255,255,255,0.04)] text-primary text-center text-lg font-semibold tracking-[4px] placeholder:text-[#D3D1C7] dark:placeholder:text-[rgba(255,255,255,0.15)] focus:outline-none focus:border-[#D4537E]"
          />
          <button
            onClick={handleJoin}
            disabled={joining || joinCode.length !== 6}
            className="px-6 py-3 rounded-xl bg-[#D4537E] text-white text-sm font-semibold disabled:opacity-30 hover:bg-[#C44A72] active:scale-[0.97] transition-all"
          >
            {joining ? '...' : 'Join'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-wrong mt-3 text-center">{error}</p>
      )}

      <TipBanner tips={['Party mode supports up to 8 players', 'Share the room code with friends']} />
    </div>
  );
}
