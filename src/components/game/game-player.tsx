'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/toast-provider';
import { GroupPill } from '@/components/ui/group-pill';
import { GroupLogo } from '@/components/ui/group-logo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ProgressBar } from '@/components/quiz/progress-bar';
import { formatCount } from '@/lib/utils';

import type { GameContent } from '@/lib/db/types';

// ============================================
// Types
// ============================================

interface GameIntroData {
  id: string;
  title: string;
  slug: string;
  gameType: string;
  content: GameContent;
  matchupCount: number;
  playCount: number;
  likeCount: number;
  groupName: string | null;
  groupSlug: string | null;
  displayColor: string | null;
  textColor: string | null;
  logoUrl: string | null;
  creatorUsername: string;
  creatorAvatarUrl: string | null;
  creatorAvatarBg: string;
  creatorAvatarText: string;
}

interface GamePlayerProps {
  game: GameIntroData;
}

type Phase = 'intro' | 'playing' | 'result';

// ============================================
// Component
// ============================================

export function GamePlayer({ game }: GamePlayerProps): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, 'a' | 'b'>>({});
  const [selectedSide, setSelectedSide] = useState<'a' | 'b' | null>(null);
  const [resultContent, setResultContent] = useState<GameContent | null>(null);
  const [resultPlayCount, setResultPlayCount] = useState(game.playCount);
  const [xpEarned, setXpEarned] = useState(0);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(game.likeCount);

  const { showToast } = useToast();
  const router = useRouter();

  const matchups = game.content.matchups;
  const currentMatchup = matchups[currentIndex];

  // Refresh navbar XP on result
  useEffect(() => {
    if (phase === 'result') router.refresh();
  }, [phase, router]);

  const handlePick = useCallback((side: 'a' | 'b') => {
    if (selectedSide !== null || !currentMatchup) return;

    setSelectedSide(side);
    const newChoices = { ...choices, [currentMatchup.id]: side };
    setChoices(newChoices);

    // Auto-advance after animation
    setTimeout(() => {
      if (currentIndex < matchups.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedSide(null);
      } else {
        // Last matchup - submit
        submitPlay(newChoices);
      }
    }, 600);
  }, [selectedSide, currentMatchup, choices, currentIndex, matchups.length]);

  const submitPlay = useCallback(async (finalChoices: Record<string, 'a' | 'b'>) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${game.id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choices: finalChoices }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.already_played) {
          setAlreadyPlayed(true);
          setChoices(data.choices as Record<string, 'a' | 'b'>);
        }
        if (data.content) {
          setResultContent(data.content as GameContent);
        }
        setResultPlayCount(data.play_count ?? game.playCount);
        setXpEarned(data.xp_earned ?? 0);
      }
    } catch {
      showToast("Couldn't save your picks, but your results are still shown!", 'info');
    } finally {
      setSubmitting(false);
      setPhase('result');
    }
  }, [game.id, game.playCount, showToast]);

  const handleLike = useCallback(async () => {
    const action = liked ? 'unlike' : 'like';
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);

    try {
      const res = await fetch(`/api/game/${game.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.status === 401) {
        setLiked(liked);
        setLikeCount(prev => liked ? prev + 1 : prev - 1);
        router.push('/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setLikeCount(data.like_count);
      }
    } catch {
      setLiked(liked);
      setLikeCount(prev => liked ? prev + 1 : prev - 1);
    }
  }, [liked, game.id, router]);

  const handleShare = useCallback(async () => {
    const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/g/${game.slug}`;
    const majorityCount = getMajorityCount(resultContent ?? game.content, choices);
    const shareText = `I agreed with the majority on ${majorityCount}/${matchups.length} in "${game.title}"`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: game.title, text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      showToast('Copied to clipboard!', 'success');
    }
  }, [game, matchups.length, choices, resultContent, showToast]);

  // ============================================
  // INTRO
  // ============================================

  if (phase === 'intro') {
    return (
      <div className="bg-surface-secondary rounded-lg p-5">
        <div className="bg-surface-primary rounded-lg border border-border-light p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                {game.groupName && game.groupSlug && game.displayColor && game.textColor && (
                  <Link href={`/${game.groupSlug}-quiz`}>
                    <GroupPill name={game.groupName} displayColor={game.displayColor} textColor={game.textColor} />
                  </Link>
                )}
                <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#3C3489]">This or That</span>
              </div>
              <h1 className="text-2xl font-medium mt-3 leading-snug text-txt-primary">{game.title}</h1>
              <p className="text-xs text-txt-secondary mt-1">{game.matchupCount} matchups</p>
            </div>
            {game.groupName && game.displayColor && game.textColor && (
              <GroupLogo
                groupName={game.groupName}
                logoUrl={game.logoUrl}
                displayColor={game.displayColor}
                textColor={game.textColor}
                size={64}
              />
            )}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <UserAvatar
              username={game.creatorUsername}
              avatarUrl={game.creatorAvatarUrl}
              bgColor={game.creatorAvatarBg}
              textColor={game.creatorAvatarText}
              size={22}
            />
            <p className="text-sm text-txt-secondary">
              by <Link href={`/u/${game.creatorUsername}`} className="font-medium text-txt-primary hover:underline">{game.creatorUsername}</Link>
            </p>
          </div>

          <div className="flex gap-6 mt-4">
            <div>
              <p className="text-xs text-txt-secondary">plays</p>
              <p className="text-base font-medium text-txt-primary">{formatCount(game.playCount)}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setPhase('playing')}
          className="w-full py-4 rounded-full bg-txt-primary text-white text-base font-medium mt-4 cursor-pointer"
        >
          Start
        </button>
      </div>
    );
  }

  // ============================================
  // PLAYING
  // ============================================

  if (phase === 'playing' && currentMatchup) {
    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-txt-secondary">
            {currentIndex + 1} of {matchups.length}
          </span>
        </div>

        <ProgressBar current={currentIndex + (selectedSide ? 1 : 0)} total={matchups.length} />

        <div key={currentIndex} className="mt-8 animate-question-in">
          <div className="flex gap-3">
            {/* Option A */}
            <button
              onClick={() => handlePick('a')}
              disabled={selectedSide !== null}
              className={`flex-1 rounded-xl border-2 p-6 flex items-center justify-center min-h-[140px] cursor-pointer transition-all duration-300 ${
                selectedSide === 'a'
                  ? 'border-accent-pink scale-[1.03] bg-accent-pink-light'
                  : selectedSide === 'b'
                    ? 'border-border-light opacity-50 scale-[0.97]'
                    : 'border-border-light bg-surface-primary hover:border-border-medium hover:scale-[1.02]'
              }`}
            >
              <span className="text-base font-medium text-txt-primary text-center">
                {currentMatchup.option_a}
              </span>
            </button>

            {/* Option B */}
            <button
              onClick={() => handlePick('b')}
              disabled={selectedSide !== null}
              className={`flex-1 rounded-xl border-2 p-6 flex items-center justify-center min-h-[140px] cursor-pointer transition-all duration-300 ${
                selectedSide === 'b'
                  ? 'border-accent-pink scale-[1.03] bg-accent-pink-light'
                  : selectedSide === 'a'
                    ? 'border-border-light opacity-50 scale-[0.97]'
                    : 'border-border-light bg-surface-primary hover:border-border-medium hover:scale-[1.02]'
              }`}
            >
              <span className="text-base font-medium text-txt-primary text-center">
                {currentMatchup.option_b}
              </span>
            </button>
          </div>

          {!selectedSide && (
            <p className="text-xs text-txt-tertiary text-center mt-4">tap to pick</p>
          )}
        </div>

        {submitting && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-border-light border-t-accent-pink rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // RESULT
  // ============================================

  if (phase === 'result') {
    const displayContent = resultContent ?? game.content;
    const majorityCount = getMajorityCount(displayContent, choices);

    return (
      <div>
        <div className="bg-surface-primary border border-border-light rounded-lg p-5">
          <h2 className="text-base font-medium text-txt-primary">{game.title}</h2>
          <p className="text-xs text-txt-secondary mt-1">{formatCount(resultPlayCount)} fans have played</p>

          {alreadyPlayed && (
            <p className="text-xs text-[#3C3489] font-medium mt-2 bg-[#EEEDFE] px-3 py-1.5 rounded-md">
              You already played this! Here were your picks.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {displayContent.matchups.map((m) => {
            const totalVotes = m.votes_a + m.votes_b;
            const pctA = totalVotes > 0 ? Math.round((m.votes_a / totalVotes) * 100) : 50;
            const pctB = totalVotes > 0 ? 100 - pctA : 50;
            const userPick = choices[m.id];
            const isClose = Math.abs(pctA - pctB) <= 10;

            return (
              <div key={m.id} className="bg-surface-primary border border-border-light rounded-lg p-4">
                {/* Option A */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-sm font-medium ${pctA >= pctB ? 'text-txt-primary' : 'text-txt-secondary'}`}>
                    {m.option_a}
                  </span>
                  {userPick === 'a' && <span className="text-accent-pink text-xs">&#9733; your pick</span>}
                  <span className="text-xs text-txt-tertiary ml-auto">{pctA}%</span>
                </div>
                <div className="h-2 bg-surface-secondary rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pctA >= pctB ? 'bg-accent-pink' : 'bg-border-medium'}`}
                    style={{ width: `${pctA}%` }}
                  />
                </div>

                {/* Option B */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-sm font-medium ${pctB > pctA ? 'text-txt-primary' : 'text-txt-secondary'}`}>
                    {m.option_b}
                  </span>
                  {userPick === 'b' && <span className="text-accent-pink text-xs">&#9733; your pick</span>}
                  <span className="text-xs text-txt-tertiary ml-auto">{pctB}%</span>
                </div>
                <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pctB > pctA ? 'bg-accent-pink' : 'bg-border-medium'}`}
                    style={{ width: `${pctB}%` }}
                  />
                </div>

                {isClose && totalVotes > 0 && (
                  <p className="text-[10px] text-txt-tertiary mt-1.5 text-center">close!</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Majority stat */}
        <div className="mt-5 text-center">
          <p className="text-sm font-medium text-txt-primary">
            You agreed with the majority on {majorityCount}/{matchups.length} matchups!
          </p>
          {majorityCount === matchups.length && (
            <p className="text-xs text-txt-secondary mt-1">You think exactly like everyone else</p>
          )}
          {majorityCount <= Math.floor(matchups.length * 0.3) && (
            <p className="text-xs text-txt-secondary mt-1">Your taste is unique</p>
          )}
        </div>

        {xpEarned > 0 && (
          <p className="text-center text-xs text-accent-pink font-medium mt-3 animate-fade-in">
            +{xpEarned} XP earned
          </p>
        )}

        {/* Like */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors cursor-pointer ${
              liked
                ? 'border-accent-pink bg-accent-pink-light text-accent-pink'
                : 'border-border-light text-txt-secondary hover:border-border-medium'
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill={liked ? 'var(--accent-pink)' : 'none'} stroke={liked ? 'var(--accent-pink)' : 'currentColor'} strokeWidth="1.5">
              <path d="M8 14s-5.5-3.5-5.5-7.5C2.5 4 4 2.5 5.5 2.5c1 0 2 .5 2.5 1.5.5-1 1.5-1.5 2.5-1.5C12 2.5 13.5 4 13.5 6.5 13.5 10.5 8 14 8 14z" />
            </svg>
            {likeCount > 0 ? likeCount : 'Like'}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleShare}
            className="flex-1 py-3 rounded-full bg-txt-primary text-white text-sm font-medium cursor-pointer"
          >
            Share result
          </button>
          <Link
            href="/create?type=this_or_that"
            className="flex-1 py-3 rounded-full border border-border-light text-sm font-medium text-center bg-surface-primary hover:border-border-medium transition-colors"
          >
            Create your own
          </Link>
        </div>
      </div>
    );
  }

  return <div />;
}

// ============================================
// Helpers
// ============================================

function getMajorityCount(content: GameContent, choices: Record<string, 'a' | 'b'>): number {
  let count = 0;
  for (const m of content.matchups) {
    const userPick = choices[m.id];
    if (!userPick) continue;
    const totalVotes = m.votes_a + m.votes_b;
    if (totalVotes === 0) continue;
    const majority = m.votes_a >= m.votes_b ? 'a' : 'b';
    if (userPick === majority) count++;
  }
  return count;
}
