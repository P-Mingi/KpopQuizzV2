// Run O1, lot H2a: the hero of the new home: the one H1, the definition, the line and the buttons.
// Home v4 (2026-11-10, HOME-AUDIT.md S1, validated prototype): the eyebrow and the two site cards are gone from here (the doors are the
// "Pick your side" band, home-sites.tsx). Left, the locked text: the H1, the definition sentence right under it (owner decision 2026-10-29,
// SEO rule 3.1: one sentence, in the server HTML), then the pinned row: the line and the buttons. A guest gets the line "Start with today's
// puzzles, or pick any quiz." and one main button, "Play today's games" (ink, down to the Today band), then Surprise me (secondary). A signed-in
// fan gets "Welcome back, @name. 2 games left today." and Surprise me; the main button is the one of the "Your day" card.
// Right, one card: "Your day" signed in (home-day.tsx), the account card of the prototype for a guest. Same structure, two states.
import { HubShares } from '@/components/hub/hub-shares';
import { ht } from '@/lib/site/hub/copy';
import { BURROW_PATHS } from '@/lib/site/hub/daily-guess';
import { homeUrl } from '@/lib/site/hub/home-types';

import { HomeLede, HomeYourDay } from './home-day';
import { HomeSurprise } from './home-surprise';
import { HomeSignIn } from './home-signin';
import { RabbitMark } from './home-ui';
import { PASSPORT_PATH, siteName } from './home-names';
import { quizCounts } from './home-today';

import type { HomeDone, HomeSurprise as HomeSurpriseData, HomeToday as HomeTodayData, HomeViewer } from '@/lib/site/hub/home-types';
import type { DayGame } from './home-day-logic';
import type { SurprisePick } from './home-surprise';

/** The Surprise me pool: the quizzes of the data module, each with the link on its own site. */
export function surprisePool(surprise: HomeSurpriseData): SurprisePick[] {
  return surprise.pool.map((q) => ({
    id: q.id,
    tile: q.tile,
    title: q.title,
    href: homeUrl(q),
    site: q.site,
    pickLabel: ht('hp.surprise.pick', { name: siteName(q.site) }),
  }));
}

function days(n: number): string {
  return n === 1 ? ht('hp.today.day1') : ht('hp.today.days', { n });
}

/** The card of a guest: what one account is, and Sign in. What other sites see, and never see, stays one click away (the privacy page's words). */
function AccountCard(): React.ReactElement {
  return (
    <aside aria-labelledby="acc-h" className="hub-h2-card hub-h2-yd hub-h2-yd-guest">
      <div className="hub-h2-yd-top">
        <RabbitMark size={48} className="hub-h2-pass-mk" />
        <h2 id="acc-h" className="hub-h2-h3">{ht('hp.pass.title')}</h2>
      </div>
      <p className="hub-h2-body">{ht('hp.pass.lede')}</p>
      <ul className="hub-h2-bullets">
        <li><span aria-hidden="true" className="hub-h2-bdot hub-h2-s-k" />{ht('hp.pass.b1')}</li>
        <li><span aria-hidden="true" className="hub-h2-bdot hub-h2-s-a" />{ht('hp.pass.b2', { kpopName: siteName('kpop'), animeName: siteName('anime') })}</li>
        <li><span aria-hidden="true" className="hub-h2-bdot hub-h2-s-n" />{ht('hp.pass.b3')}</li>
      </ul>
      <HomeSignIn label={ht('hp.pass.cta')} sheetTitle={ht('home.signInSheetTitle')} sheetSub={ht('home.signInSheetSub')} className="hub-h2-cta hub-h2-cta-line hub-h2-btn" />
      <details id="passport" className="hub-h2-pass-shares">
        <summary className="hub-h2-pass-sum">{ht('hp.pass.shares')}</summary>
        <HubShares variant="home" />
      </details>
    </aside>
  );
}

