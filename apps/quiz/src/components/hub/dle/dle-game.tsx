'use client';

// Daily games step 4: the game of a page (board Kpopdle.dc.html, v2 section 6): title, steps, hints, the centred box with its suggestions, the result, the grid. It is one client component, drawn on the server too:
// the title, the steps and the box are in the HTML. The statuses come from dle_guess, never from a comparison here; the pool is the public one of dle_pool; the answer arrives only inside a finished play.
import { useEffect, useMemo, useRef, useState } from 'react';

import { DleError, shareParam } from '@/lib/dle/client';
import { dleCopy, formatCount, gameCopy, hintValueLabel, valueLabel } from '@/lib/dle/copy';
import { dleGame, localePath } from '@/lib/dle/games';
import { DEFAULT_PROGRESS, readHistory, readProgress, recordPlay, seenAt, universeStreak, writeProgress } from '@/lib/dle/local';
import { suggest } from '@/lib/dle/search';
import { correctCounts, shareText } from '@/lib/dle/share';
import { utcDate } from '@/lib/dle/day';
import { burrowHref, liveGame, nextLiveMode, worldOf } from '@/lib/dle/worlds';
import { withBasePath } from '@/lib/site/base-path';

import { clock, deviceStore, useDleClient, useResetCountdown } from './dle-hooks';
import { D, Flame, Ic, Spark, libraryIcon } from './dle-icons';
import { Avatar, firstValue, parentName } from './dle-avatar';

import type { DleProgress, LocalHistory } from '@/lib/dle/local';
import type { DlePicture } from '@/lib/dle/read';
import type { DleGameCopy } from '@/lib/dle/copy';
import type { DleGameDef, DleGameId, DleHintDef } from '@/lib/dle/games';
import type { DleCell, DleGuess, DleLocale, DlePlayState, DlePool, DlePoolEntity, DlePublicEntity, DleStats } from '@/lib/dle/types';

export interface DleGameProps {
  readonly locale: DleLocale;
  readonly game: DleGameId;
  readonly gameNo: number | null;
  readonly stats: DleStats | null;
  readonly pool: DlePool | null;
  readonly pictures: Readonly<Record<string, DlePicture>>;
  /** Group name to its address on KpopQuiz: the result's links (a name it does not know gets none). */
  readonly quizLinks: Readonly<Record<string, string>>;
  readonly kpopName: string;
}

const CONFETTI: Readonly<Record<'k' | 'a', readonly string[]>> = {
  k: ['#D13A6E', '#F59BBB', '#1F1B17', '#FCE8EF', '#8A2A4C', '#FFD7C2'],
  a: ['#C2410C', '#FDBA8C', '#1F1B17', '#FFF1E6', '#9A3412', '#2F6E5B'],
};

function Confetti({ tone }: { tone: 'k' | 'a' }): React.ReactElement {
  return (
    <div aria-hidden="true" className="hub-dle-confetti">
      {Array.from({ length: 26 }, (_, i) => (
        <span key={i} className="hub-dle-cf" style={{
          left: `${(i * 37) % 100}%`, width: 6 + ((i * 7) % 7), height: 8 + ((i * 5) % 9), background: CONFETTI[tone][i % CONFETTI[tone].length],
          animationDelay: `${(i * 53) % 700}ms`, borderRadius: i % 3 === 0 ? '50%' : 2,
        }} />
      ))}
    </div>
  );
}

