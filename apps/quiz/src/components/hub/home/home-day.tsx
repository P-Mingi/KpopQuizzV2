'use client';

// Home v4 (2026-11-10, HOME-AUDIT.md P1-3, P1-5): the small client island of the daily games. It reads this device's finished plays and
// the plays in progress (the same two reads as the board of /daily), and gives the cards of the games, the "Your day" card, the lede of the
// hero and the badge of the Daily games tab one shared, honest state. The server draws every one of them with nothing played, so the page
// is complete without a script; the island only corrects what this browser knows.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { deviceStore, useDleClient } from '@/components/hub/dle/dle-hooks';
import { utcDate } from '@/lib/dle/day';
import { gamesLeftToday, readHistory, recordPlay } from '@/lib/dle/local';

import { ArrowIcon, CheckIcon } from './home-icons';
import { DAY_GAME_ID, TODO, dayCounts, gameState } from './home-day-logic';
import { HomeCountdown } from './home-countdown';

import type { DayGame, GameState } from './home-day-logic';

interface DayValue {
  /** True once the browser has read its state (before that, the server's draw: nothing played). */
  readonly ready: boolean;
  readonly states: Readonly<Record<DayGame, GameState>>;
}

const NONE: DayValue = { ready: false, states: { kpopdle: TODO, otakudle: TODO } };
const DayContext = createContext<DayValue>(NONE);

/** Reads the state of the games of the home once, and again each time a finished play is recorded on this device. */
export function HomeDayProvider({ games, children }: { games: readonly DayGame[]; children: React.ReactNode }): React.ReactElement {
  const client = useDleClient();
  const [history, setHistory] = useState(() => readHistory(deviceStore()));
  const [progress, setProgress] = useState<Readonly<Partial<Record<DayGame, number>>>>({});
  const [ready, setReady] = useState(false);
  const key = games.join(',');
  useEffect(() => {
    let alive = true;
    const read = (): void => setHistory(readHistory(deviceStore()));
    read();
    setReady(true);
    window.addEventListener('dle:history', read);
    for (const g of games) {
      client.day(DAY_GAME_ID[g]).then((d) => {
        const p = d.play;
        if (!alive || !p || p.guesses.length === 0) return;
        if (p.status === 'playing') {
          setProgress((x) => ({ ...x, [g]: p.guesses.length }));
          return;
        }
        // The server's state is the truth: a play finished on another device of this browser's token joins this device's history.
        recordPlay(deviceStore(), DAY_GAME_ID[g], p.date, { won: p.status === 'won', guesses: p.guesses.length });
        window.dispatchEvent(new Event('dle:history'));
      }).catch(() => { /* the cards stay as drawn: every game to play */ });
    }
    return () => { alive = false; window.removeEventListener('dle:history', read); };
    // One read per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const value = useMemo<DayValue>(() => {
    const today = utcDate(new Date());
    return { ready, states: { kpopdle: gameState(history, progress, 'kpopdle', today), otakudle: gameState(history, progress, 'otakudle', today) } };
  }, [ready, history, progress]);
  return <DayContext.Provider value={value}>{children}</DayContext.Provider>;
}

export function useDay(): DayValue {
  return useContext(DayContext);
}

// ---- the badge of the Daily games tab: the same count as the badge of every other hub page (DleLeftBadge of the dle pages) ----

export function HomeNavBadge({ srLabel }: { srLabel: string }): React.ReactElement | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const read = (): void => setLeft(gamesLeftToday(readHistory(deviceStore()), utcDate(new Date())));
    read();
    window.addEventListener('dle:history', read);
    return () => window.removeEventListener('dle:history', read);
  }, []);
  if (left === null || left === 0) return null;
  return <span className="hub-h2-badge hub-h2-num">{left}<span className="hub-h2-sr"> {srLabel}</span></span>;
}

// ---- the cards of the two games ----

export interface GameCardLabels {
  readonly play: string;
  readonly cont: string;
  readonly result: string;
  readonly todo: string;
  readonly prog: string;
  readonly won: string;
  readonly lost: string;
  readonly metaTodo: string;
  /** "{n} guesses so far", "Solved in {n} tries", "Solved in 1 try", "Gave up after {n} guesses": `{n}` is filled here. */
  readonly metaProg: string;
  readonly metaWon: string;
  readonly metaWon1: string;
  readonly metaLost: string;
}

