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
    <div className="min-h-[100dvh] bg-primary flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px] text-center">
        {/* Logo */}
        <Link href="/" className="inline-block text-base font-bold mb-10">
          <span className="text-primary">kpop</span>
          <span className="text-accent">blind</span>
          <span className="text-primary">test</span>
        </Link>

        {/* Challenge info */}
        <div className="p-6 bg-surface rounded-2xl border border-default mb-6 shadow-card">
          <p className="text-[10px] text-ghost uppercase tracking-wider mb-3">
            Challenge from
          </p>
          <p className="text-xl font-bold text-primary mb-1">{challenge.creator_name}</p>
          <p className="text-sm text-ghost mb-5">
            scored {challenge.creator_correct}/{challenge.creator_total}
            {challenge.creator_time && ` in ${Math.round(challenge.creator_time)}s`}
          </p>

          <p className="text-lg font-semibold text-accent">
            Can you beat {challenge.creator_correct}/{challenge.creator_total}?
          </p>
        </div>

        {/* Meta row */}
        <div className="flex justify-center gap-4 mb-6 text-[11px] text-ghost">
          <span>{formatPlaylistName(challenge.playlist)}</span>
          <span>{challenge.mode === 'challenge' ? 'Challenge mode' : 'Quick play'}</span>
          <span>{attemptCount} played</span>
        </div>

        {/* Nickname prompt (anon only) */}
        {!isLoggedIn && (
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Your name (optional)"
            maxLength={20}
            className="w-full py-3 px-4 rounded-xl bg-surface border border-default text-sm text-primary placeholder:text-ghost outline-none focus:border-accent mb-4 text-center transition-colors"
          />
        )}

        {/* Accept button */}
        <button
          type="button"
          onClick={handleAccept}
          className="w-full py-4 rounded-2xl bg-accent text-primary text-lg font-bold active:scale-[0.97] transition-transform"
        >
          ACCEPT CHALLENGE
        </button>

        <p className="text-[10px] text-ghost mt-3">
          Same 10 songs. Same order. Who&apos;s better?
        </p>

        {/* Footer link back home */}
        <Link
          href="/"
          className="inline-block mt-8 text-xs text-ghost hover:text-tertiary transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
