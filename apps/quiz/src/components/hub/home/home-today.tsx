// Run O1, lot H2a: "Today": the quiz of the day of each site, the blindtest of the day (KpopQuiz, audio only), the debate of the day.
// Lot H2c: each card is left out when its data is missing (no quiz in a bank, no blind test set, no debate).
// Home v3 (2026-10-29, Home.dc.html): the right column of the first row, as rows. The countdown to the next picks; signed in, the progress of
// the day (the quizzes of the day finished today, from the fan's plays) and the streak of each site joined, signed out a line that offers
// Sign in; then rows with a small image each: the Burrow (Kpopdle and Otakudle, only while the Burrow is open, lib/site/hub/daily-guess.ts),
// the K-pop and the anime quiz of the day, the debate of the day; and the blind test, playable in its row. A row's image is the owner's
// (site_assets) or, until there is one, an icon on the colour of its site.
// Review fix: the progress line and the badge of the Burrow tab count the same rows (todayCounts): the playable dailies, i.e. the quizzes
// of the day plus Kpopdle and Otakudle while the Burrow is open; the debate is a vote and counts in neither.
import { BURROW_PATHS } from '@/lib/site/hub/daily-guess';
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { HomeBlindtest } from './home-blindtest';
import { HomeCountdown } from './home-countdown';
import { ArrowIcon, CheckIcon, ROW_ICONS, RowIcon } from './home-icons';
import { HomeSignIn } from './home-signin';
import { SlotImage } from './home-ui';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeAssetKey, HomeAssets } from '@/lib/site/hub/home-assets';
import type { HomeDone, HomeSite, HomeToday as HomeTodayData, HomeViewer } from '@/lib/site/hub/home-types';

type RowState = 'play' | 'vote' | 'done';

interface TodayRow {
  readonly key: HomeAssetKey;
  /** The site the row belongs to (its colours); null for the debate, which is the community's. */
  readonly site: HomeSite | null;
  readonly name: string;
  readonly desc: string;
  readonly href: string;
  readonly icon: string;
  readonly state: RowState;
}

/** The rows of the Burrow, while it is open. Their state lives in the browser of each game, so the home offers Play. */
function burrowRows(): TodayRow[] {
  return [
    { key: 'kpopdle', site: 'kpop', name: ht('hp.today.kpopdle'), desc: ht('hp.today.kpopdleDesc'), href: BURROW_PATHS.kpopdle, icon: ROW_ICONS.idol, state: 'play' },
    { key: 'otakudle', site: 'anime', name: ht('hp.today.otakudle'), desc: ht('hp.today.otakudleDesc'), href: BURROW_PATHS.otakudle, icon: ROW_ICONS.char, state: 'play' },
  ];
}

/** The quizzes of the day, each marked done once the fan finished it today. */
function quizRows(today: HomeTodayData, done: HomeDone): TodayRow[] {
  return today.quizzes.map((q) => ({
    key: q.site === 'kpop' ? 'qotdK' : 'qotdA',
    site: q.site,
    name: q.site === 'kpop' ? ht('hp.today.qotdKpop') : ht('hp.today.qotdAnime'),
    desc: q.title,
    href: homeUrl(q),
    icon: ROW_ICONS.quiz,
    state: done[q.site] ? 'done' : 'play',
  }));
}

/** The debate of the day: a vote, never a game to finish. */
function debateRows(today: HomeTodayData): TodayRow[] {
  return today.debate
    ? [{ key: 'debate', site: null, name: ht('hp.today.debate'), desc: today.debate.title, href: homeUrl(today.debate), icon: ROW_ICONS.vote, state: 'vote' }]
    : [];
}

/**
 * The playable dailies of today and how many of them the fan finished: the quizzes of the day, plus Kpopdle and Otakudle while the Burrow
 * is open. The debate can never be marked done, so it counts in neither. The progress line of Today and the badge of the Burrow tab both
 * read these rows, so they always agree.
 */
export function todayCounts(today: HomeTodayData | null, done: HomeDone, burrow: boolean): { readonly done: number; readonly total: number } {
  const rows = [...(burrow ? burrowRows() : []), ...(today ? quizRows(today, done) : [])];
  return { done: rows.filter((r) => r.state === 'done').length, total: rows.length };
}

/** The playable dailies not done yet, for the badge of the Burrow tab. */
export function todayLeft(today: HomeTodayData | null, done: HomeDone, burrow: boolean): number {
  const c = todayCounts(today, done, burrow);
  return c.total - c.done;
}

function days(n: number): string {
  return n === 1 ? ht('hp.today.day1') : ht('hp.today.days', { n });
}