const fill = (t: string, n: number): string => t.replace('{n}', String(n));

/** The chip of each state (written out: the sheet test reads class names from the source). */
const CHIP_CLASS = { todo: 'hub-h2-chip-todo', prog: 'hub-h2-chip-prog', done: 'hub-h2-chip-done' } as const;

/** The state chip, the line under it and the call to action of one game, for a state. */
export function cardView(state: GameState, labels: GameCardLabels): { chip: string; meta: string; cta: string; solid: boolean; tone: 'todo' | 'prog' | 'done' } {
  if (state.kind === 'done') {
    return {
      chip: state.won ? labels.won : labels.lost,
      meta: state.won ? (state.guesses === 1 ? labels.metaWon1 : fill(labels.metaWon, state.guesses)) : fill(labels.metaLost, state.guesses),
      cta: labels.result, solid: false, tone: 'done',
    };
  }
  if (state.kind === 'prog') return { chip: labels.prog, meta: fill(labels.metaProg, state.guesses), cta: labels.cont, solid: true, tone: 'prog' };
  return { chip: labels.todo, meta: labels.metaTodo, cta: labels.play, solid: true, tone: 'todo' };
}

interface GameCardProps {
  readonly game: DayGame;
  readonly toneClass: string;
  readonly name: string;
  readonly head: string;
  readonly tail: string;
  readonly desc: string;
  readonly href: string;
  readonly vt: string;
  readonly vtLang: string;
  readonly labels: GameCardLabels;
  /** The drawn icon of the game: its image slot, else its icon slot (server drawn). */
  readonly mark: React.ReactNode;
}

export function HomeGameCard({ game, toneClass, name, head, tail, desc, href, vt, vtLang, labels, mark }: GameCardProps): React.ReactElement {
  const { states } = useDay();
  const v = cardView(states[game], labels);
  return (
    <article className={`hub-h2-game ${toneClass}`} aria-labelledby={`game-${game}`}>
      <div className="hub-h2-game-main">
        <div className="hub-h2-game-top">
          <span aria-hidden="true" className="hub-h2-gt">{mark}</span>
          <div className="hub-h2-game-name">
            <h3 id={`game-${game}`} className="hub-h2-h3">{head}<span className="hub-h2-tail">{tail}</span></h3>
            <p className="hub-h2-body">{desc}</p>
          </div>
        </div>
        <div className="hub-h2-game-state">
          <span className={`hub-h2-chip ${CHIP_CLASS[v.tone]}`}>{v.tone === 'done' ? <CheckIcon /> : null}{v.chip}</span>
          <span className="hub-h2-meta hub-h2-num">{v.meta}</span>
        </div>
        <a href={href} aria-label={v.tone === 'done' ? `${v.cta}: ${name}` : undefined} className={`hub-h2-cta ${v.solid ? 'hub-h2-cta-site' : 'hub-h2-cta-line'} hub-h2-btn`}>{v.cta}{v.solid ? <ArrowIcon /> : null}</a>
      </div>
      <div aria-hidden="true" className="hub-h2-stub"><span lang={vtLang} className="hub-h2-vt">{vt}</span></div>
    </article>
  );
}

// ---- the lede of the hero and the "Your day" card ----

export interface YourDayProps {
  readonly username: string;
  readonly games: readonly DayGame[];
  readonly quizzes: { readonly total: number; readonly done: number };
  readonly streaks: readonly { readonly site: 'kpop' | 'anime'; readonly label: string }[];
  readonly levels: string;
  readonly levelsAria: string;
  readonly hrefs: Readonly<Record<DayGame, string>>;
  readonly gameNames: Readonly<Record<DayGame, string>>;
  readonly labels: {
    readonly streak: string;
    readonly title: string;
    readonly done: string;
    readonly left: string;
    readonly play: string;
    readonly playFallback: string;
    readonly allDone: string;
    readonly resets: string;
    readonly resetsFallback: string;
    readonly passport: string;
  };
  readonly nextAt: string | null;
  readonly passportHref: string;
  readonly todayHref: string;
}

