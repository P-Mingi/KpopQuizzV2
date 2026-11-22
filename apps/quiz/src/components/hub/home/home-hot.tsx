// Run O1, lot H2a: "Hot right now", then home v4 "Popular this week" (HOME-AUDIT.md S4 and P2-4). The links are the canonical pages of the
// quizzes on their own site; a row is the whole link to its quiz.
// Lot HUB-HOT-B (2026-11-22, owner direction B): the band is two panels side by side, KpopQuiz and OtakuQuiz, each with its top three by plays
// of the week. No filter, no client code: a server component. The first place is one link over a whole block (a banner, the rank in a white
// notch, the subject, the title, the difficulty and format line, the count of the week); the second and the third are link rows (rank, cover,
// title, subject and difficulty, count of the week). The banner picture comes in this order: the picture of the group or series (the one its own
// pages show), else the quiz's cover, else the name of the group or series set in type; a row thumbnail goes cover, group picture, initials.
// Equal heights: every slot has a fixed height (titles on two lines, reserved even for a short one; the meta line on one line with an ellipsis;
// the NEW tag shares the line of the count), and the grid stretches the two panels, so they stay level whatever the titles say.
import { ArrowIcon } from './home-icons';
import { siteClass } from './site-class';

export interface HotCard {
  readonly site: 'kpop' | 'anime';
  /** The initials of the group or series (the last fallback of a thumbnail). */
  readonly tile: string;
  readonly title: string;
  readonly href: string;
  /** The group or series the quiz is about. */
  readonly subject: string;
  /** "Easy", "Medium" or "Hard". */
  readonly level: string;
  /** The format when it is not the classic one ("True or false"), else null. */
  readonly format: string | null;
  /** The plays of the last 7 days, or null when unknown. */
  readonly weekPlays: number | null;
  readonly isNew: boolean;
  /** The quiz's own cover, or null. */
  readonly cover: string | null;
  /** The picture of its group or series, or null. */
  readonly groupImage: string | null;
}

export interface HotPanel {
  readonly site: 'kpop' | 'anime';
  readonly name: string;
  readonly items: readonly HotCard[];
  readonly seeAllHref: string;
  /** The accessible name of "See all": "All K-pop quizzes on KpopQuiz". */
  readonly seeAllLabel: string;
}

export interface HotLabels {
  readonly title: string;
  readonly sub: string;
  /** "Week 47 · 16-22 Nov" (set in capitals by the sheet). */
  readonly eyebrow: string;
  readonly seeAll: string;
  readonly rank: string;
  readonly newLabel: string;
  readonly empty: string;
  /** "{n} plays this week" and "{n} this week". */
  readonly weekPlays: string;
  readonly weekShort: string;
}

/** Bars of the difficulty gauge: Easy 1, Medium 2, Hard 3, anything else none (the word still follows). */
export function gaugeBars(level: string): 0 | 1 | 2 | 3 {
  const l = level.trim().toLowerCase();
  return l === 'easy' ? 1 : l === 'medium' ? 2 : l === 'hard' ? 3 : 0;
}

/** The source of the banner of the first place, in order: the group or series picture, the cover, else none (the name in type). */
export function bannerSource(q: Pick<HotCard, 'groupImage' | 'cover'>): string | null {
  return q.groupImage ?? q.cover ?? null;
}

/** The source of a row thumbnail, in order: the cover, the group or series picture, else none (the initials). */
export function thumbSource(q: Pick<HotCard, 'groupImage' | 'cover'>): string | null {
  return q.cover ?? q.groupImage ?? null;
}

const SLOTS = 3;

const GAUGE_CLASS = ['hub-h2-gauge', 'hub-h2-gauge hub-h2-gauge-1', 'hub-h2-gauge hub-h2-gauge-2', 'hub-h2-gauge hub-h2-gauge-3'] as const;

function Gauge({ level }: { level: string }): React.ReactElement {
  const n = gaugeBars(level);
  return (
    <>
      <span aria-hidden="true" className={GAUGE_CLASS[n]}><i className="hub-h2-gb" /><i className="hub-h2-gb" /><i className="hub-h2-gb" /></span>
      <span className="hub-h2-pm-w">{level}</span>
    </>
  );
}

function Count({ q, text }: { q: HotCard; text: string }): React.ReactElement {
  return <span className="hub-h2-pc hub-h2-num">{q.weekPlays === null ? null : text.replace('{n}', q.weekPlays.toLocaleString('en-US'))}</span>;
}

function NewTag({ label }: { label: string }): React.ReactElement {
  return <span className="hub-h2-ntag">{label}</span>;
}