function Row({ row, assets }: { row: TodayRow; assets: HomeAssets }): React.ReactElement {
  const image = assets[row.key];
  const tone = row.site ? siteClass(row.site) : 'hub-h2-s-n';
  return (
    <li>
      <a href={row.href} className={`hub-h2-line ${tone}`}>
        <span className="hub-h2-th hub-h2-th-row">
          {image ? <SlotImage asset={image} width={42} height={42} className="hub-h2-th-img" /> : <RowIcon d={row.icon} />}
        </span>
        <span className="hub-h2-tbody">
          <span className="hub-h2-tname">{row.name}</span>
          <span className="hub-h2-tdesc hub-h2-clamp">{row.desc}</span>
        </span>
        {row.state === 'done' ? (
          <span className="hub-h2-tstate hub-h2-tstate-done"><CheckIcon />{ht('hp.today.doneMark')}</span>
        ) : (
          <span className="hub-h2-tstate">{row.state === 'vote' ? ht('hp.today.vote') : ht('hp.today.play')}</span>
        )}
      </a>
    </li>
  );
}

export function HomeToday({ today, viewer, done, assets, burrow }: { today: HomeTodayData; viewer: HomeViewer | null; done: HomeDone; assets: HomeAssets; burrow: boolean }): React.ReactElement {
  const bt = today.blindtest;
  const quizzes = [...quizRows(today, done), ...debateRows(today)];
  const { done: doneN, total: tracked } = todayCounts(today, done, burrow);
  const streaks = viewer
    ? (['kpop', 'anime'] as const).filter((s) => viewer.sites[s]).map((s) => (s === 'kpop' ? ht('hp.today.streakKpop', { days: days(viewer.streaks.kpop) }) : ht('hp.today.streakAnime', { days: days(viewer.streaks.anime) })))
    : [];
  return (
    <aside id="today" aria-labelledby="today-h" className="hub-h2-today">
      <div className="hub-h2-today-h">
        <h2 id="today-h" className="hub-h2-h2">{ht('hp.today.title')}</h2>
        <HomeCountdown template={ht('hp.today.resets', { time: '{time}' })} fallback={ht('hp.today.resetsFallback')} nextAt={today.rotation.nextAt} />
      </div>
      {viewer ? (
        tracked > 0 ? (
          <div className="hub-h2-progress">
            <span aria-hidden="true" className="hub-h2-bar"><span className="hub-h2-bar-in" style={{ width: `${Math.max(3, Math.round((doneN / tracked) * 100))}%` }} /></span>
            <span className="hub-h2-progress-t">
              <span className="hub-h2-num">{ht('hp.today.done', { done: doneN, total: tracked })}</span>
              {streaks.length > 0 ? ` · ${ht('hp.today.streaks', { list: streaks.join(', ') })}` : null}
            </span>
          </div>
        ) : null
      ) : (
        <p className="hub-h2-sub hub-h2-nudge">
          {ht('hp.today.nudge')}{' '}
          <HomeSignIn label={ht('hp.today.nudgeCta')} sheetTitle={ht('home.signInSheetTitle')} sheetSub={ht('home.signInSheetSub')} className="hub-h2-nudge-btn" />
          {' '}{ht('hp.today.nudgeEnd')}
        </p>
      )}
      {burrow ? (
        <div>
          <p className="hub-h2-glabel">{ht('hp.today.groupBurrow')}</p>
          <ul className="hub-h2-lines">{burrowRows().map((r) => <Row key={r.key} row={r} assets={assets} />)}</ul>
          <a href={BURROW_PATHS.burrow} className="hub-h2-tlink">{ht('hp.today.openBurrow')}<ArrowIcon /></a>
        </div>
      ) : null}
      {quizzes.length > 0 ? (
        <div>
          <p className="hub-h2-glabel">{ht('hp.today.groupQuizzes')}</p>
          <ul className="hub-h2-lines">{quizzes.map((r) => <Row key={r.key} row={r} assets={assets} />)}</ul>
        </div>
      ) : null}
      {bt ? (
        <div className={`hub-h2-btwrap ${siteClass(bt.site)}`}>
          <HomeBlindtest
            songs={bt.songs}
            seconds={bt.seconds}
            previewUrl={bt.previewUrl}
            href={homeUrl(bt)}
            labels={{
              title: ht('hp.bt.title'),
              playAria: ht('hp.bt.playAria', { seconds: bt.seconds }),
              pauseAria: ht('hp.bt.pauseAria'),
              press: ht('hp.bt.press', { name: siteName(bt.site), songs: bt.songs, seconds: bt.seconds }),
              playing: ht('hp.bt.playing', { songs: bt.songs, seconds: bt.seconds, sec: '{sec}' }),
              done: ht('hp.bt.done', { rest: '{rest}' }),
              all: ht('hp.bt.all', { songs: bt.songs }),
            }}
          />
        </div>
      ) : null}
    </aside>
  );
}
