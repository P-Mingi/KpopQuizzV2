'use client';

import { useState } from 'react';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { useUxToast } from '@/components/ux-v1/toast';

import type { RunApi } from './use-run';
import type { FrozenQuestion } from '@/lib/ux-v1/p6/challenge';

// Results: "Challenge a friend with these exact songs" + Copy link (prototype
// #btend .mine). The first tap creates the link (POST /api/ux-v1/p6/challenge,
// the run's rounds without the expiring preview URLs); later taps copy it again.

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

export function BtChallengeLink({ run }: { run: RunApi }): React.ReactElement {
  const toast = useUxToast();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onClick = async (): Promise<void> => {
    if (url) { toast((await copy(url)) ? 'Link copied' : 'Copy failed. Long-press the link to copy it.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/ux-v1/p6/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlist: run.pick.playlist,
          questions: run.questions.map(freeze),
          score: run.summary.correct,
          total: run.questions.length,
          points: run.summary.points,
          timeMs: run.answers.reduce((s, a) => s + a.time_ms, 0),
          bestCombo: run.summary.bestStreak,
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { path?: string };
      if (!res.ok || typeof d.path !== 'string') { toast('Could not create the link. Try again.'); return; }
      const link = `${window.location.origin}${d.path}`;
      setUrl(link);
      toast((await copy(link)) ? 'Link copied. It works for 48 hours.' : 'Your link is ready below. It works for 48 hours.');
    } catch {
      toast('Could not create the link. Check your connection.');
    } finally {
      setBusy(false);
    }
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
