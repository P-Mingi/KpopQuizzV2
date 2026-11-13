'use client';

// Bunnyverse Cards, lots 3 and 4 (lane ECON): the two small notes of the packs bay: "Gold within N packs" with its progress bar (A11), and
// "14 of 40 timer packs today" with the resting line once the timer has added its share (A13). They read the wallet only.
import { pityLine, pityProgress, restingLine, timerLine } from '@/lib/cards/economy';

import { useCards } from './cards-provider';

export function PityNote(): React.ReactElement | null {
  const { state, status } = useCards();
  if (status !== 'ready' || !state) return null;
  const line = pityLine(state.pityLeft);
  if (!line) return null;
  const pct = pityProgress(state.pityLeft);
  return (
    <div className="pity-note">
      <p className="stack-label"><b>{line}</b></p>
      <span className="bar pity-bar" role="progressbar" aria-label="Packs until a Gold card is certain" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><i style={{ width: `${pct}%` }} /></span>
    </div>
  );
}

export function TimerNote(): React.ReactElement | null {
  const { state, status } = useCards();
  if (status !== 'ready' || !state) return null;
  const line = timerLine(state);
  if (!line) return null;
  const rest = restingLine(state);
  return (
    <div className="timer-note">
      <p className="hint">{line}</p>
      {rest ? <p className="hint">{rest}</p> : null}
    </div>
  );
}
