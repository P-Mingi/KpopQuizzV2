'use client';

import { useState, useEffect } from 'react';

import { GroupPill } from '@/components/ui/group-pill';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { GroupLogo } from '@/components/ui/group-logo';

import type { Difficulty, QuizType } from '@/lib/db/types';

interface ResultCardProps {
  score: number;
  maxScore: number;
  percentile: number | null;
  avgScorePct: number | null;
  fandomName: string;
  groupName: string;
  displayColor: string;
  textColor: string;
  logoUrl: string | null;
  difficulty: Difficulty;
  quizType: QuizType;
  passRate: number | null;
}

function getRankMessage(
  scorePct: number,
  percentile: number | null,
  fandomName: string,
  passRate: number | null,
): { text: string; className: string } {
  if (scorePct >= 90) {
    const topPct = percentile !== null ? `Top ${Math.max(100 - percentile, 1)}%` : 'Top tier';
    return {
      text: `You're a true ${fandomName}! ${topPct} of players.`,
      className: 'bg-correct-bg text-correct-text',
    };
  }
  if (scorePct >= 70) {
    const beatText = percentile !== null ? `You beat ${percentile}% of players.` : 'Great job!';
    return {
      text: `Solid score! ${beatText}`,
      className: 'bg-info-bg text-info-text',
    };
  }
  if (scorePct >= 50) {
    const beatText = percentile !== null ? `You beat ${percentile}% of players.` : 'Keep it up!';
    return {
      text: `Not bad! ${beatText}`,
      className: 'bg-timeout-bg text-timeout-text',
    };
  }
  const passText = passRate !== null ? `Only ${passRate}% of players pass this one.` : 'This is a tough one!';
  return {
    text: `Better luck next time! ${passText}`,
    className: 'bg-accent-pink-light text-accent-pink-dark',
  };
}

export function ResultCard({
  score,
  maxScore,
  percentile,
  avgScorePct,
  fandomName,
  groupName,
  displayColor,
  textColor,
  logoUrl,
  difficulty,
  quizType,
  passRate,
}: ResultCardProps): React.ReactElement {
  const scorePct = Math.round((score / maxScore) * 100);
  const rank = getRankMessage(scorePct, percentile, fandomName, passRate);
  const [animateYour, setAnimateYour] = useState(false);
  const [animateAvg, setAnimateAvg] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setAnimateYour(true), 200);
    const t2 = setTimeout(() => setAnimateAvg(true), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div id="result-card" className="bg-surface-primary border border-border-light rounded-lg p-6 text-center animate-result-in">
      <div className="flex justify-center mb-3">
        <GroupLogo groupName={groupName} logoUrl={logoUrl} displayColor={displayColor} textColor={textColor} size={52} />
      </div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <GroupPill name={groupName} displayColor={displayColor} textColor={textColor} />
        <DifficultyBadge difficulty={difficulty} />
        {quizType === 'true_false' && (
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-info-bg text-info-text">T/F</span>
        )}
        {quizType === 'guess_from_clues' && (
          <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#3C3489]">Clues</span>
        )}
      </div>

      <p className="text-5xl font-semibold text-txt-primary">
        {score}/{maxScore}
      </p>
      <p className="text-sm text-txt-secondary mt-1">{scorePct}% correct</p>

      <div className={`mt-5 px-4 py-3 rounded-md text-sm font-medium ${rank.className}`}>
        {rank.text}
      </div>

      <div className="text-left mt-5">
        <p className="text-sm text-txt-secondary mb-3">How you compare</p>

        {/* Your score bar */}
        <div className="flex justify-between text-sm mb-1">
          <span className="text-txt-secondary">Your score</span>
          <span className="font-medium text-txt-primary">{scorePct}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-tertiary">
          <div
            className="h-2 rounded-full bg-accent-pink"
            style={{
              width: animateYour ? `${scorePct}%` : '0%',
              transition: 'width 800ms ease-out',
            }}
          />
        </div>

        {/* Average bar */}
        <div className="flex justify-between text-sm mb-1 mt-3">
          <span className="text-txt-secondary">Average {fandomName}</span>
          <span className={avgScorePct !== null ? 'text-txt-secondary' : 'text-txt-tertiary'}>{avgScorePct !== null ? `${avgScorePct}%` : 'new'}</span>
        </div>
        <div className="h-2 rounded-full bg-surface-tertiary">
          <div
            className="h-2 rounded-full bg-border-medium"
            style={{
              width: animateAvg ? `${avgScorePct ?? 0}%` : '0%',
              transition: 'width 800ms ease-out',
            }}
          />
        </div>
      </div>

      <p className="text-xs text-txt-tertiary mt-4">kpopquizz.com</p>
    </div>
  );
}