function Cell({ cell, value, label, words, fresh, index }: { cell: DleCell; value: string; label: string; words: { right: string; near: string; wrong: string; unknown: string; up: string; down: string }; fresh: boolean; index: number }): React.ReactElement {
  const word = cell.status === 'correct' ? words.right : cell.status === 'near' ? words.near : cell.status === 'wrong' ? words.wrong : words.unknown;
  const aria = `${label}: ${value || '?'}, ${word}${cell.arrow === 'up' ? `, ${words.up}` : cell.arrow === 'down' ? `, ${words.down}` : ''}`;
  return (
    <div role="img" aria-label={aria} className={`hub-dle-tile hub-dle-t-${cell.status}${value.length > 11 ? ' hub-dle-tile-long' : ''}${fresh ? ' hub-dle-flip' : ''}`} style={fresh ? { animationDelay: `${index * 110}ms, ${index * 110 + 400}ms` } : undefined}>
      {cell.status === 'correct' ? <span className="hub-dle-mark"><Ic d={D.check} size={14} width={3} /></span> : null}
      {cell.status === 'near' ? <span aria-hidden="true" className="hub-dle-mark hub-dle-approx">≈</span> : null}
      <span>{value || '?'}</span>
      {cell.arrow === 'up' ? <Ic d={D.up} size={18} width={2.6} /> : null}
      {cell.arrow === 'down' ? <Ic d={D.down} size={18} width={2.6} /> : null}
    </div>
  );
}

/** The hint a play has been served for a slot. A slot several keys can fill (024: the signature technique, else the Japanese voice actor) takes the one the server served; null while it has served none. */
export function servedHint(h: DleHintDef, hints: readonly { readonly key: string; readonly value: unknown }[], locale: DleLocale): { readonly key: string; readonly value: string } | null {
  const served = hints.find((x) => (h.or ?? [h.key]).includes(x.key));
  return served ? { key: served.key, value: hintValueLabel(served.value, locale) } : null;
}

/** The label of a hint slot follows the key actually served; before that, the label of a slot that several keys can fill is the one of its pending words. */
export function hintLabel(w: Pick<DleGameCopy, 'hints' | 'hintsPending'>, h: DleHintDef, servedKey: string | null): string {
  return servedKey ? w.hints[servedKey] ?? servedKey : w.hintsPending?.[h.key] ?? w.hints[h.key] ?? h.key;
}

/** "What next" under a result: the next game of the chain (Otakudle, One Piece, Dragon Ball), or at its end the way back to the Burrow, with "All done today" once every game of the world is finished on this device. */
export function DleAfter({ locale, game, quizHref, parentLabel, kpopName, allDone, clockText }: {
  readonly locale: DleLocale; readonly game: DleGameId; readonly quizHref: string | undefined; readonly parentLabel: string; readonly kpopName: string; readonly allDone: boolean; readonly clockText: string;
}): React.ReactElement {
  const t = dleCopy(locale);
  const w = gameCopy(game, locale);
  const g = dleGame(game);
  const nextMode = nextLiveMode(game);
  return (
    <div className="hub-dle-after">
      <span className="hub-dle-smalltitle">{t.whatNow}</span>
      {nextMode ? (
        <a href={withBasePath(localePath(liveGame(nextMode)!.path, locale))} className="hub-dle-nextgame">{nextMode.name[locale]}<Ic d={D.arrowRight} /></a>
      ) : (
        <>
          {/* The end of the chain (Otakudle, One Piece, then Dragon Ball): the day is done when every game of the world is finished on this device (Plan.dc.html, link 9). */}
          {g.series && allDone ? <p className="hub-dle-alldone"><strong>{t.allDone}</strong> {t.allDoneLine}</p> : null}
          <a href={withBasePath(burrowHref(locale))} className="hub-dle-nextgame">{t.backToBurrow}<Ic d={D.arrowRight} /></a>
        </>
      )}
      {quizHref ? (
        <div className="hub-dle-gateways">
          <a href={quizHref} className="hub-dle-gateway"><span>{t.onKpopQuiz.replace('KpopQuiz', kpopName)}</span><strong>{t.quizOf(parentLabel)}</strong></a>
        </div>
      ) : null}
      <span className="hub-dle-line">{w.nextIn} <span className="hub-dle-num">{clockText}</span></span>
    </div>
  );
}

