'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function PartyLanding() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');

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
    <div className="px-1 md:px-0 py-4 md:py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2.5 mb-4">
        <button
          onClick={() => router.push('/modes')}
          className="w-[30px] h-[30px] rounded-full bg-elevated flex items-center justify-center flex-shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary">
            <path d="M8 1.5L3 6l5 4.5" />
          </svg>
        </button>
        <h1 className="text-base md:text-lg font-medium text-primary">Party mode</h1>
      </div>

      {/* Create room cards */}
      <p className="text-xs text-ghost mb-2">Choose how to play:</p>
      <div className="flex flex-col gap-2 mb-6">
        <button
          onClick={() => handleCreate('everyone')}
          disabled={creating}
          className="p-4 rounded-xl border-[1.5px] border-[#CECBF6] bg-[#EEEDFE] text-left transition-all hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-50"
        >
          <p className="text-sm font-medium text-[#26215C] mb-1">Everyone mode</p>
          <p className="text-[11px] text-[#7F77DD] leading-snug">
            Everyone hears the music on their own device. All players answer independently. Live leaderboard.
          </p>
          <p className="text-[10px] text-[#AFA9EC] mt-1">Best for remote friends</p>
        </button>

        <button
          onClick={() => handleCreate('kahoot')}
          disabled={creating}
          className="p-4 rounded-xl border-[1.5px] border-[#FAC775] bg-[#FAEEDA] text-left transition-all hover:-translate-y-[1px] active:scale-[0.98] disabled:opacity-50"
        >
          <p className="text-sm font-medium text-[#412402] mb-1">Kahoot mode</p>
          <p className="text-[11px] text-[#BA7517] leading-snug">
            One screen plays the music for everyone. Other players only see answer buttons on their phone.
          </p>
          <p className="text-[10px] text-[#EF9F27] mt-1">Best for same room / TV</p>
        </button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-subtle" />
        <span className="text-[10px] text-ghost">or</span>
        <div className="flex-1 h-px bg-subtle" />
      </div>

      {/* Join room */}
      <p className="text-xs font-medium text-primary mb-2">Join a room</p>
      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="px-3 py-2.5 rounded-xl border border-subtle bg-primary text-sm text-primary placeholder:text-ghost focus:outline-none focus:border-accent transition-colors"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="Enter 6-letter code"
            maxLength={6}
            className="flex-1 px-3 py-2.5 rounded-xl border border-subtle bg-primary text-sm text-primary font-mono tracking-widest placeholder:text-ghost placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleJoin}
            disabled={joining || joinCode.length !== 6}
            className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {joining ? '...' : 'Join'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-wrong mt-3 text-center">{error}</p>
      )}
    </div>
  );
}
