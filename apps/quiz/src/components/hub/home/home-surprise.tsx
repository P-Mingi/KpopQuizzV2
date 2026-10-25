'use client';

// Run O1, lot H2a: "Surprise me": a random quiz from the pool of both sites, never twice the same one in a row (the design's script).
// The pool comes from the Hot now loader; the pick links to the canonical page of its own site.
import { useState } from 'react';

import { ShuffleIcon } from './home-icons';
import { siteClass } from './site-class';

export interface SurprisePick {
  readonly tile: string;
  readonly title: string;
  readonly href: string;
  readonly site: 'kpop' | 'anime';
  /** "Your random pick on KpopQuiz". */
  readonly pickLabel: string;
}

interface HomeSurpriseProps {
  readonly pool: readonly SurprisePick[];
  readonly labels: { readonly button: string; readonly note: string; readonly play: string; readonly another: string };
}

/** The next index of the pool: random, and never the one shown. */
export function nextPick(current: number | null, size: number, random: () => number = Math.random): number {
  const next = Math.floor(random() * size);
  return next === current ? (next + 1) % size : next;
}

export function HomeSurprise({ pool, labels }: HomeSurpriseProps): React.ReactElement {
  const [pick, setPick] = useState<number | null>(null);
  const surprise = (): void => setPick((cur) => (pool.length === 0 ? null : nextPick(cur, pool.length)));
  const shown = pick === null ? null : pool[pick];
  return (
    <>
      <div className="hub-h2-surprise">
        <button type="button" onClick={surprise} className="hub-h2-ghost hub-h2-btn">
          <ShuffleIcon />{labels.button}
        </button>
        <span className="hub-h2-note">{labels.note}</span>
      </div>
      {shown ? (
        <div role="status" className={`hub-h2-pick ${siteClass(shown.site)}`}>
          <span aria-hidden="true" className="hub-h2-pick-tile">{shown.tile}</span>
          <div className="hub-h2-pick-body">
            <span className="hub-h2-pick-k">{shown.pickLabel}</span>
            <span className="hub-h2-pick-t">{shown.title}</span>
          </div>
          <a href={shown.href} className="hub-h2-pick-play hub-h2-btn">{labels.play}</a>
          <button type="button" onClick={surprise} className="hub-h2-pick-again hub-h2-btn">{labels.another}</button>
        </div>
      ) : null}
    </>
  );
}
