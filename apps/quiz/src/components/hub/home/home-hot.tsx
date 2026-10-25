'use client';

// Run O1, lot H2a: "Hot right now": the filter (All, one site, the other) and the ranked list. The three lists are in the page, the
// chips only switch which one is shown (the design's script); each card links to the canonical page of its quiz on its own site.
import { useState } from 'react';

import { siteClass } from './site-class';

export interface HotCard {
  readonly site: 'kpop' | 'anime';
  readonly tile: string;
  readonly title: string;
  readonly href: string;
  /** "KpopQuiz · BTS". */
  readonly line: string;
  readonly meta: string;
  /** The phone card shows the difficulty only. */
  readonly phoneMeta: string;
  readonly plays: string;
  readonly isNew: boolean;
}

interface HomeHotProps {
  /** The three lists, already in rank order: all (alternating), kpop, anime. */
  readonly lists: { readonly all: readonly HotCard[]; readonly kpop: readonly HotCard[]; readonly anime: readonly HotCard[] };
  /** The two ways to every quiz of a site, under the list. */
  readonly allLinks: readonly { readonly site: 'kpop' | 'anime'; readonly href: string; readonly label: string }[];
  readonly labels: {
    readonly title: string;
    readonly sub: string;
    readonly filter: string;
    readonly all: string;
    readonly kpop: string;
    readonly anime: string;
    readonly kpopShort: string;
    readonly animeShort: string;
    readonly newLabel: string;
  };
}

type Filter = 'all' | 'kpop' | 'anime';

export function HomeHot({ lists, allLinks, labels }: HomeHotProps): React.ReactElement {
  const [filter, setFilter] = useState<Filter>('all');
  const chips: { id: Filter; long: string; short: string; dot: string }[] = [
    { id: 'all', long: labels.all, short: labels.all, dot: '' },
    { id: 'kpop', long: labels.kpop, short: labels.kpopShort, dot: ' hub-h2-segdot-k' },
    { id: 'anime', long: labels.anime, short: labels.animeShort, dot: ' hub-h2-segdot-a' },
  ];
  return (
    <>
      <div className="hub-h2-hot-head">
        <div className="hub-h2-hot-title">
          <h2 id="hot-h" className="hub-h2-h2">{labels.title}</h2>
          <span className="hub-h2-sub hub-h2-hot-sub">{labels.sub}</span>
        </div>
        <div role="group" aria-label={labels.filter} className="hub-h2-seg">
          {chips.map((c) => (
            <button key={c.id} type="button" aria-pressed={filter === c.id ? 'true' : 'false'} className="hub-h2-segbtn" onClick={() => setFilter(c.id)}>
              <span aria-hidden="true" className={`hub-h2-segdot${c.dot}`} />
              <span className="hub-h2-nophone">{c.long}</span>
              <span className="hub-h2-phoneonly">{c.short}</span>
            </button>
          ))}
        </div>
      </div>
      <ol className="hub-h2-hot-list">
        {lists[filter].map((q, i) => (
          <li key={q.href}>
            <a href={q.href} className={`hub-h2-hcard hub-h2-card ${siteClass(q.site)}`}>
              <span aria-hidden="true" className="hub-h2-rank-m">{i + 1}</span>
              <span aria-hidden="true" className="hub-h2-htile">{q.tile}<span className="hub-h2-rank">{i + 1}</span></span>
              <span className="hub-h2-hbody">
                <span className="hub-h2-hsite"><span className="hub-h2-hdot" />{q.line}</span>
                <span className="hub-h2-htitle hub-h2-clamp">{q.title}</span>
                <span className="hub-h2-hmeta">{q.meta}{q.isNew ? <span className="hub-h2-newpill">{labels.newLabel}</span> : null}{q.plays ? <span>· {q.plays}</span> : null}</span>
                <span className="hub-h2-hmeta-m">{q.phoneMeta} · {q.isNew ? labels.newLabel : q.plays}</span>
              </span>
            </a>
          </li>
        ))}
      </ol>
      <div className="hub-h2-all">
        {allLinks.map((l) => <a key={l.site} href={l.href} className={`hub-h2-alllink ${siteClass(l.site)}`}>{l.label}</a>)}
      </div>
    </>
  );
}
