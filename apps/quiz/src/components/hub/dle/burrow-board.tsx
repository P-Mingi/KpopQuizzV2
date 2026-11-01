'use client';

// Daily games step 4: the two columns of the Terrier (board Main.dc.html, v2 section 2): on the left the two games with their large image, on the right "Your day" in rows, yesterday's answers and the closed "What is the Burrow?". Drawn on the
// server with nothing played; the browser then asks dle_day (with this device's token) for each built game. Numbers only from there and from this device. A mode with no page says "soon" and is no link.
import { useEffect, useState } from 'react';

import { dleCopy, formatCount, gameCopy } from '@/lib/dle/copy';
import { utcDate } from '@/lib/dle/day';
import { builtGames, dleGame, localePath } from '@/lib/dle/games';
import { readHistory, recordPlay, universeStreak } from '@/lib/dle/local';
import { DLE_WORLDS, liveGame, liveModes, worldHref } from '@/lib/dle/worlds';
import { withBasePath } from '@/lib/site/base-path';

import { Avatar, firstValue } from './dle-avatar';
import { clock, deviceStore, useDleClient, useResetCountdown } from './dle-hooks';
import { D, Flame, Ic, libraryIcon } from './dle-icons';

import type { DleImages } from '@/lib/dle/read';
import type { DleGameId } from '@/lib/dle/games';
import type { DleLocale, DlePublicEntity, DleStats } from '@/lib/dle/types';
import type { DleMode, DleWorld } from '@/lib/dle/worlds';

/** What the server read of each built game, without any play. */
export interface BurrowGameFacts {
  readonly gameNo: number;
  readonly stats: DleStats | null;
  readonly yesterday: { readonly gameNo: number; readonly answer: DlePublicEntity } | null;
}

type ModeState = { readonly kind: 'done'; readonly won: boolean; readonly guesses: number } | { readonly kind: 'prog'; readonly guesses: number } | { readonly kind: 'todo' } | { readonly kind: 'soon' };

interface BurrowBoardProps {
  readonly locale: DleLocale;
  readonly dateLabel: string;
  readonly facts: Readonly<Partial<Record<DleGameId, BurrowGameFacts>>>;
  readonly images: DleImages;
  /** Group name to the address of its quiz on KpopQuiz: the link of an answer. */
  readonly quizLinks: Readonly<Record<string, string>>;
}

function stateOf(mode: DleMode, plays: Readonly<Record<string, ModeState>>): ModeState {
  const g = liveGame(mode);
  if (!g) return { kind: 'soon' };
  return plays[g.id] ?? { kind: 'todo' };
}

