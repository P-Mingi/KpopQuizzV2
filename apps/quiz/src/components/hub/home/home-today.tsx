// Run O1, lot H2a: "Today": the quiz of the day of each site, the blindtest of the day (KpopQuiz, audio only), the debate of the day.
// Lot H2c: each card is left out when its data is missing (no quiz in a bank, no blind test set, no debate).
// Home v4 (2026-11-10, HOME-AUDIT.md section 4, validated prototype home-v4-prototype/Main.dc.html): "Today's games" is a full-width band
// and the one contained panel of the page: a ribbon with the time to the new puzzles, the header (title, one plain line, "All daily games"),
// then two tiers. Tier 1: Kpopdle and Otakudle as real cards with their state and one call to action in the colour of their site (the Daily
// games, only while they are open, lib/site/hub/daily-guess.ts; their state is read in the browser, home-day.tsx). Tier 2, "Also today": the
// K-pop and the anime quiz of the day and the blind test, playable in its tile. The debate of the day moved to the Community band.
// A tile's picture is the owner's image slot when it has one (site_assets), else its icon slot (lib/photos/icons-read.ts, drawn by IconMark).
// The progress line, the streaks and the sign-in nudge moved out: "Your day" in the hero (signed in) and the line under the tiles (guest).
import { IconMark } from '@/components/photos/icon-mark';
import { BURROW_PATHS } from '@/lib/site/hub/daily-guess';
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';
import { HOME_TODAY_ICON } from '@/lib/photos/slots';
import { iconOf } from '@/lib/photos/icons-read';

import { HomeBlindtest } from './home-blindtest';
import { HomeCountdown } from './home-countdown';
import { HomeGameCard } from './home-day';
import { ArrowIcon, CheckIcon } from './home-icons';
import { HomeSignIn } from './home-signin';
import { SlotImage } from './home-ui';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { LiveIcons } from '@/lib/photos/icons-read';
import type { HomeAssetKey, HomeAssets } from '@/lib/site/hub/home-assets';
import type { HomeDone, HomeToday as HomeTodayData, HomeViewer } from '@/lib/site/hub/home-types';
import type { DayGame } from './home-day-logic';
import type { GameCardLabels } from './home-day';

/** The picture of a tile: the owner's image of its slot when it has one, else the icon of its icon slot (a row always has one). */
export function Mark({ assetKey, assets, icons, size }: { assetKey: HomeAssetKey | 'blindtest'; assets: HomeAssets; icons: LiveIcons; size: number }): React.ReactElement {
  const image = assetKey === 'blindtest' ? undefined : assets[assetKey];
  if (image) return <SlotImage asset={image} width={size} height={size} className="hub-h2-th-img" />;
  const icon = iconOf(icons, HOME_TODAY_ICON[assetKey as keyof typeof HOME_TODAY_ICON]);
  return <IconMark cfg={icon.cfg} png={icon.png} state="done" size={size} glyph={Math.round(size / 2)} slot={HOME_TODAY_ICON[assetKey as keyof typeof HOME_TODAY_ICON]} />;
}

interface GameDef {
  readonly game: DayGame;
  readonly site: 'kpop' | 'anime';
  readonly name: string;
  readonly head: string;
  readonly desc: string;
  readonly href: string;
  readonly vt: string;
  readonly vtLang: string;
}

/** The two games of the home. Their names are brands, written as the games write them ("Kpop" and "dle", "Otaku" and "dle"). */
export function gameDefs(): GameDef[] {
  return [
    { game: 'kpopdle', site: 'kpop', name: ht('hp.today.kpopdle'), head: 'Kpop', desc: ht('hp.today.kpopdleDesc'), href: BURROW_PATHS.kpopdle, vt: ht('hp.today.vtKpopdle'), vtLang: 'ko' },
    { game: 'otakudle', site: 'anime', name: ht('hp.today.otakudle'), head: 'Otaku', desc: ht('hp.today.otakudleDesc'), href: BURROW_PATHS.otakudle, vt: ht('hp.today.vtOtakudle'), vtLang: 'ja' },
  ];
}

function cardLabels(name: string): GameCardLabels {
  return {
    play: ht('hp.today.playGame', { name }),
    cont: ht('hp.today.continueGame', { name }),
    result: ht('hp.today.seeResult'),
    todo: ht('hp.today.stateTodo'),
    prog: ht('hp.today.stateProg'),
    won: ht('hp.today.stateWon'),
    lost: ht('hp.today.stateLost'),
    metaTodo: ht('hp.today.metaTodo'),
    metaProg: ht('hp.today.metaProg', { n: '{n}' }),
    metaWon: ht('hp.today.metaWon', { n: '{n}' }),
    metaWon1: ht('hp.today.metaWon1'),
    metaLost: ht('hp.today.metaLost', { n: '{n}' }),
  };
}