function useCounts(games: readonly DayGame[], quizzes: { readonly total: number; readonly done: number }) {
  const { states, ready } = useDay();
  return { ready, ...dayCounts(states, games, quizzes) };
}

/** The line of the hero for a signed-in fan: "Welcome back, @mingi. 2 games left today." The server draws the first sentence alone. */
export function HomeLede({ welcome, games, quizzes, left1, leftN, allDone }: { welcome: string; games: readonly DayGame[]; quizzes: { readonly total: number; readonly done: number }; left1: string; leftN: string; allDone: string }): React.ReactElement {
  const c = useCounts(games, quizzes);
  const tail = !c.ready || c.total === 0 ? '' : c.left === 0 ? allDone : c.left === 1 ? left1 : leftN.replace('{n}', String(c.left));
  return <>{welcome}{tail ? ` ${tail}` : ''}</>;
}

export function HomeYourDay(p: YourDayProps): React.ReactElement {
  const c = useCounts(p.games, p.quizzes);
  const known = c.ready && c.total > 0;
  const next = known ? c.next : null;
  const finished = known && c.left === 0;
  const segments = Array.from({ length: c.total }, (_, i) => i < c.done);
  return (
    <aside aria-labelledby="yd-h" className="hub-h2-card hub-h2-yd">
      <div className="hub-h2-yd-top">
        <span aria-hidden="true" className="hub-h2-av hub-h2-av-lg">{p.username.charAt(0).toUpperCase()}</span>
        <h2 id="yd-h" className="hub-h2-h3">{p.labels.title}</h2>
      </div>
      {p.streaks.length > 0 ? (
        <div className="hub-h2-chips">
          <span className="hub-h2-meta">{p.labels.streak}</span>
          {p.streaks.map((s) => <span key={s.site} className={`hub-h2-chip ${s.site === 'kpop' ? 'hub-h2-chip-k' : 'hub-h2-chip-a'}`}>{s.label}</span>)}
        </div>
      ) : null}
      {c.total > 0 ? (
        <div className="hub-h2-yd-prog">
          <div className="hub-h2-yd-row">
            <p className="hub-h2-rt hub-h2-num">{p.labels.done.replace('{done}', String(c.done)).replace('{total}', String(c.total))}</p>
            {known && !finished ? <p className="hub-h2-meta hub-h2-num">{p.labels.left.replace('{n}', String(c.left))}</p> : null}
          </div>
          <div aria-hidden="true" className="hub-h2-segs" style={{ gridTemplateColumns: `repeat(${c.total}, minmax(0, 1fr))` }}>
            {segments.map((on, i) => <span key={i} className={on ? 'hub-h2-seg-on' : 'hub-h2-seg-off'} />)}
          </div>
        </div>
      ) : null}
      {next ? (
        <a href={p.hrefs[next]} className={`hub-h2-cta hub-h2-cta-site hub-h2-btn ${next === 'kpopdle' ? 'hub-h2-s-k' : 'hub-h2-s-a'}`}>{p.labels.play.replace('{name}', p.gameNames[next])}<ArrowIcon /></a>
      ) : finished ? (
        <div className="hub-h2-yd-done">
          <p className="hub-h2-rt">{p.labels.allDone}</p>
          {p.nextAt ? <p className="hub-h2-meta"><HomeCountdown template={p.labels.resets} fallback={p.labels.resetsFallback} nextAt={p.nextAt} /></p> : null}
        </div>
      ) : p.games.length > 0 ? (
        <a href={p.todayHref} className="hub-h2-cta hub-h2-cta-ink hub-h2-btn">{p.labels.playFallback}<ArrowIcon /></a>
      ) : null}
      <div className="hub-h2-yd-foot">
        <a href={p.passportHref} aria-label={`${p.labels.passport}: ${p.levelsAria}`} className="hub-h2-tl">{p.labels.passport}<ArrowIcon /></a>
        <span className="hub-h2-meta hub-h2-num">{p.levels}</span>
      </div>
    </aside>
  );
}

