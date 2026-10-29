'use client';

// Run O1, lot H2a: "Hot right now": the filter and the ranked list. The lists are in the page, the chips only switch which one is shown
// (the design's script); each row links to the canonical page of its quiz on its own site.
// Home v3 (2026-10-29, Home.dc.html): a table of rows (rank, the quiz's image, title, site, group and difficulty, plays or New) and four
// chips: All, KpopQuiz, OtakuQuiz and Start easy (the easy quizzes of both sites; it replaces the old "New here? Start easy" block and is
// left out when there is none). A quiz without its own cover shows the initials of its group on the colour of its site.
import { useHotFilter } from './home-filter';
import { ArrowIcon } from './home-icons';
import { siteClass } from './site-class';

import type { HotFilterId } from './home-filter';

export interface HotCard {
  readonly site: 'kpop' | 'anime';
  readonly tile: string;
  readonly title: string;
  readonly href: string;
  /** "KpopQuiz · BTS · Medium". */
  readonly line: string;
  readonly plays: string;
  readonly isNew: boolean;
  /** The quiz's own cover image, or null. */
  readonly cover: string | null;
}

interface HomeHotProps {
  /** The lists, already in rank order: all (alternating), kpop, anime, easy (alternating, may be empty). */
  readonly lists: { readonly all: readonly HotCard[]; readonly kpop: readonly HotCard[]; readonly anime: readonly HotCard[]; readonly easy: readonly HotCard[] };
  /** The two ways to every quiz of a site, under the list. */
  readonly allLinks: readonly { readonly site: 'kpop' | 'anime'; readonly href: string; readonly label: string }[];
  readonly labels: {
    readonly title: string;
    readonly sub: string;
    readonly filter: string;
    readonly all: string;
    readonly kpop: string;
    readonly anime: string;
    readonly easy: string;
    readonly newLabel: string;
  };
}

export function HomeHot({ lists, allLinks, labels }: HomeHotProps): React.ReactElement {
  // The filter is shared with the search button of the top bar (home-filter.tsx).
  const { filter, setFilter } = useHotFilter();
  const chips: { id: HotFilterId; label: string; dot: string }[] = [
    { id: 'all', label: labels.all, dot: 'hub-h2-segdot' },
    { id: 'kpop', label: labels.kpop, dot: 'hub-h2-segdot hub-h2-segdot-k' },
    { id: 'anime', label: labels.anime, dot: 'hub-h2-segdot hub-h2-segdot-a' },
    ...(lists.easy.length > 0 ? [{ id: 'easy' as const, label: labels.easy, dot: 'hub-h2-segdot hub-h2-segdot-e' }] : []),
  ];
  const shown = lists[filter].length > 0 ? lists[filter] : lists.all;
  return (
    <section id="hot" aria-labelledby="hot-h" className="hub-h2-hot">
      <div className="hub-h2-hot-head">
        <div className="hub-h2-hot-title">
          <h2 id="hot-h" className="hub-h2-h2">{labels.title}</h2>
          <p className="hub-h2-sub">{labels.sub}</p>
        </div>
        <div role="group" aria-label={labels.filter} className="hub-h2-seg">
          {chips.map((c) => (
            <button key={c.id} type="button" aria-pressed={filter === c.id ? 'true' : 'false'} className="hub-h2-segbtn" onClick={() => setFilter(c.id)}>
              <span aria-hidden="true" className={c.dot} />{c.label}
            </button>
          ))}
        </div>
      </div>
      <ol className="hub-h2-lines hub-h2-hot-list">
        {shown.map((q, i) => (
          <li key={q.href}>
            <a href={q.href} className={`hub-h2-line hub-h2-hrow ${siteClass(q.site)}`}>
              <span className="hub-h2-rank hub-h2-num">{i + 1}</span>
              <span aria-hidden="true" className="hub-h2-th hub-h2-hthumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {q.cover ? <img src={q.cover} alt="" width={52} height={52} loading="lazy" decoding="async" className="hub-h2-th-img" /> : q.tile}
              </span>
              <span className="hub-h2-hbody">
                <span className="hub-h2-htitle hub-h2-clamp">{q.title}</span>
                <span className="hub-h2-hmeta"><span aria-hidden="true" className="hub-h2-hdot" />{q.line}</span>
              </span>
              {q.plays ? <span className="hub-h2-hplays hub-h2-num">{q.plays}</span> : q.isNew ? <span className="hub-h2-newpill">{labels.newLabel}</span> : null}
            </a>
          </li>
        ))}
      </ol>
      <div className="hub-h2-all">
        {allLinks.map((l) => <a key={l.site} href={l.href} className={`hub-h2-alllink ${siteClass(l.site)}`}>{l.label}<ArrowIcon /></a>)}
      </div>
    </section>
  );
}
