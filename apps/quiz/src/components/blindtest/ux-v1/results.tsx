'use client';

import { useEffect, useState } from 'react';

import { Mascot } from '@/components/ui/mascot';
import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { ShareSheet } from '@/components/ux-v1/share-sheet';
import { comma, scoreLabel, secs } from '@/lib/ux-v1/p6/points';

import type { RunApi } from './use-run';
import type { BoardResponse } from '@/lib/ux-v1/p6/board-types';

// Blindtest results, day mode (DESIGN-SPEC 14.7, 16.7, 17.5; prototype #btend):
// the score card on the pink-lilac gradient with the mascot on the seam, the
// label + points, best combo / average answer / XP (or the fastest answer when
// the run awards no XP, as free play does today), then a slot for the ranked
// season impact (P7) or a challenge sentence, the mode-aware primary action +
// Share, and "Your songs" with a play button per song (the run's own clips).

const SITE = 'https://kpopquiz.org';

export interface BtResultsProps {
  run: RunApi;
  board: BoardResponse | null;
  onAgain: () => void;
  onBoard: () => void;
  /** Kicker override (P7: "Ranked run · Season 3"). */
  kicker?: string;
  /** Between the card and the actions: P7's season impact block, a challenge win / lose sentence. */
  slot?: React.ReactNode;
  /** Primary action override (P7: "Play another ranked run"). */
  primary?: React.ReactNode;
  /** Under the actions: the challenge link block. */
  challenge?: React.ReactNode;
}

export function BtResults({ run, board, onAgain, onBoard, kicker, slot, primary, challenge }: BtResultsProps): React.ReactElement {
  const [share, setShare] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const { questions, answers, summary, mode, pick, daily } = run;
  const n = questions.length;
  const score = summary.correct;
  const label = scoreLabel(score, n);
  const good = n > 0 && score / n >= 0.6;
  const title = mode === 'daily' ? 'Blindtest of the day' : `${pick.label} blindtest`;

  // Stop the preview when leaving the results.
  const { stopClip, isPlaying } = run;
  useEffect(() => () => { stopClip(); }, [stopClip]);
  // The clip ended (or was stopped): the row's button goes back to Play. A short
  // grace covers the pause of the previous clip when another row starts.
  useEffect(() => {
    if (isPlaying) return;
    const t = window.setTimeout(() => setPlaying(null), 800);
    return () => window.clearTimeout(t);
  }, [isPlaying]);

  const xp = mode === 'daily' && daily.signedIn ? daily.xp : null;
  const third = xp !== null
    ? { value: `+${xp}`, label: 'XP' }
    : { value: summary.fastestMs !== null ? secs(summary.fastestMs) : '-', label: 'Fastest answer' };

  const rankLine = mode === 'daily'
    ? daily.rank !== null
      ? <>You are <b className="ux-num">#{comma(daily.rank)}</b> of {comma(daily.total ?? board?.total ?? 0)} fans on today&apos;s board.</>
      : daily.signedIn === false
        ? <>Sign in before tomorrow&apos;s blindtest to get a rank on the board.</>
        : null
    : null;

  const shareText = mode === 'daily'
    ? `I scored ${score}/10 on today's K-pop Blindtest of the Day.`
    : `I scored ${score}/${n} on the kpopquiz.org K-pop Blind Test. Can you beat me?`;

  const togglePlay = (i: number, url: string): void => {
    if (playing === i) { run.stopClip(); setPlaying(null); return; }
    run.playClip(url);
    setPlaying(i);
  };

  return (
    <div className="ux-stage p6-res">
      <h1 className="ux-sr">{score}/{n} on the {title}</h1>
      <div className="p6-btcard">
        <Mascot variant={good ? 'celebrate' : 'sad'} size={76} alt="" className="p6-msc" />
        <div className="p6-kick">{kicker ?? title}</div>
        <div className="p6-s ux-num">{score}<small>/{n}</small></div>
        <div className="p6-l">{label} · {comma(summary.points)} points</div>
        <div className="ux-stats3 p6-stats3">
          <div><b>x{summary.bestStreak}</b><span>Best combo</span></div>
          <div><b>{summary.avgMs !== null ? secs(summary.avgMs) : '-'}</b><span>Average answer</span></div>
          <div><b>{third.value}</b><span>{third.label}</span></div>
        </div>
      </div>

      {slot ? <div className="p6-slot">{slot}</div> : null}
      {rankLine ? <p className="p6-rankline">{rankLine}</p> : null}

      <div className="p6-resact">
        {primary ?? (mode === 'daily'
          ? <UxButton size="lg" icon="trophy" onClick={onBoard}>See today&apos;s board</UxButton>
          : <UxButton size="lg" icon="redo" onClick={onAgain}>Play again</UxButton>)}
        <UxButton size="lg" variant="ghost" icon="share" onClick={() => setShare(true)}>Share</UxButton>
      </div>

      {challenge}

      <section className="ux-sec" aria-labelledby="p6-songs-h">
        <SectionHeader id="p6-songs-h" title="Your songs" icon="music" sub="Play any clip again" />
        <div className="ux-rows p6-songs">
          {questions.map((q, i) => {
            const a = answers[i];
            const ok = a?.correct ?? false;
            const pts = summary.rounds[i]?.points ?? 0;
            return (
              <div className="p6-songrow" key={`${q.song_id}-${i}`}>
                <button
                  type="button"
                  className={`p6-play-b${playing === i ? ' is-on' : ''}`}
                  aria-label={`${playing === i ? 'Stop' : 'Play'} the ${q.reveal.title} clip`}
                  aria-pressed={playing === i}
                  onClick={() => togglePlay(i, q.preview_url)}
                >
                  <Icon name="play" />
                </button>
                {q.album_cover_medium || q.reveal.cover
                  // eslint-disable-next-line @next/next/no-img-element -- Deezer album art from the run
                  ? <img className="p6-scv" src={q.album_cover_medium ?? q.reveal.cover ?? ''} alt="" width={48} height={48} loading="lazy" decoding="async" />
                  : <span className="p6-scv" aria-hidden="true" />}
                <span className="p6-grow">
                  <span className="ux-rt">{q.reveal.title}</span>
                  <span className="ux-rs">{q.reveal.artist}</span>
                </span>
                <span className={`p6-sres ${ok ? 'is-ok' : 'is-no'}`}>
                  <Icon name={ok ? 'check' : 'x'} size="sm" />
                  {ok && a ? <span className="ux-num">+{pts} · {secs(a.time_ms)}</span> : a?.picked === null ? 'Time is up' : 'Missed'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <ShareSheet
        open={share}
        onClose={() => setShare(false)}
        title="Share your score"
        preview={{ image: questions[0]?.reveal.cover ?? null, line1: `${score}/${n} on the ${title}`, line2: `${label} · ${comma(summary.points)} points` }}
        url={`${SITE}/blindtest`}
        text={shareText}
      />
    </div>
  );
}
