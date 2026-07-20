'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { DiscordResultsLine } from '@/components/discord/discord-results-line';
import { useToast } from '@/components/ui/toast-provider';
import { analytics, type CrossPromoTarget, type GameType } from '@/lib/analytics';

// Workstream LOOP part A - the shared "what happens next" footer.
//
// Every non-quiz result screen renders this BELOW its own score display. The
// quiz result is the reference model and is deliberately NOT refactored onto
// this; the games are brought up to it instead.
//
// The point is that no game dead-ends. A finishing player always gets a replay,
// a smart cross-promo into the next game, and two crawlable loop cards, so the
// session keeps going and the internal links keep their SEO value on-site.
//
// This component owns no game state. Presentation, routing, the share handler,
// and the analytics joints only.

type LoopGame = Extract<GameType, 'blindtest' | 'this-or-that' | 'name-all' | 'duel'>;

interface ResultLoopProps {
  game: LoopGame;
  /** Score context. Optional: some games have no clean out-of-N score. */
  score?: number | undefined;
  max?: number | undefined;
  scoreLabel?: string | undefined;
  /** The full share string the game builds (it knows its own verdict wording). */
  shareText: string;
  /** Canonical path to share, e.g. "/blindtest". Made absolute at share time. */
  shareUrl: string;
  /** Replay as navigation. Omit when replay is an in-component state reset. */
  playAgainHref?: string | undefined;
  /** Replay as state reset. Takes precedence over playAgainHref. */
  onPlayAgain?: (() => void) | undefined;
  /** The anon nudge is the one thing signed-in players must never see. */
  isSignedIn: boolean;
  /** When known, the cross-promo prefers the group quiz (keeps the fan on their bias). */
  groupSlug?: string | null | undefined;
  groupName?: string | null | undefined;
}

interface LoopCard {
  href: string;
  target: CrossPromoTarget;
  icon: IconName;
  text: string;
}

type IconName = 'music' | 'versus' | 'people' | 'cards' | 'grid';

// A2 - the loop table. Each game points at the next best thing to do, so the
// player cycles quiz <-> blindtest <-> games instead of falling out.
//
// Note on the two merged rows: /games/this-or-that renders DuelGame, so
// 'this-or-that' and 'duel' are the same screen for a player and share a row.
const LOOP_CARDS: Record<LoopGame, LoopCard[]> = {
  blindtest: [
    { href: '/games/this-or-that', target: 'this-or-that', icon: 'versus', text: 'Play This or That: pick your bias in head-to-head matchups' },
    { href: '/games/name-all', target: 'name-all', icon: 'people', text: 'Name All Members: how many can you list before the clock runs out' },
  ],
  'this-or-that': [
    { href: '/blindtest', target: 'blindtest', icon: 'music', text: 'Try the K-pop blind test: guess songs from audio clips' },
    { href: '/games/name-all', target: 'name-all', icon: 'people', text: 'Name All Members: how many can you list before the clock runs out' },
  ],
  duel: [
    { href: '/blindtest', target: 'blindtest', icon: 'music', text: 'Try the K-pop blind test: guess songs from audio clips' },
    { href: '/games/name-all', target: 'name-all', icon: 'people', text: 'Name All Members: how many can you list before the clock runs out' },
  ],
  'name-all': [
    { href: '/blindtest', target: 'blindtest', icon: 'music', text: 'Try the K-pop blind test: guess songs from audio clips' },
    { href: '/games/this-or-that', target: 'this-or-that', icon: 'versus', text: 'Play This or That: pick your bias in head-to-head matchups' },
  ],
};

function Icon({ name }: { name: IconName }): React.ReactElement {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'flex-shrink-0',
    'aria-hidden': true,
  };
  switch (name) {
    case 'music':
      return <svg {...common}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
    case 'versus':
      return <svg {...common}><path d="M4 5h6l-3 14" /><path d="M20 5h-6l3 14" /><path d="M12 4v16" /></svg>;
    case 'people':
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'cards':
      return <svg {...common}><rect x="3" y="5" width="13" height="16" rx="2" /><path d="M8 9h3M8 13h3" /><path d="M19 7v12a2 2 0 0 1-2 2" /></svg>;
    default:
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
  }
}

