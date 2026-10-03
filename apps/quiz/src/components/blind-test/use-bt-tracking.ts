'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

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
// C3-002: this file never imports lib/tracking/bt.ts statically (types only), so
// with the switch off the legacy pages ship and list no tracking chunk. With it on,
// the module is loaded once (on mount) and every call waits for it in call order.

/** Same test as BT_TRACKING in lib/tracking/bt-shared.ts, inlined at build. */
const BT_ON: boolean =
  process.env.NEXT_PUBLIC_BT_TRACKING === '1' || process.env.NEXT_PUBLIC_BT_TRACKING === 'true';

type BtModule = typeof import('@/lib/tracking/bt');
let btModule: BtModule | null = null;
let btLoading: Promise<BtModule | null> | null = null;

/** Run `fn` with the tracking module: now when it is loaded, else once it is (in call order). */
function withBt(fn: (m: BtModule) => void): void {
  if (!BT_ON) return;
  if (btModule) { fn(btModule); return; }
  if (!btLoading) {
    btLoading = import('@/lib/tracking/bt')
      .then((m) => { btModule = m; return m; })
      .catch(() => null);
  }
  void btLoading.then((m) => { if (m) fn(m); });
}

interface OpenRun {
  ctx: BtRunContext | null;
  rounds: number;
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
    const songs = run.songs.slice();
    const correct = songs.filter((s) => s.correct).length;
    const durationMs = Math.max(0, Date.now() - run.startedAt);
    withBt((m) => {
      if (!run.ctx) return;
      m.trackBtRun({
        event: 'finish',
        ...run.ctx,
        answered: songs.length,
        correct,
        // The legacy games score one point per right answer.
        score: correct,
        best_combo: m.bestCombo(songs),
        duration_ms: durationMs,
        completed,
        songs,
      });
    });
  }, []);

  const open = useCallback<BtTracking['open']>((input) => {
    finish(false);
    if (!BT_ON) return;
    const run: OpenRun = { ctx: null, rounds: input.rounds, startedAt: Date.now(), started: false, songs: [] };
    runRef.current = run;
    withBt((m) => {
      const runId = m.newBtRunId();
      if (!runId) {
        if (runRef.current === run) runRef.current = null;
        return;
      }
      run.ctx = {
        run_id: runId,
        playlist: m.btPlaylistId(input),
        mode: input.mode ?? 'classic',
        source: m.btSourceHere(input.kind),
        locale: m.btLocale(),
        rounds: input.rounds,
      };
    });
  }, [finish]);

  const attach = useCallback<BtTracking['attach']>((audio) => {
    const run = runRef.current;
    if (!run || run.started || !audio) return;
    audio.addEventListener('playing', () => {
      if (runRef.current !== run || run.started) return;
      run.started = true;
      run.startedAt = Date.now();
      withBt((m) => { if (run.ctx) m.trackBtRun({ event: 'start', ...run.ctx }); });
    }, { once: true });
  }, []);

  const answer = useCallback<BtTracking['answer']>((song) => {
    const run = runRef.current;
    if (run && run.songs.length < run.rounds) run.songs.push(song);
  }, []);

  // Load the module early (switch on only), then: left mid-run, closing the tab
  // (pagehide) or a client navigation (unmount).
  useEffect(() => {
    withBt(() => { /* preload */ });
    const onHide = (): void => finish(false);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      finish(false);
    };
  }, [finish]);

  return useMemo(() => ({ open, attach, answer, finish }), [open, attach, answer, finish]);
}
