// Run O1, lot H2a: the hero of the new home: the eyebrow, the one H1, the lede, the two doors (one per site: name, tagline, pills, one
// quiz, the way in), then Surprise me. On the phone board the doors are two tiles and the lede is not there.
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { ArrowIcon } from './home-icons';
import { HomeSurprise } from './home-surprise';
import { Dual, RabbitWhite } from './home-ui';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeDoor, HomeSurprise as HomeSurpriseData } from '@/lib/site/hub/home-types';
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

function Door({ door }: { door: HomeDoor }): React.ReactElement {
  return (
    <article className={`hub-h2-door ${siteClass(door.site)}`}>
      <div aria-hidden="true" className={`hub-h2-deco ${door.site === 'kpop' ? 'hub-h2-deco-k' : 'hub-h2-deco-a'}`} />
      <div className="hub-h2-door-head">
        <span aria-hidden="true" className="hub-h2-tile"><RabbitWhite size={28} className="hub-h2-tile-mk" /></span>
        <div className="hub-h2-door-id">
          <h2 className="hub-h2-name">{door.name}</h2>
          <span className="hub-h2-tagline">{door.tagline}</span>
        </div>
      </div>
      <div className="hub-h2-chips">
        {door.chips.map((chip) => <span key={chip} className="hub-h2-chip">{chip}</span>)}
      </div>
      <span className="hub-h2-phoneline">{door.phoneLine}</span>
      {door.spotlight ? (
        <div className="hub-h2-spot">
          <span className="hub-h2-spot-l">{door.spotlight.label}</span>
          <span className="hub-h2-spot-t hub-h2-clamp">{door.spotlight.title}</span>
        </div>
      ) : null}
      <a href={homeUrl({ site: door.site, path: '/' })} className="hub-h2-enter hub-h2-btn">
        <Dual desktop={ht('hp.door.enter', { name: door.name })} phone={ht('hp.door.enterShort')} />
        <ArrowIcon />
      </a>
    </article>
  );
}

export function HomeHero({ doors, pool, playedIds }: { doors: readonly HomeDoor[]; pool: readonly SurprisePick[]; playedIds: readonly string[] }): React.ReactElement {
  return (
    <section aria-labelledby="hero-h" className="hub-h2-hero">
      <div className="hub-h2-hero-text">
        <p className="hub-h2-eyebrow">{ht('hp.hero.eyebrow')}</p>
        <h1 id="hero-h" className="hub-h2-h1">{ht('hp.hero.h1')}</h1>
        <p className="hub-h2-lede">{ht('hp.hero.lede')}</p>
      </div>
      {doors.length > 0 ? (
        <div className="hub-h2-doors">
          {doors.map((door) => <Door key={door.site} door={door} />)}
        </div>
      ) : null}
      <HomeSurprise
        pool={pool}
        playedIds={playedIds}
        labels={{ button: ht('hp.surprise.button'), note: ht('hp.surprise.note'), play: ht('hp.surprise.play'), another: ht('hp.surprise.another') }}
      />
    </section>
  );
}
