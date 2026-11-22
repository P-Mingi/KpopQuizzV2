'use client';
// The live row of the Bunnyverse passport (owner, 2026-11-22: "with some of the information showing live"). Two tiles that the browser keeps
// up to date: the daily games still to play today on this device with the clock to the next puzzles (the same count as the badge of the
// Daily games tab, lib/dle/local.ts), and, with the cards bridges on, the KpopCards packs ready with the clock to the next free pack
// (GET /api/cards/state, the lobby's own read, once; the clock then ticks here and reads again when it reaches zero). Until the browser
// knows, each tile shows a quiet placeholder, so the server HTML never states a number it cannot know.
import { useEffect, useState } from 'react';

import { clock, deviceStore, useResetCountdown } from '@/components/hub/dle/dle-hooks';
import { CARDS_PATH } from '@/lib/cards-bridge/links';
import { httpApi } from '@/lib/cards/ui-api';
import { utcDate } from '@/lib/dle/day';
import { builtGames, DAILY_PATH } from '@/lib/dle/games';
import { gamesLeftToday, readHistory } from '@/lib/dle/local';
import { withBasePath } from '@/lib/site/base-path';

export interface PassportLiveWords {
  readonly live: string;
  readonly dailyH: string;
  readonly dailyLeft: string;
  readonly dailyDone: string;
  readonly dailyReset: string;
  readonly dailyCta: string;
  readonly packsH: string;
  readonly packsReady: string;
  readonly packsReady1: string;
  readonly packsNone: string;
  readonly packsNext: string;
  readonly packsFull: string;
  readonly packsCta: string;
}

const fill = (s: string, vars: Readonly<Record<string, string | number>>): string => s.replace(/\{([a-zA-Z0-9]+)\}/g, (w, k: string) => (vars[k] === undefined ? w : String(vars[k])));

function LiveDot({ label }: { label: string }): React.ReactElement {
  return <span className="hub-pp-live"><span aria-hidden="true" className="hub-pp-live-dot" />{label}</span>;
}

function useGamesLeft(): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const read = (): void => setLeft(gamesLeftToday(readHistory(deviceStore()), utcDate(new Date())));
    read();
    window.addEventListener('dle:history', read);
    window.addEventListener('focus', read);
    return () => { window.removeEventListener('dle:history', read); window.removeEventListener('focus', read); };
  }, []);
  return left;
}

interface Packs { readonly stock: number; readonly nextAt: string | null }

function usePacks(on: boolean): Packs | null {
  const [packs, setPacks] = useState<Packs | null>(null);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!on) return;
    let live = true;
    httpApi.state().then((s) => {
      if (live && s && !('error' in s)) setPacks({ stock: s.stock, nextAt: s.nextAt });
    }).catch(() => {});
    return () => { live = false; };
  }, [on, round]);
  // Read again once the next free pack is due (a few seconds after, so the server has added it).
  useEffect(() => {
    if (!packs?.nextAt) return;
    const due = Date.parse(packs.nextAt) - Date.now() + 3000;
    if (!Number.isFinite(due)) return;
    const id = window.setTimeout(() => setRound((r) => r + 1), Math.max(3000, due));
    return () => window.clearTimeout(id);
  }, [packs]);
  return packs;
}

function useSecondsTo(iso: string | null): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) { setLeft(null); return; }
    const at = Date.parse(iso);
    const tick = (): void => setLeft(Math.max(0, Math.round((at - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [iso]);
  return left;
}

/** 06:41, or 1:02:09 past an hour: the clock of the next free pack. */
function short(seconds: number): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(seconds % 60)}` : `${pad(m)}:${pad(seconds % 60)}`;
}

export function HubPassportLive({ cards, words: w }: { cards: boolean; words: PassportLiveWords }): React.ReactElement {
  const total = builtGames().length;
  const left = useGamesLeft();
  const reset = useResetCountdown();
  const packs = usePacks(cards);
  const next = useSecondsTo(packs?.nextAt ?? null);
  const done = left !== null && left === 0;
  return (
    <div className={`hub-pp-liverow${cards ? '' : ' hub-pp-liverow-1'}`}>
      <div className={`hub-pp-tile hub-pp-tile-daily${done ? ' hub-pp-tile-done' : ''}`}>
        <div className="hub-pp-tile-top"><h3 className="hub-pp-h3">{w.dailyH}</h3><LiveDot label={w.live} /></div>
        <p className="hub-pp-big" aria-live="polite">
          {left === null ? <span className="hub-pp-skel" /> : done ? fill(w.dailyDone, { total }) : fill(w.dailyLeft, { n: left, total })}
        </p>
        <span aria-hidden="true" className="hub-pp-dots">
          {Array.from({ length: total }, (_, i) => <span key={i} className={left !== null && i < total - left ? 'hub-pp-dot-on' : ''} />)}
        </span>
        <p className="hub-pp-meta hub-pp-num">{fill(w.dailyReset, { clock: clock(reset) })}</p>
        <a className="hub-pp-tilecta" href={withBasePath(DAILY_PATH)}>{w.dailyCta}</a>
      </div>
      {cards ? (
        <div className="hub-pp-tile hub-pp-tile-packs">
          <div className="hub-pp-tile-top"><h3 className="hub-pp-h3">{w.packsH}</h3><LiveDot label={w.live} /></div>
          <p className="hub-pp-big" aria-live="polite">
            {packs === null ? <span className="hub-pp-skel" /> : packs.stock === 0 ? w.packsNone : packs.stock === 1 ? w.packsReady1 : fill(w.packsReady, { n: packs.stock })}
          </p>
          <span aria-hidden="true" className="hub-pp-packs">
            {Array.from({ length: Math.min(packs?.stock ?? 0, 7) }, (_, i) => <span key={i} />)}
          </span>
          <p className="hub-pp-meta hub-pp-num">{packs === null ? ' ' : packs.nextAt === null ? w.packsFull : fill(w.packsNext, { clock: next === null ? '' : short(next) })}</p>
          <a className="hub-pp-tilecta" href={withBasePath(CARDS_PATH)}>{w.packsCta}</a>
        </div>
      ) : null}
    </div>
  );
}