export function ResultLoop({
  game,
  score,
  max,
  scoreLabel,
  shareText,
  shareUrl,
  playAgainHref,
  onPlayAgain,
  isSignedIn,
  groupSlug,
  groupName,
}: ResultLoopProps): React.ReactElement {
  const { showToast } = useToast();

  // Same pattern as the quiz result: native share when the device offers it,
  // clipboard plus a toast when it does not. A cancelled share is not an error.
  const handleShare = useCallback(async () => {
    analytics.shareClick(game);
    const absolute =
      typeof window !== 'undefined' ? `${window.location.origin}${shareUrl}` : shareUrl;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText, url: absolute });
      } catch {
        // User cancelled the sheet.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${absolute}`);
      showToast('Link copied!', 'success');
    } catch {
      showToast('Could not copy link', 'error');
    }
  }, [game, shareText, shareUrl, showToast]);

  // The strongest backlink is the group quiz: it keeps the fan on their bias.
  // Fall back to the hub when the game does not know a group.
  const quizHref = groupSlug ? `/${groupSlug}-quiz` : '/quizzes';
  const quizTarget: CrossPromoTarget = groupSlug ? 'group-quiz' : 'quizzes';
  const quizLabel = groupName ? `Play a ${groupName} quiz` : 'Play a K-pop quiz';

  const cards = LOOP_CARDS[game];
  const hasScore = typeof score === 'number' && typeof max === 'number';

  return (
    <div className="max-w-[440px] mx-auto mt-5">
      {/* 1. Primary actions: replay, then the smart cross-promo. */}
      <div className="flex gap-2.5">
        {onPlayAgain ? (
          <button type="button" className="btn-primary flex-1" onClick={onPlayAgain} aria-label="Play again">
            Play again
          </button>
        ) : (
          <Link href={playAgainHref ?? '/games'} className="btn-primary flex-1 text-center no-underline" aria-label="Play again">
            Play again
          </Link>
        )}
        <Link
          href={quizHref}
          className="btn-outline flex-1 text-center no-underline"
          onClick={() => analytics.crossPromo(game, quizTarget)}
          aria-label={quizLabel}
        >
          {quizLabel}
        </Link>
      </div>

      {/* Share sits under the actions so the two routing buttons stay paired. */}
      <button
        type="button"
        className="btn-outline w-full mt-2.5"
        onClick={handleShare}
        aria-label={hasScore ? `Share your score of ${score} out of ${max}` : 'Share your result'}
      >
        {hasScore ? `Share ${score}/${max}${scoreLabel ? ` ${scoreLabel}` : ''}` : 'Share result'}
      </button>

      {/* 2. Discord line, same placement as the quiz result. */}
      <div className="text-center" style={{ marginTop: 8 }}>
        <DiscordResultsLine surface={`${game}-result`} text="Compare with the community on Discord" />
      </div>

      {/* 3. Anon nudge. Signed-in players never see this. */}
      {!isSignedIn && (
        <div className="mt-3 p-3 bg-surface border border-default rounded-xl text-center">
          <p className="text-[13px] text-secondary">Sign in to save your score and keep your daily streak</p>
          <Link
            href="/login"
            className="btn-outline inline-block mt-2 no-underline"
            onClick={() => analytics.signinClick(game)}
          >
            Sign in
          </Link>
        </div>
      )}

      {/* 4. The loop spine: two crawlable cross-links, quiz-result styling. */}
      <div className="flex flex-col gap-2 mt-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            onClick={() => analytics.crossPromo(game, card.target)}
            className="flex items-center gap-2.5 p-3 bg-surface border border-default rounded-xl text-[13px] text-secondary hover:text-primary transition-colors no-underline"
          >
            <Icon name={card.icon} />
            <span>{card.text}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