/** The quizzes of the day of the home: its rows, each marked played once the signed-in fan finished it today. */
function quizTiles(today: HomeTodayData, done: HomeDone, signedIn: boolean) {
  return today.quizzes.map((q) => ({
    key: (q.site === 'kpop' ? 'qotdK' : 'qotdA') as HomeAssetKey,
    site: q.site,
    name: q.site === 'kpop' ? ht('hp.today.qotdKpop') : ht('hp.today.qotdAnime'),
    desc: q.title,
    href: homeUrl(q),
    played: signedIn && done[q.site],
  }));
}

/** How many quizzes of the day the server tracks for this fan (none for a guest) and how many are done: the quiz half of the counter of the day. */
export function quizCounts(today: HomeTodayData | null, done: HomeDone, signedIn: boolean): { readonly total: number; readonly done: number } {
  if (!signedIn || !today) return { total: 0, done: 0 };
  return { total: today.quizzes.length, done: today.quizzes.filter((q) => done[q.site]).length };
}

export function HomeToday({ today, viewer, done, assets, icons, burrow }: { today: HomeTodayData | null; viewer: HomeViewer | null; done: HomeDone; assets: HomeAssets; icons: LiveIcons; burrow: boolean }): React.ReactElement {
  const bt = today?.blindtest ?? null;
  const tiles = today ? quizTiles(today, done, viewer !== null) : [];
  const defs = burrow ? gameDefs() : [];
  const also = tiles.length > 0 || bt !== null;
  return (
    <section id="today" aria-labelledby="today-h" className="hub-h2-band hub-h2-wrap">
      <div className="hub-h2-panel">
        {today ? (
          <div className="hub-h2-ribbon">
            <p className="hub-h2-eyebrow">
              <HomeCountdown template={ht('hp.today.resets', { time: '{time}' })} fallback={ht('hp.today.resetsFallback')} nextAt={today.rotation.nextAt} />
            </p>
          </div>
        ) : null}
        <div className="hub-h2-panel-in">
          <div className="hub-h2-bhead">
            <div>
              <h2 id="today-h" className="hub-h2-h2">{ht('hp.today.title')}</h2>
              <p className="hub-h2-body">{ht('hp.today.sub')}</p>
            </div>
            {burrow ? <a href={BURROW_PATHS.burrow} className="hub-h2-tl">{ht('hp.today.openBurrow')}<ArrowIcon /></a> : null}
          </div>
          {defs.length > 0 ? (
            <div className="hub-h2-games">
              {defs.map((d) => (
                <HomeGameCard
                  key={d.game}
                  game={d.game}
                  toneClass={siteClass(d.site)}
                  name={d.name}
                  head={d.head}
                  tail={d.name.slice(d.head.length)}
                  desc={d.desc}
                  href={d.href}
                  vt={d.vt}
                  vtLang={d.vtLang}
                  labels={cardLabels(d.name)}
                  mark={<Mark assetKey={d.game} assets={assets} icons={icons} size={64} />}
                />
              ))}
            </div>
          ) : null}
          {also ? (
            <>
              <h3 className="hub-h2-rt hub-h2-also">{ht('hp.today.groupQuizzes')}</h3>
              <ul className="hub-h2-tiles">
                {tiles.map((t) => (
                  <li key={t.key} className={`hub-h2-dt ${siteClass(t.site)}`}>
                    <div className="hub-h2-dt-head">
                      <span aria-hidden="true" className="hub-h2-th hub-h2-th-48"><Mark assetKey={t.key} assets={assets} icons={icons} size={48} /></span>
                      <span className="hub-h2-dt-body">
                        <a href={t.href} className="hub-h2-rt hub-h2-stretch">{t.name}</a>
                        <span className="hub-h2-meta">{t.desc}</span>
                      </span>
                    </div>
                    <div className="hub-h2-dt-foot">
                      {t.played ? <span className="hub-h2-chip hub-h2-chip-done"><CheckIcon />{ht('hp.today.doneMark')}</span> : <span className="hub-h2-verb">{ht('hp.today.play')}<ArrowIcon /></span>}
                      <span className="hub-h2-meta hub-h2-num hub-h2-dt-site">{siteName(t.site)}</span>
                    </div>
                  </li>
                ))}
                {bt ? (
                  <li className={`hub-h2-dt hub-h2-dt-bt ${siteClass(bt.site)}`}>
                    <HomeBlindtest
                      songs={bt.songs}
                      seconds={bt.seconds}
                      previewUrl={bt.previewUrl}
                      href={homeUrl(bt)}
                      mark={<Mark assetKey="blindtest" assets={assets} icons={icons} size={48} />}
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
                  </li>
                ) : null}
              </ul>
            </>
          ) : null}
          {viewer === null ? (
            <p className="hub-h2-body hub-h2-nudge">
              {ht('hp.today.nudge')}{' '}
              <HomeSignIn label={ht('hp.today.nudgeCta')} sheetTitle={ht('home.signInSheetTitle')} sheetSub={ht('home.signInSheetSub')} className="hub-h2-ql" />
              {' '}{ht('hp.today.nudgeEnd')}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
