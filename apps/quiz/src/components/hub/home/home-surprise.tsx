'use client';

// Run O1, lot H2a: "Surprise me": a random quiz from the pool of both sites, never twice the same site in a row (the Plan, section 3 D).
// Lot H2c: the pool is the 100 best quizzes of each site (lib/site/hub/data/surprise.ts) and the draw is pickSurprise of that module: a
// quiz the signed-in fan already played stays out, and the pick links to the canonical page of its own site. With no pool the button is left out.
// Home v3 (2026-10-29, Home.dc.html): the button sits beside "Pick your side, or play both." and the pick shows as one row under them
// (the initials tile, "Random pick on <site>", the title, Play, Another).
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
}

export function HomeSurprise({ pool, playedIds, lede, labels }: HomeSurpriseProps): React.ReactElement {
  const [shown, setShown] = useState<SurprisePick | null>(null);
  const surprise = (): void => setShown((cur) => pickSurprise(pool, { playedIds, lastSite: cur?.site ?? null }));
  return (
    <>
      <div className="hub-h2-lede-row">
        <p className="hub-h2-lede">{lede}</p>
        {pool.length > 0 ? (
          <button type="button" onClick={surprise} className="hub-h2-ghost hub-h2-btn">
            <ShuffleIcon />{labels.button}
          </button>
        ) : null}
      </div>
      {shown ? (
        <div role="status" className={`hub-h2-pick hub-h2-rise ${siteClass(shown.site)}`}>
          <span aria-hidden="true" className="hub-h2-th hub-h2-pick-tile">{shown.tile}</span>
          <span className="hub-h2-pick-body">
            <span className="hub-h2-pick-k">{shown.pickLabel}</span>
            <span className="hub-h2-pick-t hub-h2-clamp">{shown.title}</span>
          </span>
          <a href={shown.href} className="hub-h2-pick-play hub-h2-btn">{labels.play}</a>
          <button type="button" onClick={surprise} className="hub-h2-pick-again">{labels.another}</button>
        </div>
      ) : null}
    </>
  );
}
