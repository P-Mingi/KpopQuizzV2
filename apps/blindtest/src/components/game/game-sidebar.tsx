'use client';

import { PowerupBar } from './powerup-bar';
import { RoundHistory } from './round-history';

import type { SongResult } from './use-game-state';
import type { PowerupId } from '@/lib/powerups';

export function GameSidebar({
  score,
  lastRoundPoints,
  comboStreak,
  bestCombo,
  correctCount,
  totalPlayed,
  avgSpeedMs,
  powerups,
  results,
  totalRounds,
  onUsePowerup,
  powerupsDisabled,
}: {
  score: number;
  lastRoundPoints: number;
  comboStreak: number;
  bestCombo: number;
  correctCount: number;
  totalPlayed: number;
  avgSpeedMs: number;
  powerups: Record<PowerupId, number>;
  results: SongResult[];
  totalRounds: number;
  onUsePowerup: (id: PowerupId) => void;
  powerupsDisabled: boolean;
}) {
  return (
    <div className="hidden md:flex flex-col gap-2 w-[260px]">
      {/* Score + Combo */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="p-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06]">
          <p className="text-[9px] text-white/35 font-semibold mb-1">Score</p>
          <p className="text-[20px] font-semibold text-white tabular-nums">{score.toLocaleString()}</p>
          {lastRoundPoints > 0 && (
            <p className="text-[9px] text-white/30">+{lastRoundPoints} last round</p>
          )}
        </div>
        <div className="p-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06]">
          <p className="text-[9px] text-white/35 font-semibold mb-1">Combo</p>
          <p className="text-[20px] font-semibold text-[#ED93B1]">x{Math.min(comboStreak, 5)}</p>
          <p className="text-[9px] text-white/30">Best: x{bestCombo}</p>
        </div>
      </div>

      {/* Accuracy + Speed */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="p-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06]">
          <p className="text-[9px] text-white/35 font-semibold mb-1">Accuracy</p>
          <p className="text-[20px] font-semibold text-white">
            {totalPlayed > 0 ? Math.round((correctCount / totalPlayed) * 100) : 0}%
          </p>
          <p className="text-[9px] text-white/30">
            {correctCount} / {totalPlayed} correct
          </p>
        </div>
        <div className="p-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06]">
          <p className="text-[9px] text-white/35 font-semibold mb-1">Avg speed</p>
          <p className="text-[20px] font-semibold text-white tabular-nums">
            {avgSpeedMs > 0 ? (avgSpeedMs / 1000).toFixed(1) : '0.0'}s
          </p>
          <p className="text-[9px] text-white/30">Per answer</p>
        </div>
      </div>

      {/* Power-ups */}
      <div className="p-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06]">
        <p className="text-[9px] text-white/35 font-semibold mb-2">Power-ups</p>
        <PowerupBar powerups={powerups} onUse={onUsePowerup} disabled={powerupsDisabled} />
      </div>

      {/* Round history */}
      <div className="p-3 rounded-[10px] bg-white/[0.04] border border-white/[0.06]">
        <p className="text-[9px] text-white/35 font-semibold mb-1.5">Round history</p>
        <RoundHistory results={results} totalRounds={totalRounds} />
      </div>
    </div>
  );
}
