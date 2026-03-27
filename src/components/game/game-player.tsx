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
  creatorId: string;
  isCreator: boolean;
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
  initialPlay: { choices: Record<string, 'a' | 'b'>; created_at: string } | null;
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

function formatPlayDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// ============================================
// Component
// ============================================

export function GamePlayer({ game, initialPlay }: GamePlayerProps): React.ReactElement {
  // If user already played, start in result phase with their choices
  const [phase, setPhase] = useState<Phase>(initialPlay ? 'result' : 'intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, 'a' | 'b'>>(initialPlay?.choices ?? {});
  const [selectedSide, setSelectedSide] = useState<'a' | 'b' | null>(null);
  const [resultContent, setResultContent] = useState<GameContent | null>(null);
  const [resultPlayCount, setResultPlayCount] = useState(game.playCount);
  const [xpEarned, setXpEarned] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(game.likeCount);
  const [copyText, setCopyText] = useState('Copy link');

  const { showToast } = useToast();
  const router = useRouter();

  const matchups = game.content.matchups;
  const currentMatchup = matchups[currentIndex];
  const isAlreadyPlayed = initialPlay !== null && phase === 'result' && resultContent === null;

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

  const handleCopyLink = useCallback(async () => {
    const url = `https://kpopquiz.org/g/${game.slug}`;
    await navigator.clipboard.writeText(url);
    setCopyText('Copied!');
    setTimeout(() => setCopyText('Copy link'), 2000);
  }, [game.slug]);

  const handleDownloadResults = useCallback(async () => {
    try {
      const res = await fetch(`/api/og/game/${game.slug}/status`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${game.slug}-results.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      showToast('Failed to download image', 'error');
    }
  }, [game.slug, showToast]);

  const handlePlayAgain = useCallback(() => {
    setPhase('intro');
    setCurrentIndex(0);
    setChoices({});
    setSelectedSide(null);
    setResultContent(null);
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
        <p className="text-xs text-txt-tertiary mb-1">{currentIndex + 1} of {matchups.length}</p>
        <div className="h-[3px] bg-border-light rounded-full mb-8">
          <div
            className="h-[3px] bg-accent-pink rounded-full transition-all duration-400"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div key={currentIndex} className="animate-question-in">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            {/* Option A — pink */}
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

            {/* Option B — blue */}
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
    const gameUrl = `https://kpopquiz.org/g/${game.slug}`;
    const redditUrl = `https://www.reddit.com/r/kpoppers/submit?type=link&url=${encodeURIComponent(gameUrl)}&title=${encodeURIComponent(`${game.title} — play and see what % of fans agree with you`)}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${game.title} — play and see if you agree`)}&url=${encodeURIComponent(gameUrl)}`;

    return (
      <div>
        <div className="text-center mb-6">
          <p className="text-lg font-medium text-txt-primary">{game.title}</p>
          <p className="text-xs text-txt-tertiary">{formatCount(resultPlayCount)} fans have played</p>
          {isAlreadyPlayed && initialPlay && (
            <p className="text-xs text-[#3C3489] font-medium mt-2 bg-[#EEEDFE] px-3 py-1.5 rounded-md inline-block">
              You played this on {formatPlayDate(initialPlay.created_at)}. Here are the latest results.
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
                style={{ opacity: 0, animation: `fadeSlideIn 0.4s ease ${i * 0.12}s forwards` }}
              >
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span style={{ color: myPick === 'a' ? '#993556' : undefined }}>{m.option_a}</span>
                  <span style={{ color: myPick === 'b' ? '#0C447C' : undefined }}>{m.option_b}</span>
                </div>

                <div className="h-8 rounded-lg overflow-hidden flex gap-0.5">
                  <div
                    className="bg-[#ED93B1] rounded-l-lg flex items-center justify-center transition-all duration-700 ease-out"
                    style={{ width: `${pctA}%`, transitionDelay: `${i * 120 + 200}ms` }}
                  >
                    {pctA >= 15 && <span className="text-xs font-medium text-white">{pctA}%</span>}
                  </div>
                  <div
                    className="bg-[#B5D4F4] rounded-r-lg flex items-center justify-center transition-all duration-700 ease-out"
                    style={{ width: `${pctB}%`, transitionDelay: `${i * 120 + 200}ms` }}
                  >
                    {pctB >= 15 && <span className="text-xs font-medium text-white">{pctB}%</span>}
                  </div>
                </div>

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
          <p className="text-sm text-txt-secondary mb-4">
            You agreed with the majority on {agreeCount}/{matchups.length} matchups
          </p>

          {xpEarned > 0 && (
            <p className="text-xs text-accent-pink font-medium mb-4 animate-fade-in">
              +{xpEarned} XP earned
            </p>
          )}

          {/* Like */}
          <div className="flex justify-center mb-5">
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

          {/* Player actions */}
          <div className="flex gap-2 justify-center">
            {!isAlreadyPlayed && (
              <button
                onClick={handlePlayAgain}
                className="px-6 py-3 rounded-full border border-border-light text-sm font-medium bg-surface-primary hover:border-border-medium transition-colors"
              >
                Play again
              </button>
            )}
            <button
              onClick={handleShare}
              className="px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
            >
              Share result
            </button>
          </div>
        </div>

        {/* Creator share section */}
        {game.isCreator && (
          <div className="mt-6 pt-5 border-t border-border-light">
            <p className="text-xs font-medium text-txt-secondary mb-3">Share your game</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleDownloadResults}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border-light text-xs font-medium bg-surface-primary hover:border-border-medium transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v7M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Download results image
              </button>
              <a
                href={redditUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FF4500] text-white text-xs font-medium"
              >
                Share on Reddit
              </a>
              <a
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-txt-primary text-white text-xs font-medium"
              >
                Share on X
              </a>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-full border border-border-light text-xs font-medium bg-surface-primary hover:border-border-medium transition-colors"
              >
                {copyText}
              </button>
            </div>

            {resultPlayCount >= 20 && (() => {
              const content = displayContent;
              let skewedMatchup: typeof content.matchups[0] & { pctA: number; pctB: number } | null = null;
              let closestMatchup: typeof content.matchups[0] & { pctA: number; pctB: number } | null = null;

              for (const m of content.matchups) {
                const total = m.votes_a + m.votes_b;
                if (total === 0) continue;
                const pctA = Math.round((m.votes_a / total) * 100);
                const pctB = 100 - pctA;
                const skew = Math.abs(m.votes_a - m.votes_b) / total;
                const closeness = 1 - skew;

                if (!skewedMatchup || skew > Math.abs(skewedMatchup.votes_a - skewedMatchup.votes_b) / (skewedMatchup.votes_a + skewedMatchup.votes_b)) {
                  skewedMatchup = { ...m, pctA, pctB };
                }
                if (!closestMatchup || closeness > (1 - Math.abs(closestMatchup.votes_a - closestMatchup.votes_b) / (closestMatchup.votes_a + closestMatchup.votes_b))) {
                  closestMatchup = { ...m, pctA, pctB };
                }
              }

              if (!skewedMatchup || !closestMatchup) return null;

              const winner = skewedMatchup.pctA > skewedMatchup.pctB ? skewedMatchup.option_a : skewedMatchup.option_b;
              const loser = skewedMatchup.pctA > skewedMatchup.pctB ? skewedMatchup.option_b : skewedMatchup.option_a;
              const winnerPct = Math.max(skewedMatchup.pctA, skewedMatchup.pctB);
              const statsText = [
                `"${winnerPct}% picked ${winner} over ${loser}"`,
                `"Closest matchup: ${closestMatchup.option_a} vs ${closestMatchup.option_b} (${closestMatchup.pctA}-${closestMatchup.pctB}%)"`,
                `"${resultPlayCount} fans have played so far"`,
              ].join('\n');

              return (
                <div className="mt-4 p-4 bg-surface-secondary rounded-xl">
                  <p className="text-xs font-medium text-txt-secondary mb-2">Stats to share on Reddit</p>
                  <div className="space-y-1.5 text-sm text-txt-primary">
                    <p>{`"${winnerPct}% picked ${winner} over ${loser}"`}</p>
                    <p>{`"Closest: ${closestMatchup.option_a} vs ${closestMatchup.option_b} (${closestMatchup.pctA}-${closestMatchup.pctB}%)"`}</p>
                    <p>{`"${resultPlayCount} fans have played so far"`}</p>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(statsText); showToast('Copied!', 'success'); }}
                    className="text-xs text-txt-secondary mt-2 underline cursor-pointer"
                  >
                    Copy all
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Create your own CTA */}
        <div className="mt-8 pt-6 border-t border-border-light text-center">
          <p className="text-sm text-txt-secondary mb-3">Want to make one? It takes 2 minutes</p>
          <Link
            href="/create?type=this_or_that"
            className="inline-block px-6 py-3 rounded-full border border-border-light text-sm font-medium hover:border-border-medium transition-colors"
          >
            Create your own This or That
          </Link>
        </div>
      </div>
    );
  }

  return <div />;
}