/** One value of a column in the words of the game: the columns of a game of one series read through the table of value-i18n.ts (and the `l` of a stored value), the others keep their own rules. */
export function cellText(g: DleGameDef, e: DlePoolEntity, key: string, locale: DleLocale): string {
  const l = e.attrs[key]?.l;
  return valueLabel(key, e.attrs[key]?.v, locale, g.series ? { series: true, ...(l ? { label: l } : {}) } : undefined);
}

/** What is written under a character's name in a row or a suggestion: the first value of the sub column, in the words of the game. */
export function subText(g: DleGameDef, e: DlePoolEntity, subKey: string, locale: DleLocale): string {
  return g.series ? cellText(g, e, subKey, locale).split(', ')[0]! : firstValue(e.attrs[subKey]?.v);
}

interface GridWords { right: string; near: string; wrong: string; unknown: string; up: string; down: string }

/** The table of the guesses, newest first: a header per column of the pool (8 for a game of one series), a row per guess. */
export function DleGrid({ locale, game, pool, guesses, byId, wonId, fresh, words }: {
  readonly locale: DleLocale; readonly game: DleGameId; readonly pool: DlePool | null; readonly guesses: readonly DleGuess[];
  readonly byId: ReadonlyMap<string, DlePoolEntity>; readonly wonId: string | null; readonly fresh: string | null; readonly words: GridWords;
}): React.ReactElement {
  const g = dleGame(game);
  const w = gameCopy(game, locale);
  return (
    <div className="hub-dle-gridwrap">
      <table className={`hub-dle-grid${(pool?.attributes.length ?? 0) > 7 ? ' hub-dle-grid-wide' : ''}`}>
        <caption className="hub-dle-sr">{w.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col" className="hub-dle-th-name">{w.rowHead}</th>
            {(pool?.attributes ?? []).map((a) => <th key={a.key} scope="col" title={w.columns[a.key]?.help}>{w.columns[a.key]?.label ?? a.key}</th>)}
          </tr>
        </thead>
        <tbody>
          {[...guesses].reverse().map((row) => {
            const e = byId.get(row.id);
            const isTarget = wonId !== null && row.id === wonId;
            const isNew = fresh === row.id;
            const sub = e ? firstValue(e.attrs[w.subKey]?.v) : '';
            return (
              <tr key={row.id}>
                <th scope="row">
                  <span className={`hub-dle-rowhead${isTarget ? ' hub-dle-rowhead-win' : ''}${isNew ? ' hub-dle-rowin' : ''}`}>
                    {e ? <Avatar entity={e} tone={sub} size={44} radius={12} font={14} /> : null}
                    <span className="hub-dle-rowname"><strong>{e?.name ?? row.id}</strong><small>{e ? subText(g, e, w.subKey, locale) : ''}</small></span>
                  </span>
                </th>
                {row.result.map((c, i) => (
                  <td key={c.key}>
                    <Cell cell={c} value={e ? cellText(g, e, c.key, locale) : ''} label={w.columns[c.key]?.label ?? c.key} words={words} fresh={isNew} index={i} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DleGame({ locale, game, gameNo, stats: initialStats, pool, pictures, quizLinks, kpopName }: DleGameProps): React.ReactElement {
  const t = dleCopy(locale);
  const g = dleGame(game);
  const w = gameCopy(game, locale);
  const world = worldOf(game);
  const client = useDleClient();
  const left = useResetCountdown();

  const [date, setDate] = useState<string | null>(null);
  const [no, setNo] = useState<number | null>(gameNo);
  const [stats, setStats] = useState<DleStats | null>(initialStats);
  const [play, setPlay] = useState<DlePlayState | null>(null);
  const [off, setOff] = useState(pool === null || gameNo === null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fresh, setFresh] = useState<string | null>(null);
  const [justOver, setJustOver] = useState(false);
  const [revealed, setRevealed] = useState<readonly string[]>([]);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [streak, setStreak] = useState(0);
  // Every live game of this world finished today on this device: the end of the chain says "All done today" only then.
  const [allDone, setAllDone] = useState(false);
  const [progress, setProgress] = useState<DleProgress>(DEFAULT_PROGRESS);
  const inputRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => new Map((pool?.entities ?? []).map((e) => [e.id, e])), [pool]);
  const guesses = play?.guesses ?? [];
  const guessed = useMemo(() => new Set(guesses.map((x) => x.id)), [guesses]);
  const over = play ? play.status !== 'playing' : false;
  const won = play?.status === 'won';
  const errors = guesses.length - (won ? 1 : 0);
  const sugg = useMemo(() => (open && pool ? suggest(pool.entities.filter((e) => seenAt(e.attrs.seen_at?.v, progress)), query, guessed) : []), [open, pool, query, guessed, progress]);
  const counts = correctCounts(guesses);
  const lastCount = counts[counts.length - 1] ?? 0;
  const lastSize = guesses[guesses.length - 1]?.result.length ?? 0;
  const label = world.universe === 'kpop' ? t.kpopLabel : t.animeLabel;
  const worldGames = world.modes.flatMap((m) => (m.game ? [m.game] : []));
  const liveGames = world.modes.flatMap((m) => (liveGame(m) ? [m.game!] : []));
  const doneAll = (h: LocalHistory, day: string): boolean => liveGames.every((id) => !!h[id]?.[day]);

  /** A new state of the play: the clock of the server wins, a finished play is remembered on this device. */
  const applyPlay = (next: DlePlayState, live: boolean): void => {
    setPlay(next);
    setDate(next.date);
    setNo(next.game_no);
    if (next.stats) setStats(next.stats);
    if (next.status !== 'playing' && next.guesses.length > 0) {
      const history = recordPlay(deviceStore(), game, next.date, { won: next.status === 'won', guesses: next.guesses.length });
      setStreak(universeStreak(history, worldGames, utcDate(new Date())));
      setAllDone(doneAll(history, next.date));
      window.dispatchEvent(new Event('dle:history'));
      if (live) setJustOver(true);
    }
  };

  useEffect(() => {
    let alive = true;
    setCanShare(typeof navigator.share === 'function');
    if (w.progress) setProgress(readProgress(deviceStore()));
    const history = readHistory(deviceStore());
    setStreak(universeStreak(history, worldGames, utcDate(new Date())));
    setAllDone(doneAll(history, utcDate(new Date())));
    if (off) return () => { alive = false; };
    client.day(game).then((d) => {
      if (!alive) return;
      setDate(d.date);
      setNo(d.game_no);
      if (d.stats) setStats(d.stats);
      if (d.play) applyPlay(d.play, false);
    }).catch((e: unknown) => {
      if (!alive) return;
      if (e instanceof DleError && e.code === 'dle_unavailable') setOff(true);
      else setError(messageOf(e));
    });
    return () => { alive = false; };
    // One read of the day per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function messageOf(e: unknown): string {
    const code = e instanceof DleError ? e.code : 'dle_network';
    if (code === 'dle_rate_limited') return t.errorRate;
    if (code === 'dle_unknown_entity') return t.errorUnknown;
    if (code === 'dle_bad_date') return t.errorNewDay;
    if (code === 'dle_too_many_guesses') return t.errorTooMany;
    return t.errorNetwork;
  }

  const send = async (e: DlePoolEntity): Promise<void> => {
    if (busy || over || !date || guessed.has(e.id)) return;
    setBusy(true);
    setError('');
    try {
      const next = await client.guess(game, date, e.id);
      setFresh(e.id);
      applyPlay(next, true);
      setQuery('');
      setOpen(false);
      setActive(0);
      inputRef.current?.focus();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const giveUp = async (): Promise<void> => {
    if (busy || over || !date) return;
    setBusy(true);
    setError('');
    try {
      applyPlay(await client.giveUp(game, date), true);
      setOpen(false);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const pick = sugg[active] ?? sugg[0];
      if (pick) void send(pick);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else if (e.key === 'ArrowDown' && sugg.length) {
      e.preventDefault();
      setActive((a) => (a + 1) % sugg.length);
    } else if (e.key === 'ArrowUp' && sugg.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + sugg.length) % sugg.length);
    }
  };

  // ---- the words that depend on the play
  const nameOf = (id: string): string => byId.get(id)?.name ?? '';
  const last = guesses[guesses.length - 1];
  const announce = won && play?.target
    ? t.announceWon(play.target.name, guesses.length)
    : last ? `${t.announceGuess(guesses.length, nameOf(last.id))} ${last.result.map((c) => `${w.columns[c.key]?.label ?? c.key}: ${c.status === 'correct' ? t.right : c.status === 'near' ? t.near : c.status === 'wrong' ? t.wrong : t.unknownCell}`).join(', ')}.` : '';
  const hintServed = (h: DleHintDef): { readonly key: string; readonly value: string } | null => servedHint(h, play?.hints ?? [], locale);
  const words = { right: t.right, near: t.near, wrong: t.wrong, unknown: t.unknownCell, up: t.answerUp, down: t.answerDown };
  const shareUrl = (): string => {
    const base = `${window.location.origin}${withBasePath(localePath(g.path, locale))}`;
    return counts.length ? `${base}?r=${shareParam(counts)}` : base;
  };
  const shareBody = (): string => shareText(g, no ?? 0, guesses, won, shareUrl(), locale);
  const previewUrl = `bunnyverse.org${localePath(g.path, locale)}`;
  const preview = play && over ? shareText(g, no ?? 0, guesses, won, previewUrl, locale) : '';

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareBody());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* no clipboard: the text is on the screen */ }
  };

  const fans = stats ? formatCount(stats.wins, locale) : null;
  const target: DlePublicEntity | null = over ? play?.target ?? null : null;
  // What stands next to the name: the series of a game of one series, else the group (the first value of the sub column).
  const targetGroup = target ? (g.series ? g.series.name : firstValue(target.attrs[w.subKey]?.v)) : '';
  const targetTone = target ? firstValue(target.attrs[w.subKey]?.v) || targetGroup : '';
  const targetParent = target ? parentName(g, w.subKey, target.attrs) : '';
  // The words shown for it ("L’Attaque des Titans" in French); the quiz is still looked up by the name as stored.
  const targetShown = g.series ? targetParent : valueLabel(w.subKey, targetParent, locale);
  const quizHref = targetParent ? quizLinks[targetParent] : undefined;
  const picture = target ? pictures[target.id] : undefined;

  return (
    <>
      <section aria-labelledby="dle-h1" className="hub-dle-title">
        <ol aria-label={t.breadcrumb} className="hub-dle-crumbs">
          <li><a href={withBasePath(burrowHref(locale))}>{t.navBurrow}</a></li>
          <li aria-hidden="true">/</li>
          {g.series ? (
            <>
              <li><a href={withBasePath(localePath(dleGame('otakudle').path, locale))}>{g.brand}</a></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{g.guess[locale]}</li>
            </>
          ) : <li aria-current="page">{g.brand} · {g.guess[locale]}</li>}
        </ol>
        {no !== null ? <p className="hub-dle-kicker hub-dle-num">{t.gameNo(w.noLabel ?? `${g.brand} ${world.modes.find((m) => m.game === game)!.step[locale]}`, no)}</p> : null}
        <h1 id="dle-h1">{w.h1}</h1>
        <p className="hub-dle-line">
          {fans ? <><span className="hub-dle-num">{t.fansLine(fans)}</span> · </> : null}
          {w.nextIn} <span className="hub-dle-num">{clock(left)}</span>
        </p>
      </section>

      <div className="hub-dle-z2 hub-dle-center">
        <nav aria-label={w.stepsLabel}>
          <ol className="hub-dle-steps">
            {world.modes.map((m, i) => {
              const live = liveGame(m);
              const isHere = m.game === game;
              const state = isHere ? (over && won ? 'done' : 'current') : live ? 'next' : 'soon';
              const line = isHere ? (over ? (won ? w.stepDone : t.gaveUp) : t.stepNow) : live ? '' : t.soon;
              const inner = (
                <>
                  <span className={`hub-dle-stepic hub-dle-stepic-${state}`}>
                    <Ic d={libraryIcon(m.icon)} size={24} width={1.9} />
                    {state === 'done' ? <span aria-hidden="true" className="hub-dle-stepchk"><Ic d={D.check} size={10} width={4} /></span> : null}
                  </span>
                  <span className={`hub-dle-steplabel hub-dle-steplabel-${state}`}>{m.step[locale]}</span>
                  <span className={`hub-dle-stepstate hub-dle-stepstate-${state}`}>{line || ' '}</span>
                </>
              );
              return (
                <li key={m.id}>
                  {i > 0 ? <span aria-hidden="true" className="hub-dle-stepline" /> : null}
                  {live
                    ? <a href={withBasePath(localePath(live.path, locale))} aria-current={isHere ? 'step' : undefined} className="hub-dle-step">{inner}</a>
                    : <span aria-disabled="true" className="hub-dle-step">{inner}</span>}
                </li>
              );
            })}
          </ol>
        </nav>
        {w.progress ? (
          <fieldset className="hub-dle-progress">
            <legend className="hub-dle-sr">{w.progress.legend}</legend>
            <span aria-hidden="true" className="hub-dle-progress-q">{w.progress.question}</span>
            <span className="hub-dle-segs">
              {w.progress.options.map((o) => (
                <label key={o.id} title={o.help} className={`hub-dle-seg${progress === o.id ? ' hub-dle-seg-on' : ''}`}>
                  <input type="radio" name="dle-progress" className="hub-dle-sr" checked={progress === o.id} onChange={() => { setProgress(o.id); writeProgress(deviceStore(), o.id); setActive(0); }} />{o.label}
                </label>
              ))}
            </span>
          </fieldset>
        ) : null}
      </div>

      {g.hints.length ? (
        <section aria-labelledby="dle-hints" className="hub-dle-z2 hub-dle-hints">
          <h2 id="dle-hints"><Ic d={D.bulb} /> {t.hintsTitle}<span>{t.hintsAfter(g.hints.map((h, i) => (i === g.hints.length - 1 ? (locale === 'fr' ? `et ${h.after}` : `and ${h.after}`) : `${h.after}${i === g.hints.length - 2 ? '' : ','}`)).join(' '))}</span></h2>
          <div className={`hub-dle-hintgrid${g.hints.length === 2 ? ' hub-dle-hintgrid-2' : ''}`}>
            {g.hints.map((h) => {
              // The server opens a hint by the errors counted, also on a finished play: a hint it did not open stays closed, its value is not on this page.
              const unlocked = errors >= h.after;
              const served = hintServed(h);
              const value = served?.value ?? null;
              const shown = unlocked && (over || revealed.includes(h.key));
              const ready = unlocked && !shown;
              const miss = h.after - errors;
              return (
                <div key={h.key} className={`hub-dle-hint${ready ? ' hub-dle-hint-ready hub-dle-pulse' : shown ? ' hub-dle-hint-shown' : ''}`}>
                  <span className="hub-dle-hint-label">{hintLabel(w, h, served?.key ?? null)}</span>
                  {!unlocked && over ? <span className="hub-dle-hint-lock"><Ic d={D.lock} size={13} width={2.4} />{t.hintClosed}</span> : null}
                  {!unlocked && !over ? (
                    <>
                      <span className="hub-dle-hint-lock"><Ic d={D.lock} size={13} width={2.4} />{t.hintIn(miss)}</span>
                      <span aria-hidden="true" className="hub-dle-hint-track"><span className="hub-dle-fill" style={{ width: `${Math.min(100, Math.round((Math.max(0, errors) / h.after) * 100))}%` }} /></span>
                    </>
                  ) : null}
                  {ready ? <button type="button" className="hub-dle-hint-btn" onClick={() => setRevealed((r) => [...r, h.key])}>{t.seeHint}</button> : null}
                  {shown ? <span className="hub-dle-hint-value hub-dle-toast">{value ?? t.hintNone}</span> : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section aria-label={w.proposeLabel} className="hub-dle-box">
        {off ? <p role="status" className="hub-dle-off">{t.unavailable}</p> : (
          <>
            <div className="hub-dle-inputwrap" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
              <label htmlFor="dle-guess" className="hub-dle-sr">{t.guessLabel}</label>
              <div className="hub-dle-inputrow">
                <input
                  ref={inputRef} id="dle-guess" type="text" autoComplete="off" spellCheck={false} value={query} disabled={over} placeholder={w.placeholder}
                  role="combobox" aria-autocomplete="list" aria-controls="dle-sugg" aria-expanded={sugg.length > 0}
                  aria-activedescendant={sugg[active] ? `dle-opt-${sugg[active]!.id}` : undefined}
                  onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); setFresh(null); }}
                  onFocus={() => setOpen(true)} onKeyDown={onKey}
                />
                <button type="button" className="hub-dle-go" disabled={over || busy} onClick={() => { const p = sugg[active] ?? sugg[0]; if (p) void send(p); }}>{t.validate}</button>
              </div>
              {sugg.length > 0 && !over ? (
                <ul id="dle-sugg" role="listbox" aria-label={t.suggestions} className="hub-dle-sugg hub-dle-drop">
                  {sugg.map((e, i) => {
                    const sub = firstValue(e.attrs[w.subKey]?.v);
                    const second = g.series ? cellText(g, e, w.suggestSecond, locale).split(', ')[0]! : firstValue(e.attrs[w.suggestSecond]?.v);
                    const native = w.nativeLang ? e.search.find((x) => /[^\u0000-ɏ]/.test(x)) : undefined;
                    return (
                      <li key={e.id} id={`dle-opt-${e.id}`} role="option" aria-selected={i === active}>
                        <button type="button" tabIndex={-1} className={i === active ? 'hub-dle-opt-active' : ''} onClick={() => void send(e)}>
                          <Avatar entity={e} tone={sub} size={40} radius={10} font={13} />
                          <span className="hub-dle-sugg-text">
                            <span className="hub-dle-sugg-name">{e.name}{native ? <span lang={w.nativeLang ?? undefined}> {native}</span> : null}</span>
                            <span className="hub-dle-sugg-sub">{[g.series ? subText(g, e, w.subKey, locale) : sub, second].filter(Boolean).join(' · ')}</span>
                          </span>
                          {i === 0 ? <span aria-hidden="true" className="hub-dle-sugg-enter">{t.enterKey}</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
            <div className="hub-dle-boxnote">
              <span>{t.enterHelp}</span>
              {!over && guesses.length > 0 ? <button type="button" className="hub-dle-giveup" disabled={busy} onClick={() => void giveUp()}>{t.giveUp}</button> : null}
            </div>
            {error ? <p role="alert" className="hub-dle-error">{error}</p> : null}
            {!over && lastCount >= 4 ? (
              <div role="status" className="hub-dle-close hub-dle-toast">
                <span aria-hidden="true" className="hub-dle-close-ic"><Spark /></span>{lastCount >= 6 ? t.close6(lastCount, lastSize) : t.close4(lastCount, lastSize)}
              </div>
            ) : null}
          </>
        )}
      </section>

      <p aria-live="polite" className="hub-dle-sr">{announce}</p>

      {over && target ? (
        <section aria-labelledby="dle-win" className="hub-dle-result hub-dle-reveal">
          {won && justOver ? <Confetti tone={world.tone} /> : null}
          <figure className="hub-dle-photo">
            {picture ? (
              // A plain img: the file made at upload (no Vercel image optimisation); only a verified licence reaches this page.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picture.url} alt={target.name} style={{ objectPosition: picture.position }} />
            ) : (
              <div aria-hidden="true" className="hub-dle-photo-ini"><Avatar entity={target} tone={targetTone} fill /></div>
            )}
            <span aria-hidden="true" className="hub-dle-shine" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {won ? <img src={withBasePath('/mascot/mascot-celebrate.png')} alt="" width={76} height={76} className="hub-dle-bounce hub-dle-photo-mascot" /> : null}
            <figcaption>
              {picture ? (
                <>
                  {t.photoBy(picture.author, picture.license)} · <a href={picture.sourceUrl} rel="noopener noreferrer nofollow" target="_blank">{t.source}</a>
                </>
              ) : w.noPhoto ?? t.noPhoto}
            </figcaption>
          </figure>
          <div className="hub-dle-resultbody">
            <div className="hub-dle-resulthead">
              <p className="hub-dle-eyebrow">{won ? w.found ?? t.found : t.answerWas}</p>
              <h2 id="dle-win">{target.name}{targetGroup ? <span> {g.series ? targetGroup : valueLabel(w.subKey, targetGroup, locale)}</span> : null}</h2>
              <p>{won ? t.wonLine(guesses.length, stats ? formatCount(stats.wins, locale) : null) : t.gaveUpLine(guesses.length, label)}</p>
            </div>
            {streak > 0 ? (
              <div className="hub-dle-floatup hub-dle-chips">
                <span className="hub-dle-chip"><Flame size={16} className="hub-dle-flame" />{t.streakChip(label, streak)}</span>
              </div>
            ) : null}
            <div className="hub-dle-sparkwrap">
              <span className="hub-dle-smalltitle">{t.bars}</span>
              <div aria-hidden="true" className="hub-dle-spark">
                {counts.map((k, i) => <span key={i} className={`hub-dle-grow${lastSize && k === lastSize ? ' hub-dle-spark-full' : ''}`} style={{ height: Math.max(6, Math.round((k / Math.max(1, lastSize)) * 56)), animationDelay: `${300 + i * 90}ms` }} />)}
              </div>
            </div>
            <div className="hub-dle-sharebox">
              <span className="hub-dle-smalltitle">{t.shareTitle}</span>
              <pre className="hub-dle-num">{preview}</pre>
              <div className="hub-dle-sharebtns">
                <button type="button" className="hub-dle-btn hub-dle-btn-accent" onClick={() => void copy()}><Ic d={copied ? D.check : D.copy} />{copied ? t.copied : t.copy}</button>
                {canShare ? <button type="button" className="hub-dle-btn hub-dle-btn-line" onClick={() => { void navigator.share({ text: shareBody() }).catch(() => {}); }}><Ic d={D.share} />{t.share}</button> : null}
              </div>
            </div>
            <DleAfter locale={locale} game={game} quizHref={quizHref} parentLabel={targetShown} kpopName={kpopName} allDone={allDone} clockText={clock(left)} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="dle-grid" className="hub-dle-gridsec">
        <div className="hub-dle-gridhead">
          <h2 id="dle-grid">{t.tries}{guesses.length ? <span className="hub-dle-num"> ({guesses.length})</span> : null}</h2>
          <div aria-label={t.legend} className="hub-dle-legend">
            <span><i aria-hidden="true" className="hub-dle-sw hub-dle-sw-correct" />{t.right}</span>
            <span><i aria-hidden="true" className="hub-dle-sw hub-dle-sw-near" />{t.near}</span>
            <span><i aria-hidden="true" className="hub-dle-sw hub-dle-sw-wrong" />{t.wrong}</span>
            <span><Ic d={D.up} size={14} width={2.6} />{w.arrowHelp ?? t.arrowHelp}</span>
          </div>
        </div>
        {guesses.length ? (
          <DleGrid
            locale={locale} game={game} pool={pool} guesses={guesses} byId={byId} wonId={play?.status === 'won' ? play.target?.id ?? null : null} fresh={fresh}
            words={words}
          />
        ) : (
          <div className="hub-dle-empty">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={withBasePath('/mascot/mascot-think.png')} alt="" width={48} height={48} />
            <span>{w.empty}</span>
          </div>
        )}
      </section>
    </>
  );
}
