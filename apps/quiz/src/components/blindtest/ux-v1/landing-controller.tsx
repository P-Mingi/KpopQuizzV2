'use client';

import { useCallback, useEffect, useRef } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { useAnnounce } from '@/components/ux-v1/toast';
import { useIsClient } from '@/components/ux-v1/use-is-client';
import { useShellMode } from '@/components/ux-v1/use-shell-mode';
import { BT_STRINGS, localizeRunError } from '@/lib/growth/bt-strings';
import { ALL_PICK } from '@/lib/ux-v1/p6/playlists';

import { BtGame } from './game';
import { ModeCtx, useMode } from './mode-context';
import { BtResults } from './results';
import { useBlindtestRun } from './use-run';

import type { ModeApi } from './mode-context';
import type { BtLang } from '@/lib/growth/bt-strings';
import type { ModeRun } from '@/lib/ux-v1/p6/modes';

interface Props {
  lang: BtLang;
  /** This landing's absolute URL (the results' Share link). */
  shareUrl: string;
  /** The server-rendered landing (H1, lead, playlists, steps, FAQ) with the Start island. */
  children: React.ReactNode;
}

const IN_GAME = new Set(['tap', 'loading', 'playing', 'reveal']);

/** What Start plays on a landing: ten songs from every playlist (prototype: btStart('All K-pop')). */
const LANDING_RUN: ModeRun = { pick: ALL_PICK, count: 10, exact: true };

/**
 * The client controller of a blindtest landing (V12, SYSTEM.md 4). The page is
 * server-rendered; this wraps it, owns the run (use-run.ts, the hub's engine) and
 * swaps the page for the v11 day-mode game and then the results, in the page's
 * language (lib/growth/bt-strings.ts). A free run: it saves nothing. Tracking
 * (when its own switch is on) records the run with the landing as its source: the
 * hook reads the page path (lib/tracking/bt-shared.ts btSourceFor).
 */
export function BtLandingController({ lang, shareUrl, children }: Props): React.ReactElement {
  const s = BT_STRINGS[lang];
  const announce = useAnnounce();
  const live = useIsClient();
  // English: the hook announces each answer itself, as on the hub. Other languages:
  // the hook only knows English, so the same announcement is made here.
  const run = useBlindtestRun(lang === 'en' ? { announce } : {});
  const inGame = IN_GAME.has(run.phase);
  useShellMode(inGame ? 'focus' : null);

  const { startFree } = run;
  const start = useCallback(() => { void startFree(LANDING_RUN.pick, LANDING_RUN.count); }, [startFree]);

  const lastAnnounced = useRef(-1);
  useEffect(() => {
    if (lang === 'en') return;
    if (run.phase === 'playing' && run.answers.length === 0) lastAnnounced.current = -1;
    if (run.phase !== 'reveal') return;
    const i = run.answers.length - 1;
    if (i < 0 || lastAnnounced.current === i) return;
    lastAnnounced.current = i;
    const a = run.answers[i]!;
    const q = run.questions[i];
    announce(s.announce(a.correct ? 'correct' : a.picked === null ? 'timeout' : 'missed', run.summary.rounds[i]?.points ?? 0, q ? { title: q.reveal.title, artist: q.reveal.artist } : null));
  }, [announce, lang, run.answers, run.phase, run.questions, run.summary.rounds, s]);

  // Leaving the game or the results returns to the top of the page.
  const lastPhase = useRef(run.phase);
  useEffect(() => {
    if (lastPhase.current !== run.phase && (run.phase === 'results' || run.phase === 'idle')) window.scrollTo({ top: 0 });
    lastPhase.current = run.phase;
  }, [run.phase]);

  const api: ModeApi = { run, preset: LANDING_RUN, start };

  let body: React.ReactNode;
  if (inGame) body = <BtGame run={run} strings={s} />;
  else if (run.phase === 'results') {
    body = (
      <BtResults
        run={run}
        board={null}
        onAgain={() => { void run.startFree(run.pick, run.count); }}
        onBoard={run.quit}
        shareUrl={shareUrl}
        challengeLink
        strings={s}
      />
    );
  } else body = <div className="ux-wrap ux-pg p6-hub g3-land" lang={lang} data-live={live || undefined}>{children}</div>;

  return <ModeCtx value={api}>{body}</ModeCtx>;
}

/** The landing's Start button: starts the run in place (a real tap, so the clip can play). */
export function BtLandingStart({ lang, label }: { lang: BtLang; label: string }): React.ReactElement | null {
  const mode = useMode();
  if (!mode) return null;
  const { run, start } = mode;
  return <UxButton size="lg" icon="play" onClick={start} aria-busy={run.phase === 'loading' || undefined} data-g3="start" lang={lang}>{label}</UxButton>;
}

/** The start error under the hero actions, in the page's language. */
export function BtLandingError({ lang }: { lang: BtLang }): React.ReactElement | null {
  const mode = useMode();
  const error = localizeRunError(mode?.run.error ?? null, BT_STRINGS[lang]);
  return error ? <p className="p6-err" role="alert">{error}</p> : null;
}
