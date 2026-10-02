'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { bestCombo, btLocale, btPlaylistId, btSourceHere, newBtRunId, trackBtRun } from '@/lib/tracking/bt';

import type { BtPlaylistInput, BtRunContext, BtRunMode, BtRunSong } from '@/lib/tracking/bt';

// V12 run tracking for the two legacy blindtest games (blindtest-game.tsx and
// blind-test-player.tsx). It only wraps lib/tracking/bt.ts: one open run kept in
// refs, so it never causes a render and changes nothing the player sees.
//
//   open()    when the rounds are ready (a run still open is closed as abandoned)
//   attach()  on each clip's <audio>: the first one that really plays sends `start`
//   answer()  after each round
//   finish()  true on the results screen; false on quit. Leaving the page or the
//             component mid-run sends finish(false) by itself (sendBeacon).
//
// With NEXT_PUBLIC_BT_TRACKING off, open() opens nothing and the rest is a no-op.

interface OpenRun {
  ctx: BtRunContext;
  startedAt: number;
  started: boolean;
  songs: BtRunSong[];
}

export interface BtTracking {
  open: (run: Omit<BtPlaylistInput, 'now'> & { rounds: number; mode?: BtRunMode }) => void;
  attach: (audio: HTMLAudioElement | null | undefined) => void;
  answer: (song: BtRunSong) => void;
  finish: (completed: boolean) => void;
}

export function useBtTracking(): BtTracking {
  const runRef = useRef<OpenRun | null>(null);

  const finish = useCallback((completed: boolean) => {
    const run = runRef.current;
    if (!run) return;
    runRef.current = null;
    if (!run.started) return; // no clip ever played: not a run
    const correct = run.songs.filter((s) => s.correct).length;
    trackBtRun({
      event: 'finish',
      ...run.ctx,
      answered: run.songs.length,
      correct,
      // The legacy games score one point per right answer.
      score: correct,
      best_combo: bestCombo(run.songs),
      duration_ms: Math.max(0, Date.now() - run.startedAt),
      completed,
      songs: run.songs,
    });
  }, []);

  const open = useCallback<BtTracking['open']>((input) => {
    finish(false);
    const runId = newBtRunId();
    if (!runId) return;
    runRef.current = {
      ctx: {
        run_id: runId,
        playlist: btPlaylistId(input),
        mode: input.mode ?? 'classic',
        source: btSourceHere(input.kind),
        locale: btLocale(),
        rounds: input.rounds,
      },
      startedAt: Date.now(),
      started: false,
      songs: [],
    };
  }, [finish]);

  const attach = useCallback<BtTracking['attach']>((audio) => {
    const run = runRef.current;
    if (!run || run.started || !audio) return;
    audio.addEventListener('playing', () => {
      if (runRef.current !== run || run.started) return;
      run.started = true;
      run.startedAt = Date.now();
      trackBtRun({ event: 'start', ...run.ctx });
    }, { once: true });
  }, []);

  const answer = useCallback<BtTracking['answer']>((song) => {
    const run = runRef.current;
    if (run && run.songs.length < run.ctx.rounds) run.songs.push(song);
  }, []);

  // Left mid-run: closing the tab (pagehide) or a client navigation (unmount).
  useEffect(() => {
    const onHide = (): void => finish(false);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      finish(false);
    };
  }, [finish]);

  return useMemo(() => ({ open, attach, answer, finish }), [open, attach, answer, finish]);
}
