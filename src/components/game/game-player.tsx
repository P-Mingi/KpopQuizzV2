'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/toast-provider';
import { GroupPill } from '@/components/ui/group-pill';
import { GroupLogo } from '@/components/ui/group-logo';
import { UserAvatar } from '@/components/ui/user-avatar';
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

function getSummaryLabel(agreeCount: number, total: number): string {
  const pct = total > 0 ? Math.round((agreeCount / total) * 100) : 0;
  if (pct >= 75) return 'You go with the crowd';
  if (pct >= 50) return 'Mostly mainstream';
  if (pct >= 25) return 'You have unique taste';
  return 'Total contrarian';
}

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

    setTimeout(() => {
      if (currentIndex < matchups.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedSide(null);
      } else {
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
    const displayContent = resultContent ?? game.content;
    const majorityCount = getMajorityCount(displayContent, choices);
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

  const handlePlayAgain = useCallback(() => {
    setPhase('intro');
    setCurrentIndex(0);
    setChoices({});
    setSelectedSide(null);
    setResultContent(null);
    setAlreadyPlayed(false);
    setXpEarned(0);
  }, []);

  // ============================================
  // INTRO
  // ============================================

  if (phase === 'intro') {
    return (
      <div className="bg-surface-secondary rounded-lg p-5">
        <div className="bg-surface-primary rounded-lg border border-border-light p-5">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
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
              {' '}&middot; {formatCount(game.playCount)} plays
            </p>
          </div>

          <p className="text-sm text-txt-secondary mt-4">
            Pick your favorite in each matchup and see what other fans chose
          </p>
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
    const progress = ((currentIndex + 1) / matchups.length) * 100;

    return (
      <div>
        {/* Progress */}
        <p className="text-xs text-txt-tertiary mb-1">{currentIndex + 1} of {matchups.length}</p>
        <div className="h-[3px] bg-border-light rounded-full mb-8">
          <div
            className="h-[3px] bg-accent-pink rounded-full transition-all duration-400"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Matchup cards */}
        <div key={currentIndex} className="animate-question-in">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Option A -- pink */}
            <button
              onClick={() => handlePick('a')}
              disabled={selectedSide !== null}
              className={`flex-1 rounded-2xl border-2 p-8 flex items-center justify-center min-h-[140px] cursor-pointer transition-all duration-300 ${
                selectedSide === 'a'
                  ? 'border-[#ED93B1] bg-[#FBEAF0] scale-[1.03]'
                  : selectedSide === 'b'
                    ? 'border-border-light opacity-40 scale-[0.97]'
                    : 'border-border-light bg-surface-primary hover:border-border-medium hover:scale-[1.02]'
              }`}
            >
              <p className="text-lg font-medium text-txt-primary text-center">{currentMatchup.option_a}</p>
            </button>

            <span className="flex items-center justify-center text-xs text-txt-tertiary font-medium sm:px-1">vs</span>

            {/* Option B -- blue */}
            <button
              onClick={() => handlePick('b')}
              disabled={selectedSide !== null}
              className={`flex-1 rounded-2xl border-2 p-8 flex items-center justify-center min-h-[140px] cursor-pointer transition-all duration-300 ${
                selectedSide === 'b'
                  ? 'border-[#B5D4F4] bg-[#E6F1FB] scale-[1.03]'
                  : selectedSide === 'a'
                    ? 'border-border-light opacity-40 scale-[0.97]'
                    : 'border-border-light bg-surface-primary hover:border-border-medium hover:scale-[1.02]'
              }`}
            >
              <p className="text-lg font-medium text-txt-primary text-center">{currentMatchup.option_b}</p>
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
    const agreeCount = getMajorityCount(displayContent, choices);
    const summaryLabel = getSummaryLabel(agreeCount, matchups.length);

    return (
      <div>
        <div className="text-center mb-6">
          <p className="text-lg font-medium text-txt-primary">{game.title}</p>
          <p className="text-xs text-txt-tertiary">{formatCount(resultPlayCount)} fans have played</p>
          {alreadyPlayed && (
            <p className="text-xs text-[#3C3489] font-medium mt-2 bg-[#EEEDFE] px-3 py-1.5 rounded-md inline-block">
              You already played this! Here are your picks.
            </p>
          )}
        </div>

        {/* Matchup results with staggered animation */}
        <div className="space-y-3">
          {displayContent.matchups.map((m, i) => {
            const totalVotes = m.votes_a + m.votes_b;
            const pctA = totalVotes > 0 ? Math.round((m.votes_a / totalVotes) * 100) : 50;
            const pctB = 100 - pctA;
            const myPick = choices[m.id];

            return (
              <div
                key={m.id}
                className="bg-surface-secondary rounded-xl p-3"
                style={{
                  opacity: 0,
                  animation: `fadeSlideIn 0.4s ease ${i * 0.12}s forwards`,
                }}
              >
                {/* Names */}
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span style={{ color: myPick === 'a' ? '#993556' : undefined }}>{m.option_a}</span>
                  <span style={{ color: myPick === 'b' ? '#0C447C' : undefined }}>{m.option_b}</span>
                </div>

                {/* Split bar */}
                <div className="h-8 rounded-lg overflow-hidden flex gap-0.5">
                  <div
                    className="bg-[#ED93B1] rounded-l-lg flex items-center justify-center transition-all duration-700 ease-out"
                    style={{
                      width: `${pctA}%`,
                      transitionDelay: `${i * 120 + 200}ms`,
                    }}
                  >
                    {pctA >= 15 && <span className="text-xs font-medium text-white">{pctA}%</span>}
                  </div>
                  <div
                    className="bg-[#B5D4F4] rounded-r-lg flex items-center justify-center transition-all duration-700 ease-out"
                    style={{
                      width: `${pctB}%`,
                      transitionDelay: `${i * 120 + 200}ms`,
                    }}
                  >
                    {pctB >= 15 && <span className="text-xs font-medium text-white">{pctB}%</span>}
                  </div>
                </div>

                {/* Your pick label */}
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: '#993556' }}>{myPick === 'a' ? 'your pick' : ''}</span>
                  <span className="text-[10px]" style={{ color: '#0C447C' }}>{myPick === 'b' ? 'your pick' : ''}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="text-center mt-6 pt-6 border-t border-border-light">
          <p className="text-xl font-medium text-txt-primary mb-1">{summaryLabel}</p>
          <p className="text-sm text-txt-secondary mb-1">
            You agreed with the majority on {agreeCount}/{matchups.length} matchups
          </p>

          {xpEarned > 0 && (
            <p className="text-xs text-accent-pink font-medium mt-2 animate-fade-in">
              +{xpEarned} XP earned
            </p>
          )}

          {/* Like */}
          <div className="flex justify-center mt-4">
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

          <div className="flex gap-2 justify-center mt-5">
            <button
              onClick={handlePlayAgain}
              className="px-6 py-3 rounded-full border border-border-light text-sm font-medium bg-surface-primary hover:border-border-medium transition-colors"
            >
              Play again
            </button>
            <button
              onClick={handleShare}
              className="px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
            >
              Share result
            </button>
          </div>

          <Link
            href="/create?type=this_or_that"
            className="inline-block mt-3 text-xs text-txt-secondary underline"
          >
            Create your own
          </Link>
        </div>
      </div>
    );
  }

  return <div />;
}
