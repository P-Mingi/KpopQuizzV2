'use client';

// Run O1, lot H2a: "Surprise me": a random quiz from the pool of both sites, never twice the same site in a row (the Plan, section 3 D).
// Lot H2c: the pool is the 100 best quizzes of each site (lib/site/hub/data/surprise.ts) and the draw is pickSurprise of that module: a
// quiz the signed-in fan already played stays out, and the pick links to the canonical page of its own site. With no pool the button is left out.
// Home v3 (2026-10-29, Home.dc.html): the button sits beside "Pick your side, or play both." and the pick shows as one row under them
// (the initials tile, "Random pick on <site>", the title, Play, Another).
// OtakuQuiz home (owner, 2026-10-29 and 2026-10-30, TWINS row 1, code A8): the same block under the hero buttons, drawing from the anime
// quizzes only. The anime build never loads styles/sites/hub/, and its sheets may style only anime-<lane>-* classes (tokens.md 3.3 rule 6),
// so `prefix` names the classes: hub-h2 by default (the hub's markup, byte for byte), anime-h2 there (styles/sites/anime/h2.css). Same
// markup, one prefix, as POLICY_CLASS does for the privacy blocks (lib/site/hub/network-page.ts).
import { useState } from 'react';

import { pickSurprise } from '@/lib/site/hub/data/surprise-pick';

import { ShuffleIcon } from './home-icons';
import { siteClass } from './site-class';

export interface SurprisePick {
  readonly id: string;
  readonly tile: string;
  readonly title: string;
  readonly href: string;
  readonly site: 'kpop' | 'anime';
  /** "Random pick on KpopQuiz". */
  readonly pickLabel: string;
}

interface HomeSurpriseProps {
  readonly pool: readonly SurprisePick[];
  /** Quiz ids the signed-in fan played. */
  readonly playedIds: readonly string[];
  /** "Pick your side, or play both.": the line the button sits beside. */
  readonly lede: string;
  readonly labels: { readonly button: string; readonly play: string; readonly another: string };
  /** The prefix of every class: hub-h2 (the default, the hub home) or anime-h2 (the OtakuQuiz home). */
  readonly prefix?: 'hub-h2' | 'anime-h2';
}

export function HomeSurprise({ pool, playedIds, lede, labels, prefix = 'hub-h2' }: HomeSurpriseProps): React.ReactElement {
  const [shown, setShown] = useState<SurprisePick | null>(null);
  const surprise = (): void => setShown((cur) => pickSurprise(pool, { playedIds, lastSite: cur?.site ?? null }));
  // The classes as the hub writes them; with another prefix, the same names under it.
  const cx = (classes: string): string => (prefix === 'hub-h2' ? classes : classes.replace(/\bhub-h2-/g, `${prefix}-`));
  return (
    <>
      <div className={cx('hub-h2-lede-row')}>
        <p className={cx('hub-h2-lede')}>{lede}</p>
        {pool.length > 0 ? (
          <button type="button" onClick={surprise} className={cx('hub-h2-ghost hub-h2-btn')}>
            <ShuffleIcon />{labels.button}
          </button>
        ) : null}
      </div>
      {shown ? (
        <div role="status" className={cx(`hub-h2-pick hub-h2-rise ${siteClass(shown.site)}`)}>
          <span aria-hidden="true" className={cx('hub-h2-th hub-h2-pick-tile')}>{shown.tile}</span>
          <span className={cx('hub-h2-pick-body')}>
            <span className={cx('hub-h2-pick-k')}>{shown.pickLabel}</span>
            <span className={cx('hub-h2-pick-t hub-h2-clamp')}>{shown.title}</span>
          </span>
          <a href={shown.href} className={cx('hub-h2-pick-play hub-h2-btn')}>{labels.play}</a>
          <button type="button" onClick={surprise} className={cx('hub-h2-pick-again')}>{labels.another}</button>
        </div>
      ) : null}
    </>
  );
}