interface HeroProps {
  readonly viewer: HomeViewer | null;
  readonly pool: readonly SurprisePick[];
  readonly playedIds: readonly string[];
  readonly today: HomeTodayData | null;
  readonly done: HomeDone;
  /** The games of the home (none while the Daily games are closed). */
  readonly games: readonly DayGame[];
  /** The Today band is on the page: "Play today's games" leads to it. */
  readonly todayShown: boolean;
}

export function HomeHero({ viewer, pool, playedIds, today, done, games, todayShown }: HeroProps): React.ReactElement {
  const quizzes = quizCounts(today, done, viewer !== null);
  const lede = viewer ? (
    <HomeLede
      welcome={ht('hp.hero.ledeIn', { name: viewer.username })}
      games={games}
      quizzes={quizzes}
      left1={ht('hp.hero.ledeLeft1')}
      leftN={ht('hp.hero.ledeLeft', { n: '{n}' })}
      allDone={ht('hp.hero.ledeDone')}
    />
  ) : ht('hp.hero.lede');
  const streaks = viewer
    ? (['kpop', 'anime'] as const).filter((s) => viewer.sites[s]).map((s) => ({
      site: s,
      label: ht('hp.today.streakLine', { site: s === 'kpop' ? ht('hp.top.kpop') : ht('hp.top.anime'), days: days(viewer.streaks[s]) }),
    }))
    : [];
  const joined = viewer ? (['kpop', 'anime'] as const).filter((s) => viewer.sites[s]) : [];
  const levelsAria = joined.map((s) => ht('hp.nav.levelOf', { name: siteName(s), level: viewer!.sites[s]!.level })).join(', ');
  const levelsShort = joined.map((s) => ht('hp.pass.levelShort', { name: siteName(s), level: viewer!.sites[s]!.level })).join(' · ');
  return (
    <section aria-labelledby="hero-h" className="hub-h2-hero hub-h2-wrap">
      <div className="hub-h2-hero-text">
        <h1 id="hero-h" className="hub-h2-h1">{ht('hp.hero.h1')}</h1>
        <p className="hub-h2-def">{ht('hp.hero.def')}</p>
        <HomeSurprise
          pool={pool}
          playedIds={playedIds}
          lede={lede}
          {...(viewer === null && todayShown ? { primary: { href: '#today', label: ht('hp.hero.play') } } : {})}
          labels={{ button: ht('hp.surprise.button'), play: ht('hp.surprise.play'), another: ht('hp.surprise.another') }}
        />
      </div>
      <div className="hub-h2-hero-card">
        <div aria-hidden="true" className="hub-h2-tilt hub-h2-tilt-k" />
        <div aria-hidden="true" className="hub-h2-tilt hub-h2-tilt-a" />
        {viewer ? (
          <HomeYourDay
            username={viewer.username}
            games={games}
            quizzes={quizzes}
            streaks={streaks}
            levels={levelsShort}
            levelsAria={levelsAria}
            hrefs={{ kpopdle: BURROW_PATHS.kpopdle, otakudle: BURROW_PATHS.otakudle }}
            gameNames={{ kpopdle: ht('hp.today.kpopdle'), otakudle: ht('hp.today.otakudle') }}
            labels={{
              streak: ht('hp.today.streaks'),
              title: ht('hp.pass.mine', { name: viewer.username }),
              done: ht('hp.today.done', { done: '{done}', total: '{total}' }),
              left: ht('hp.today.left', { n: '{n}' }),
              play: ht('hp.today.playGame', { name: '{name}' }),
              playFallback: ht('hp.hero.play'),
              allDone: ht('hp.hero.ledeDone'),
              resets: ht('hp.today.resets', { time: '{time}' }),
              resetsFallback: ht('hp.today.resetsFallback'),
              passport: ht('hp.pass.open'),
            }}
            nextAt={today?.rotation.nextAt ?? null}
            passportHref={PASSPORT_PATH}
            todayHref="#today"
          />
        ) : <AccountCard />}
      </div>
    </section>
  );
}