function First({ q, labels }: { q: HotCard; labels: HotLabels }): React.ReactElement {
  const src = bannerSource(q);
  return (
    <a href={q.href} className={`hub-h2-t1 ${siteClass(q.site)}`}>
      <span className="hub-h2-t1-rank hub-h2-big"><span className="hub-h2-sr">{labels.rank} </span>1</span>
      <span className="hub-h2-t1-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" width={420} height={150} loading="lazy" decoding="async" className="hub-h2-t1-img" /> : <span aria-hidden="true" className="hub-h2-t1-type hub-h2-big">{q.subject}</span>}
      </span>
      <span className="hub-h2-t1-body">
        <span className="hub-h2-t1-top">
          <span className="hub-h2-meta hub-h2-pm-sub">{q.subject}</span>
          {q.isNew ? <NewTag label={labels.newLabel} /> : null}
        </span>
        <span className="hub-h2-t1-title">{q.title}</span>
        <span className="hub-h2-meta hub-h2-pm">
          <Gauge level={q.level} />
          {q.format ? <span className="hub-h2-pm-f">{`· ${q.format}`}</span> : null}
        </span>
        <Count q={q} text={labels.weekPlays} />
      </span>
    </a>
  );
}

function Row({ q, n, labels }: { q: HotCard; n: number; labels: HotLabels }): React.ReactElement {
  const src = thumbSource(q);
  return (
    <a href={q.href} className={`hub-h2-t2 ${siteClass(q.site)}`}>
      <span className="hub-h2-t2-rank hub-h2-big"><span className="hub-h2-sr">{labels.rank} </span>{n}</span>
      <span aria-hidden="true" className="hub-h2-th hub-h2-th-48">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" width={48} height={48} loading="lazy" decoding="async" className="hub-h2-th-img" /> : <span className="hub-h2-big hub-h2-t2-init">{q.tile}</span>}
      </span>
      <span className="hub-h2-t2-body">
        <span className="hub-h2-t2-title">{q.title}</span>
        <span className="hub-h2-meta hub-h2-pm">
          <span className="hub-h2-pm-sub">{q.subject}</span>
          <Gauge level={q.level} />
        </span>
        <span className="hub-h2-t2-line">
          <Count q={q} text={labels.weekShort} />
          {q.isNew ? <NewTag label={labels.newLabel} /> : null}
        </span>
      </span>
    </a>
  );
}

function Panel({ panel, labels }: { panel: HotPanel; labels: HotLabels }): React.ReactElement {
  const id = `hot-${panel.site === 'kpop' ? 'k' : 'a'}-h`;
  const [first, ...rest] = panel.items;
  return (
    <section aria-labelledby={id} className={`hub-h2-pnl ${siteClass(panel.site)}`}>
      <div className="hub-h2-pnl-head">
        <h3 id={id} className="hub-h2-pnl-h3"><span aria-hidden="true" className="hub-h2-sdot hub-h2-sdot-s" />{panel.name}</h3>
        <a href={panel.seeAllHref} aria-label={panel.seeAllLabel} className="hub-h2-pnl-all">{labels.seeAll}<ArrowIcon /></a>
      </div>
      {first ? (
        <ol className="hub-h2-pnl-list">
          <li className="hub-h2-slot-1"><First q={first} labels={labels} /></li>
          {Array.from({ length: SLOTS - 1 }, (_, i) => {
            const q = rest[i];
            return q ? <li key={q.href} className="hub-h2-slot-2"><Row q={q} n={i + 2} labels={labels} /></li> : <li key={`empty-${i}`} aria-hidden="true" className="hub-h2-slot-2" />;
          })}
        </ol>
      ) : (
        <div className="hub-h2-pnl-list hub-h2-pnl-none"><p className="hub-h2-meta">{labels.empty}</p></div>
      )}
    </section>
  );
}

export function HomeHot({ panels, labels }: { panels: readonly HotPanel[]; labels: HotLabels }): React.ReactElement {
  return (
    <div className="hub-h2-hot">
      <div className="hub-h2-bhead">
        <div>
          <p className="hub-h2-eyebrow hub-h2-hot-eyebrow">{labels.eyebrow}</p>
          <h2 id="hot-h" className="hub-h2-h2">{labels.title}</h2>
          <p className="hub-h2-body">{labels.sub}</p>
        </div>
      </div>
      <div className="hub-h2-pnls">
        {panels.map((p) => <Panel key={p.site} panel={p} labels={labels} />)}
      </div>
    </div>
  );
}
