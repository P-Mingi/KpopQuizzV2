'use client';

// Run O1, lot H2a: the preview player of the blindtest card (the design's script: press play, ten seconds count, then "Song 1 done").
// It plays no sound yet: the real preview arrives with the blindtest data of lot H2b.
import { useEffect, useRef, useState } from 'react';

interface HomeBlindtestProps {
  readonly songs: number;
  readonly seconds: number;
  readonly labels: {
    readonly playAria: string;
    readonly pauseAria: string;
    /** "Song 1 of 5 · press play". */
    readonly press: string;
    /** "Song 1 of 5 · 0:{sec} / 0:10". */
    readonly playing: string;
    /** "Song 1 done. 4 to go on KpopQuiz". */
    readonly done: string;
  };
}

export function HomeBlindtest({ songs, seconds, labels }: HomeBlindtestProps): React.ReactElement {
  const [playing, setPlaying] = useState(false);
  const [sec, setSec] = useState(0);
  const timer = useRef<number | null>(null);
  const stop = (): void => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => stop, []);

  const toggle = (): void => {
    if (playing) {
      stop();
      setPlaying(false);
      return;
    }
    const start = sec >= seconds ? 0 : sec;
    setPlaying(true);
    setSec(start);
    stop();
    let at = start;
    timer.current = window.setInterval(() => {
      at += 1;
      if (at >= seconds) {
        stop();
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
    <div className="hub-h2-btplayer">
      <button type="button" onClick={toggle} aria-label={playing ? labels.pauseAria : labels.playAria} className="hub-h2-btbtn hub-h2-btn">
        {playing ? (
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></svg>
        ) : (
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>
        )}
      </button>
      <div className="hub-h2-btbody">
        <div className="hub-h2-bar"><div className="hub-h2-bar-in" style={{ width: `${(sec / seconds) * 100}%` }} /></div>
        <span className="hub-h2-btlabel">{label}</span>
      </div>
    </div>
  );
}
