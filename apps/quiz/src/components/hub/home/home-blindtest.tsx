'use client';

// Run O1, lot H2a: the preview player of the blindtest (the design's script: press play, ten seconds count, then "Song 1 done").
// Lot H2c: it plays the real preview of the first song of the day (`previewUrl`, audio only: no title, no artist, no cover reaches the
// page) and stops at the clip length. Nothing is loaded before the first press. If the browser refuses the sound, the player goes back
// to "press play".
// Home v3 (2026-10-29, Home.dc.html): the player is one row of Today: the round play button, the name, the bar and the line, and the way to
// the whole set on its own site.
// Home v4 (2026-11-10): a tile of "Also today": its icon (the icon slot), the name and the line on top, the play button, the bar and the way to
// the whole set below. The countdown of the clip stays; the markup of the tile around it is the home's.
import { useEffect, useRef, useState } from 'react';

import { ArrowIcon } from './home-icons';

interface HomeBlindtestProps {
  readonly songs: number;
  readonly seconds: number;
  /** The preview of the first song of the day (about 30 seconds long; the player plays the first `seconds`). */
  readonly previewUrl: string;
  /** The blind test of the day on its own site. */
  readonly href: string;
  /** The drawn icon of the row (its icon slot), server drawn. */
  readonly mark: React.ReactNode;
  readonly labels: {
    readonly title: string;
    readonly playAria: string;
    readonly pauseAria: string;
    /** "KpopQuiz · 10 songs, 10 s each". */
    readonly press: string;
    /** "Song 1 of 10 · 0:{sec} / 0:10". */
    readonly playing: string;
    /** "Song 1 done · {rest} to go". */
    readonly done: string;
    /** "All 10 songs". */
    readonly all: string;
  };
}

export function HomeBlindtest({ songs, seconds, previewUrl, href, mark, labels }: HomeBlindtestProps): React.ReactElement {
  const [playing, setPlaying] = useState(false);
  const [sec, setSec] = useState(0);
  const timer = useRef<number | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const stop = (): void => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => () => {
    stop();
    audio.current?.pause();
    audio.current = null;
  }, []);

  const toggle = (): void => {
    if (playing) {
      stop();
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    const start = sec >= seconds ? 0 : sec;
    setPlaying(true);
    setSec(start);
    stop();
    // The sound starts on the press (a user gesture), where the clip left off.
    const el = audio.current ?? new Audio(previewUrl);
    audio.current = el;
    el.preload = 'auto';
    try {
      el.currentTime = start;
    } catch {
      // not seekable yet: it then starts from the beginning, like a first press
    }
    const refused = (): void => {
      stop();
      el.pause();
      setSec(0);
      setPlaying(false);
    };
    el.play().catch(refused);
    let at = start;
    timer.current = window.setInterval(() => {
      at += 1;
      if (at >= seconds) {
        stop();
        el.pause();
        setSec(seconds);
        setPlaying(false);
      } else {
        setSec(at);
      }
    }, 1000);
  };

  const label = sec >= seconds && !playing
    ? labels.done.replace('{rest}', String(songs - 1))
    : playing
      ? labels.playing.replace('{sec}', sec < 10 ? `0${sec}` : String(sec))
      : labels.press;
  return (
    <>
      <div className="hub-h2-dt-head">
        <span aria-hidden="true" className="hub-h2-th hub-h2-th-48">{mark}</span>
        <span className="hub-h2-dt-body">
          <span className="hub-h2-rt">{labels.title}</span>
          <span className="hub-h2-meta hub-h2-num">{label}</span>
        </span>
      </div>
      <div className="hub-h2-dt-foot hub-h2-bt-foot">
        <button type="button" onClick={toggle} aria-label={playing ? labels.pauseAria : labels.playAria} className="hub-h2-btbtn hub-h2-btn">
          {playing ? (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></svg>
          ) : (
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
          )}
        </button>
        <span aria-hidden="true" className="hub-h2-btbar"><span className="hub-h2-btbar-in" style={{ width: `${(sec / seconds) * 100}%` }} /></span>
        <a href={href} className="hub-h2-tl">{labels.all}<ArrowIcon /></a>
      </div>
    </>
  );
}
