'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { useAnnounce } from '@/components/ux-v1/toast';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { useShellMode } from '@/components/ux-v1/use-shell-mode';

import { BtGame } from './game';
import { ModeCtx, useMode } from './mode-context';
import { BtResults } from './results';
import { TIMER_S, useBlindtestRun } from './use-run';

import type { ModeApi } from './mode-context';
import type { ModeRun } from '@/lib/ux-v1/p6/modes';

interface Props {
  /** The run Play starts: the same generate body the hub sends for that playlist. */
  preset: ModeRun;
  /** This page's absolute URL (the results' Share link). */
  shareUrl: string;
  /** The server-rendered mode page (the SEO copy of today's page and the Play island). */
  children: React.ReactNode;
}

const IN_GAME = new Set(['tap', 'loading', 'playing', 'reveal']);

/**
 * The client controller of a /blindtest/<mode> page under the flag (X1-001). The
 * page itself is server-rendered (title, meta, H1, intro, links as today); this
 * wraps it, owns the run (use-run.ts, the hub's engine) and swaps the page for
 * the day-mode game (focus mode) and then the results, like the hub does. Free
 * play: it saves nothing, exactly like a free run on the hub.
 */
export function BtModeController({ preset, shareUrl, children }: Props): React.ReactElement {
  const announce = useAnnounce();
  const live = useIsClient();
  const run = useBlindtestRun({ announce });
  const inGame = IN_GAME.has(run.phase);
  useShellMode(inGame ? 'focus' : null);

  const { startFree } = run;
  const start = useCallback(() => { void startFree(preset.pick, preset.count); }, [preset, startFree]);

  // Leaving the game or the results returns to the top of the page.
  const lastPhase = useRef(run.phase);
  useEffect(() => {
    if (lastPhase.current !== run.phase && (run.phase === 'results' || run.phase === 'idle')) window.scrollTo({ top: 0 });
    lastPhase.current = run.phase;
  }, [run.phase]);

  const api: ModeApi = { run, preset, start };

  let body: React.ReactNode;
  if (inGame) body = <BtGame run={run} />;
  else if (run.phase === 'results') {
    body = (
      <BtResults
        run={run}
        board={null}
        onAgain={() => { void run.startFree(run.pick, run.count); }}
        onBoard={run.quit}
        shareUrl={shareUrl}
        challengeLink
        challenge={<p className="p6-moremodes"><Link href="/blindtest">Try another mode</Link></p>}
      />
    );
  } else body = <div className="ux-wrap ux-pg p6-hub p6-mode" data-live={live || undefined}>{children}</div>;

  return <ModeCtx value={api}>{body}</ModeCtx>;
}

/** The mode page's Play button: starts the preset run in place (a real tap, so the clip can play). */
export function BtModePlay(): React.ReactElement | null {
  const mode = useMode();
  const live = useIsClient();
  if (!mode) return null;
  const { run, preset, start } = mode;
  return (
    <>
      <div className="p6-mode-go" data-live={live || undefined}>
        <UxButton size="lg" icon="play" onClick={start} aria-busy={run.phase === 'loading' || undefined}>Play</UxButton>
        <span className="p6-mode-run">{preset.count} songs from {preset.pick.label} · {TIMER_S} seconds each</span>
      </div>
      {run.error ? <p className="p6-err" role="alert">{run.error}</p> : null}
    </>
  );
}
