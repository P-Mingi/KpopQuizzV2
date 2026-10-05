'use client';

import { useEffect, useState } from 'react';

import { Mascot } from '@/components/ui/mascot';
import { UxButton } from '@/components/ux-v1/button';
import { CoverImg } from '@/components/ux-v1/cover-img';
import { Icon } from '@/components/ux-v1/icon';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { ShareSheet } from '@/components/ux-v1/share-sheet';
import { BT_STRINGS_EN } from '@/lib/growth/bt-strings';
import { comma } from '@/lib/ux-v1/p6/points';

import { BtChallengeLink, useBtChallengeLink } from './challenge-link';

import type { RunApi } from './use-run';
import type { BtStrings } from '@/lib/growth/bt-strings';
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
  /** Kicker override (P7: "Ranked run · Season 3"; a challenge result: "Challenge from blink_edits"). */
  kicker?: string | undefined;
  /** Between the card and the actions: P7's season impact block, a challenge win / lose sentence. */
  slot?: React.ReactNode;
  /** Primary action override (P7: "Play another ranked run"). */
  primary?: React.ReactNode;
  /** "Challenge a friend with these exact songs" (free runs): the results row AND the Share
   *  sheet's Challenge link block, one link for the run (challenge-link.tsx). */
  challengeLink?: boolean;
  /** Under the actions (after the challenge row): the caller's own block. */
  challenge?: React.ReactNode;
  /** The Share link (default: the hub; a /blindtest/<mode> page shares itself). */
  shareUrl?: string;
  /** V12 landings: the results in another language (lib/growth/bt-strings.ts). Default: English, unchanged. */
  strings?: BtStrings | undefined;
}

/** The Share sheet's challenge note (prototype #sh-ch, songs for a blindtest). */
export const CHALLENGE_NOTE = 'They play your exact songs · 48 hours';

export function BtResults({ run, board, onAgain, onBoard, kicker, slot, primary, challengeLink = false, challenge, shareUrl, strings: s = BT_STRINGS_EN }: BtResultsProps): React.ReactElement {
  const [share, setShare] = useState(false);
  const [playing, setPlaying] = useState<number | null>(null);
  const link = useBtChallengeLink(run);
  const { questions, answers, summary, mode, pick, daily } = run;
  const n = questions.length;
  const score = summary.correct;
  const label = s.scoreLabel(score, n);
  const good = n > 0 && score / n >= 0.6;
  const title = mode === 'daily' ? 'Blindtest of the day' : s.runTitle(pick.label);
  // The card names the run (prototype btEnd: B_.label): the playlist of a free run, the
  // daily, or the caller's kicker (a challenge result, a ranked run).
  const kick = kicker ?? (mode === 'daily' ? 'Blindtest of the day' : pick.label);
  const shareChallenge = challengeLink && link.url ? { challenge: { url: link.url, note: s.challengeNote } } : {};

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
    : { value: summary.fastestMs !== null ? s.secs(summary.fastestMs) : '-', label: s.fastestAnswer };

  const rankLine = mode === 'daily'
    ? daily.rank !== null
      ? <>You are <b className="ux-num">#{comma(daily.rank)}</b> of {comma(daily.total ?? board?.total ?? 0)} fans on today&apos;s board.</>
      : daily.signedIn === false
        ? <>Sign in before tomorrow&apos;s blindtest to get a rank on the board.</>
        : null
    : null;

  const shareText = mode === 'daily'
    ? `I scored ${score}/10 on today's K-pop Blindtest of the Day.`
    : s.shareText(score, n);

  const togglePlay = (i: number, url: string): void => {
    if (playing === i) { run.stopClip(); setPlaying(null); return; }
    run.playClip(url);
    setPlaying(i);
  };

  return (
    <div className="ux-stage p6-res" lang={s.lang === 'en' ? undefined : s.lang}>
      <h1 className="ux-sr">{s.resultHeading(score, n, title)}</h1>
      <div className="p6-btcard">
        <Mascot variant={good ? 'celebrate' : 'sad'} size={76} alt="" className="p6-msc" />
        <div className="p6-kick">{kick}</div>
        <div className="p6-s ux-num">{score}<small>/{n}</small></div>
        <div className="p6-l">{label} · {s.points(s.num(summary.points))}</div>
        <div className="ux-stats3 p6-stats3">
          <div><b>x{summary.bestStreak}</b><span>{s.bestCombo}</span></div>
          <div><b>{summary.avgMs !== null ? s.secs(summary.avgMs) : '-'}</b><span>{s.averageAnswer}</span></div>
          <div><b>{third.value}</b><span>{third.label}</span></div>
        </div>
      </div>

      {slot ? <div className="p6-slot">{slot}</div> : null}
      {rankLine ? <p className="p6-rankline">{rankLine}</p> : null}

      <div className="p6-resact">
        {primary ?? (mode === 'daily'
          ? <UxButton size="lg" icon="trophy" onClick={onBoard}>See today&apos;s board</UxButton>
          : <UxButton size="lg" icon="redo" onClick={onAgain}>{s.playAgain}</UxButton>)}
        {/* Opening the sheet mints the run's challenge link for its block (like P4's result sheet). */}
        <UxButton size="lg" variant="ghost" icon="share" onClick={() => { setShare(true); if (challengeLink) void link.create(); }}>{s.share}</UxButton>
      </div>

      {challengeLink ? <BtChallengeLink run={run} link={link} strings={s} /> : null}
      {challenge}

      <section className="ux-sec" aria-labelledby="p6-songs-h">
        <SectionHeader id="p6-songs-h" title={s.yourSongs} icon="music" sub={s.yourSongsSub} />
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
                  aria-label={s.clipButton(playing === i, q.reveal.title)}
                  aria-pressed={playing === i}
                  onClick={() => togglePlay(i, q.preview_url)}
                >
                  <Icon name="play" />
                </button>
                {q.album_cover_medium || q.reveal.cover
                  ? <CoverImg className="p6-scv" src={q.album_cover_medium ?? q.reveal.cover ?? ''} alt="" width={48} height={48} loading="lazy" decoding="async" />
                  : <span className="p6-scv" aria-hidden="true" />}
                <span className="p6-grow">
                  <span className="ux-rt">{q.reveal.title}</span>
                  <span className="ux-rs">{q.reveal.artist}</span>
                </span>
                <span className={`p6-sres ${ok ? 'is-ok' : 'is-no'}`}>
                  <Icon name={ok ? 'check' : 'x'} size="sm" />
                  {ok && a ? <span className="ux-num">+{pts} · {s.secs(a.time_ms)}</span> : a?.picked === null ? s.timeUp : s.missed}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <ShareSheet
        open={share}
        onClose={() => setShare(false)}
        title={s.shareTitle}
        preview={{ image: questions[0]?.reveal.cover ?? null, line1: s.resultHeading(score, n, title), line2: s.shareLine2(s.num(summary.points), summary.bestStreak) }}
        url={shareUrl ?? `${SITE}/blindtest`}
        text={shareText}
        {...shareChallenge}
      />
    </div>
  );
}
