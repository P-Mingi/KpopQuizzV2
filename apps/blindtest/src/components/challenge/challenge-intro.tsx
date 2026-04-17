'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Challenge {
  short_code: string;
  playlist: string;
  mode: string;
  creator_name: string;
  creator_score: number;
  creator_correct: number;
  creator_total: number;
  creator_time: number | null;
}

interface Props {
  challenge: Challenge;
  attemptCount: number;
  isLoggedIn: boolean;
}

function formatPlaylistName(playlist: string): string {
  if (playlist === 'all') return 'All K-pop';
  if (playlist === 'gg') return 'Girl groups';
  if (playlist === 'bg') return 'Boy groups';
  if (playlist === 'solo') return 'Solo';
  if (playlist.endsWith('-gen')) return playlist.replace('-gen', ' gen');
  return playlist;
}

/**
 * Landing page for a shared challenge link. Shows the creator's score, asks
 * for a nickname if the player isn't logged in, then routes to the play flow.
 * The nickname is stashed in sessionStorage so the GamePlayer save path can
 * pick it up on the play page.
 */
export function ChallengeIntro({ challenge, attemptCount, isLoggedIn }: Props) {
  const router = useRouter();
  const [nickname, setNickname] = useState('');

  const creatorName = challenge.creator_name;

  function handleAccept() {
    if (!isLoggedIn && nickname.trim()) {
      try {
        sessionStorage.setItem(`kbt-challenge-name-${challenge.short_code}`, nickname.trim());
      } catch {
        // ignore
      }
    }
    router.push(`/challenge/${challenge.short_code}/play`);
  }

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center px-3.5 md:px-7">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Challenger avatar */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)] border-2 border-[#D4537E] flex items-center justify-center mb-4">
          <span className="text-lg md:text-xl font-semibold text-[#D4537E]">{creatorName?.charAt(0)?.toUpperCase()}</span>
        </div>

        {/* Challenger name */}
        <p className="text-xs text-[#888780] dark:text-white/40 uppercase tracking-wider mb-1">Challenge from</p>
        <p className="text-base font-semibold text-primary mb-5">{creatorName}</p>

        {/* Challenge card */}
        <div className="w-full max-w-sm p-4 md:p-5 rounded-2xl border-[1.5px] border-[#F4C0D1] dark:border-[rgba(212,83,126,0.25)] bg-white dark:bg-[rgba(255,255,255,0.04)] mb-4">
          <div className="text-center mb-3">
            <p className="text-2xl font-bold text-primary tabular-nums">{challenge.creator_correct}/{challenge.creator_total}</p>
            {challenge.creator_time && (
              <p className="text-xs text-[#888780] dark:text-white/40 mt-0.5">in {Math.round(challenge.creator_time)}s</p>
            )}
          </div>
          <p className="text-sm font-medium text-[#D4537E] text-center">Can you beat that score?</p>
        </div>

        {/* Meta row */}
        <div className="flex justify-center gap-3 mb-5 text-[11px] text-[#888780] dark:text-white/40">
          <span className="px-2 py-1 rounded-md bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)]">{formatPlaylistName(challenge.playlist)}</span>
          <span className="px-2 py-1 rounded-md bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)]">{challenge.mode === 'challenge' ? 'Challenge' : 'Quick play'}</span>
          <span className="px-2 py-1 rounded-md bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)]">{attemptCount} played</span>
        </div>

        {/* Nickname prompt (anon only) */}
        {!isLoggedIn && (
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your name (optional)"
            maxLength={20}
            className="w-full py-3 px-4 rounded-xl bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] text-sm text-primary placeholder:text-[#888780] dark:placeholder:text-white/30 outline-none focus:border-[#D4537E] mb-4 text-center transition-colors"
          />
        )}

        {/* Accept button */}
        <button
          type="button"
          onClick={handleAccept}
          className="w-full py-3 rounded-xl bg-[#D4537E] text-white text-sm font-semibold hover:bg-[#C44A72] active:scale-[0.97] transition-all"
        >
          Accept challenge
        </button>

        <p className="text-[10px] text-[#888780] dark:text-white/30 mt-3 text-center">
          Same 10 songs. Same order. Who&apos;s better?
        </p>

        {/* Footer link back home */}
        <Link
          href="/"
          className="inline-block mt-6 text-xs text-[#888780] dark:text-white/40 hover:text-primary transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
