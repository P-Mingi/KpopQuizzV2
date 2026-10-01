'use client';

import { useCallback, useRef, useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { useUxToast } from '@/components/ux-v1/toast';

import type { BtQuestion } from './types';
import type { RunApi } from './use-run';
import type { FrozenQuestion } from '@/lib/ux-v1/p6/challenge';

// Results: "Challenge a friend with these exact songs" + Copy link (prototype
// #btend .mine), and the Share sheet's Challenge link block (prototype #share
// #sh-ch). ONE link per run, shared by both: the first ask creates it (POST
// /api/ux-v1/p6/challenge, the run's rounds without the expiring preview URLs);
// later asks reuse it. A new run (Play again) gets a new link.

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function freeze(q: RunApi['questions'][number]): FrozenQuestion {
  return {
    song_id: q.song_id,
    question_type: q.question_type,
    question_text: q.question_text,
    correct_answer: q.correct_answer,
    choices: q.choices,
    reveal: q.reveal,
    album_cover_medium: q.album_cover_medium,
    album_cover_big: q.album_cover_big,
  };
}

export interface BtChallengeLinkState {
  /** The run's challenge link once created, else null. */
  url: string | null;
  busy: boolean;
  /** Creates the run's link (once; a second call while it is on its way waits for it). Null on failure. */
  create: () => Promise<string | null>;
}

/** The challenge link of the current run (keyed by the run's rounds). */
export function useBtChallengeLink(run: RunApi): BtChallengeLinkState {
  const [made, setMade] = useState<{ key: BtQuestion[]; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ key: BtQuestion[]; p: Promise<string | null> } | null>(null);
  const url = made && made.key === run.questions ? made.url : null;

  const create = useCallback((): Promise<string | null> => {
    if (url) return Promise.resolve(url);
    const key = run.questions;
    if (pending.current?.key === key) return pending.current.p;
    const body = JSON.stringify({
      playlist: run.pick.playlist,
      questions: key.map(freeze),
      score: run.summary.correct,
      total: key.length,
      points: run.summary.points,
      timeMs: run.answers.reduce((s, a) => s + a.time_ms, 0),
      bestCombo: run.summary.bestStreak,
    });
    const p = (async (): Promise<string | null> => {
      setBusy(true);
      try {
        const res = await fetch('/api/ux-v1/p6/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
        const d = (await res.json().catch(() => ({}))) as { path?: string };
        if (!res.ok || typeof d.path !== 'string') return null;
        const link = `${window.location.origin}${d.path}`;
        setMade({ key, url: link });
        return link;
      } catch {
        return null;
      } finally {
        setBusy(false);
        if (pending.current?.key === key) pending.current = null;
      }
    })();
    pending.current = { key, p };
    return p;
  }, [run, url]);

  return { url, busy, create };
}

/** The results row. `link` shares the run's link with the Share sheet; without it the row keeps its own. */
export function BtChallengeLink({ run, link }: { run: RunApi; link?: BtChallengeLinkState }): React.ReactElement {
  const toast = useUxToast();
  const own = useBtChallengeLink(run);
  const { url, busy, create } = link ?? own;

  const onClick = async (): Promise<void> => {
    if (url) { toast((await copy(url)) ? 'Link copied' : 'Copy failed. Long-press the link to copy it.'); return; }
    const made = await create();
    if (!made) { toast('Could not create the link. Try again.'); return; }
    toast((await copy(made)) ? 'Link copied. It works for 48 hours.' : 'Your link is ready below. It works for 48 hours.');
  };

  return (
    <div className="p6-mine">
      <Icon name="target" />
      <span className="p6-grow">
        Challenge a friend with these exact songs
        {url ? <span className="p6-link ux-num">{url.replace(/^https?:\/\//, '')}</span> : null}
      </span>
      <UxButton size="sm" variant="ghost" onClick={() => { void onClick(); }} disabled={busy} aria-busy={busy || undefined}>Copy link</UxButton>
    </div>
  );
}