export function BurrowBoard({ locale, dateLabel, facts, images, quizLinks }: BurrowBoardProps): React.ReactElement {
  const t = dleCopy(locale);
  const client = useDleClient();
  const left = useResetCountdown();
  const [plays, setPlays] = useState<Readonly<Record<string, ModeState>>>({});
  const [streaks, setStreaks] = useState<Readonly<Record<string, number>>>({});
  const [shown, setShown] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let alive = true;
    const readStreaks = (): void => {
      const h = readHistory(deviceStore());
      const today = utcDate(new Date());
      setStreaks(Object.fromEntries(DLE_WORLDS.map((w) => [w.id, universeStreak(h, w.modes.flatMap((m) => (m.game ? [m.game] : [])), today)])));
    };
    readStreaks();
    for (const g of builtGames()) {
      client.day(g.id).then((d) => {
        if (!alive) return;
        const p = d.play;
        if (!p || p.guesses.length === 0) return;
        if (p.status === 'playing') {
          setPlays((x) => ({ ...x, [g.id]: { kind: 'prog', guesses: p.guesses.length } }));
          return;
        }
        recordPlay(deviceStore(), g.id, p.date, { won: p.status === 'won', guesses: p.guesses.length });
        window.dispatchEvent(new Event('dle:history'));
        readStreaks();
        setPlays((x) => ({ ...x, [g.id]: { kind: 'done', won: p.status === 'won', guesses: p.guesses.length } }));
      }).catch(() => { /* the page stays as drawn: every game to play */ });
    }
    return () => { alive = false; };
    // One read per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const live = DLE_WORLDS.flatMap((w) => liveModes(w));
  const total = live.length;
  const doneN = live.filter((m) => stateOf(m, plays).kind === 'done').length;
  const mascot = total > 0 && doneN === total ? 'celebrate' : doneN > 0 ? 'default' : 'sleep';

  const statusOf = (m: DleMode): string => {
    const s = stateOf(m, plays);
    if (s.kind === 'done') return s.won ? `✓ ${t.foundIn(s.guesses)}` : t.gaveUp;
    if (s.kind === 'prog') return t.inProgress(s.guesses);
    return s.kind === 'soon' ? t.soon : t.toPlay;
  };

  const worldBlock = (w: DleWorld, i: number): React.ReactElement => {
    const modes = liveModes(w);
    const first = modes[0] ? liveGame(modes[0]) : null;
    const href = worldHref(w, locale);
    const cover = images[w.coverSlot];
    const done = modes.filter((m) => stateOf(m, plays).kind === 'done').length;
    const next = modes.find((m) => stateOf(m, plays).kind !== 'done');
    const started = done > 0 || modes.some((m) => stateOf(m, plays).kind === 'prog');
    const fact = first ? facts[first.id] : undefined;
    const fans = fact?.stats ? formatCount(fact.stats.wins, locale) : null;
    const coverInner = cover ? (
      // A plain img: the file made at upload (no Vercel image optimisation); decorative, the title is beside it.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={cover.src} alt="" width={320} height={300} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" style={{ objectPosition: cover.position }} />
    ) : <span lang={w.vertical.lang} className="hub-dle-vt">{w.vertical.text}</span>;
    return (
      <article key={w.id} aria-labelledby={`dle-w-${w.id}`} className={`hub-dle-block hub-dle-${w.tone} hub-dle-rise`} style={{ animationDelay: `${i * 90}ms` }}>
        {href
          ? <a href={withBasePath(href)} tabIndex={-1} aria-hidden="true" className="hub-dle-cover">{coverInner}</a>
          : <span aria-hidden="true" className="hub-dle-cover">{coverInner}</span>}
        <div className="hub-dle-blockbody">
          <div className="hub-dle-blocktop">
            <h2 id={`dle-w-${w.id}`}>{w.wordmarkHead}<span className="hub-dle-tone">dle</span></h2>
            {fact && modes[0] ? <span className="hub-dle-num hub-dle-gameno">{t.gameNo(modes[0].step[locale], fact.gameNo)}</span> : null}
          </div>
          <div className="hub-dle-what">
            <p><strong>{w.what[locale]}</strong></p>
            {fans ? <p className="hub-dle-muted">{t.fansFound(fans)}</p> : null}
          </div>
          <div className="hub-dle-modes">
            <span className="hub-dle-dots">
              {w.modes.map((m) => {
                const s = stateOf(m, plays);
                const img = images[m.slot];
                return (
                  <span key={m.id} title={m.name[locale]} className={`hub-dle-mdot hub-dle-mdot-${s.kind}`}>
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.small} alt="" width={36} height={36} loading="lazy" decoding="async" />
                    ) : <Ic d={libraryIcon(m.icon)} size={17} width={1.9} />}
                    {s.kind === 'done' ? <span aria-hidden="true" className="hub-dle-chk"><Ic d={D.check} size={8} width={4} /></span> : null}
                  </span>
                );
              })}
            </span>
            <span className="hub-dle-modetext">
              {modes.length
                ? t.modesDone(done, modes.length, next ? next.name[locale] : t.allFound)
                : t.soon}
            </span>
          </div>
          <div className="hub-dle-blockcta">
            {href ? (
              <a href={withBasePath(next && liveGame(next) ? localePath(liveGame(next)!.path, locale) : href)} className={`hub-dle-cta${next ? '' : ' hub-dle-cta-done'}`}>
                {!next ? t.seeResults : started ? t.continueTo(next.name[locale]) : t.play}<Ic d={D.arrowRight} width={2.2} />
              </a>
            ) : <span className="hub-dle-cta hub-dle-cta-soon" aria-disabled="true">{t.soon}</span>}
            <span className="hub-dle-muted hub-dle-small">{w.sub[locale]}</span>
          </div>
        </div>
      </article>
    );
  };

  return (
    <main id="main" tabIndex={-1} className="hub-dle-burrow">
      <section aria-labelledby="dle-h1" className="hub-dle-hero">
        <div className="hub-dle-heroleft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBasePath(`/mascot/mascot-${mascot}.png`)} alt="" width={72} height={72} />
          <div>
            <p className="hub-dle-date">{dateLabel}</p>
            <h1 id="dle-h1">{t.burrowH1}</h1>
            <p className="hub-dle-lead">{t.burrowLead}</p>
          </div>
        </div>
        <p className="hub-dle-next"><Ic d={D.clock} size={17} />{t.nextPuzzles} <span className="hub-dle-num">{clock(left)}</span></p>
      </section>

      <div className="hub-dle-cols">
        <section aria-label={t.gamesLabel} className="hub-dle-games">
          {DLE_WORLDS.map(worldBlock)}
        </section>

        <aside aria-label={t.day} className="hub-dle-side">
          <section aria-labelledby="dle-day">
            <div className="hub-dle-dayhead">
              <h2 id="dle-day">{t.day}</h2>
              <span className="hub-dle-num hub-dle-muted">{t.of(doneN, total)}</span>
            </div>
            <span aria-hidden="true" className="hub-dle-bar"><span style={{ width: `${Math.max(3, Math.round((doneN / Math.max(1, total)) * 100))}%` }} /></span>
            {DLE_WORLDS.some((w) => (streaks[w.id] ?? 0) > 0) ? (
              <p className="hub-dle-streaks">
                {DLE_WORLDS.filter((w) => (streaks[w.id] ?? 0) > 0).map((w) => (
                  <span key={w.id} className={`hub-dle-${w.tone}`}><span className="hub-dle-tone"><Flame size={14} /></span>{t.burrowStreak(w.universe === 'kpop' ? t.kpopLabel : t.animeLabel, streaks[w.id]!)}</span>
                ))}
              </p>
            ) : null}
            {DLE_WORLDS.map((w) => (
              <div key={w.id} className={`hub-dle-daygroup hub-dle-${w.tone}`}>
                <p className="hub-dle-grouplabel">{w.brand}</p>
                <ul className="hub-dle-lines">
                  {w.modes.map((m) => {
                    const g = liveGame(m);
                    const s = stateOf(m, plays);
                    const img = images[m.slot];
                    const inner = (
                      <>
                        <span className={`hub-dle-th${img ? ' hub-dle-th-img' : ''}`}>
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img.small} alt="" width={34} height={34} loading="lazy" decoding="async" />
                          ) : <Ic d={libraryIcon(m.icon)} size={17} width={1.9} />}
                        </span>
                        <span className="hub-dle-linename">{m.name[locale]}</span>
                        <span className={`hub-dle-linestate hub-dle-linestate-${s.kind}`}>{statusOf(m)}</span>
                      </>
                    );
                    return <li key={m.id}>{g ? <a href={withBasePath(localePath(g.path, locale))} className="hub-dle-row">{inner}</a> : <span className="hub-dle-row hub-dle-row-soon">{inner}</span>}</li>;
                  })}
                </ul>
              </div>
            ))}
          </section>

          {DLE_WORLDS.some((w) => liveModes(w).some((m) => facts[m.game!]?.yesterday)) ? (
            <section aria-labelledby="dle-y">
              <h2 id="dle-y" className="hub-dle-yh">{t.yesterday}</h2>
              <ul className="hub-dle-lines">
                {DLE_WORLDS.flatMap((w) => liveModes(w).map((m) => {
                  const g = dleGame(m.game!);
                  const y = facts[g.id]?.yesterday;
                  if (!y) return null;
                  const sub = gameCopy(g.id, locale).subKey;
                  const value = y.answer.attrs[sub];
                  const group = value?.p?.[0] ?? firstValue(value?.v);
                  const hidden = w.spoiler && !shown.has(g.id);
                  const quiz = quizLinks[group];
                  return (
                    <li key={g.id}>
                      <div className={`hub-dle-row hub-dle-${w.tone}`}>
                        {hidden ? <span aria-hidden="true" className="hub-dle-thumb hub-dle-thumb-q">?</span> : <Avatar entity={y.answer} tone={group} size={40} radius={20} font={13} />}
                        <span className="hub-dle-yname">
                          <span>{hidden ? t.hiddenAnswer : y.answer.name}{!hidden && group ? <small> {group}</small> : null}</span>
                          <small>{t.gameNo(`${g.brand} ${m.step[locale]}`, y.gameNo)}</small>
                        </span>
                        {hidden ? <button type="button" className="hub-dle-showbtn" onClick={() => setShown((x) => new Set(x).add(g.id))}>{t.show}</button> : null}
                        {!hidden && quiz ? <a href={quiz} className="hub-dle-ylink">{t.quizOf(group)}</a> : null}
                      </div>
                    </li>
                  );
                }))}
              </ul>
            </section>
          ) : null}

          <details className="hub-dle-about">
            <summary>
              <h2>{t.aboutTitle}</h2>
              <Ic d={D.chev} className="hub-dle-chev" />
            </summary>
            <div>
              <p>{t.about1}</p>
              <p>{t.about2}</p>
            </div>
          </details>
        </aside>
      </div>
    </main>
  );
}
