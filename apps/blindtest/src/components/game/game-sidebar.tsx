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
    <div className="hidden md:flex flex-col gap-2.5 w-[300px]">
      {/* Score + Combo */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.08]">
          <p className="text-[10px] text-white/40 font-semibold mb-1.5">Score</p>
          <p className="text-[26px] font-semibold text-white tabular-nums leading-none">{score.toLocaleString()}</p>
          {lastRoundPoints > 0 && (
            <p className="text-[10px] text-white/30 mt-1">+{lastRoundPoints} last round</p>
          )}
        </div>
        <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.08]">
          <p className="text-[10px] text-white/40 font-semibold mb-1.5">Combo</p>
          <p className="text-[26px] font-semibold text-[#ED93B1] leading-none">x{Math.min(comboStreak, 5)}</p>
          <p className="text-[10px] text-white/30 mt-1">Best: x{bestCombo}</p>
        </div>
      </div>

      {/* Accuracy + Speed */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.08]">
          <p className="text-[10px] text-white/40 font-semibold mb-1.5">Accuracy</p>
          <p className="text-[26px] font-semibold text-white leading-none">
            {totalPlayed > 0 ? Math.round((correctCount / totalPlayed) * 100) : 0}%
          </p>
          <p className="text-[10px] text-white/30 mt-1">
            {correctCount} / {totalPlayed} correct
          </p>
        </div>
        <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.08]">
          <p className="text-[10px] text-white/40 font-semibold mb-1.5">Avg speed</p>
          <p className="text-[26px] font-semibold text-white tabular-nums leading-none">
            {avgSpeedMs > 0 ? (avgSpeedMs / 1000).toFixed(1) : '0.0'}s
          </p>
          <p className="text-[10px] text-white/30 mt-1">Per answer</p>
        </div>
      </div>

      {/* Power-ups */}
      <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.08]">
        <p className="text-[10px] text-white/40 font-semibold mb-3">Power-ups</p>
        <PowerupBar powerups={powerups} onUse={onUsePowerup} disabled={powerupsDisabled} />
      </div>

      {/* Round history */}
      <div className="p-4 rounded-xl bg-white/[0.05] border border-white/[0.08]">
        <p className="text-[10px] text-white/40 font-semibold mb-2">Round history</p>
        <RoundHistory results={results} totalRounds={totalRounds} />
      </div>
    </div>
  );
}
