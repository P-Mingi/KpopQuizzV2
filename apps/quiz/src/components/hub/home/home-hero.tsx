// Run O1, lot H2a: the hero of the new home: the eyebrow, the one H1, the doors of the two sites, Surprise me.
// Home v3 (2026-10-29, Home.dc.html): the left column of the first row. The eyebrow, the H1, "Pick your side, or play both." with Surprise me
// beside it (its pick shows as one row), then the two sites side by side, image first: the owner's 3:2 image (site_assets) or, until there
// is one, a background in the colours of the site with its name written down the side in Korean or Japanese; the name, the real count of
// quizzes, what it is about, its quiz of the moment and one way in. The whole card is the link to the site.
// Owner decision 2026-10-29 (SEO rule 3.1): right under the H1, one sentence in the server HTML says what Bunnyverse is and who it is for;
// the line and Surprise me follow it, as on the board.
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { ArrowIcon } from './home-icons';
import { HomeSurprise } from './home-surprise';
import { SlotImage } from './home-ui';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeAssets } from '@/lib/site/hub/home-assets';
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

/** "Kpop" and "Quiz": the name of a site with its last word in the site's colour, as the board writes it. */
function splitName(name: string): { head: string; tail: string } {
  const at = name.toLowerCase().lastIndexOf('quiz');
  return at > 0 ? { head: name.slice(0, at), tail: name.slice(at) } : { head: name, tail: '' };
}

function SiteCard({ door, assets }: { door: HomeDoor; assets: HomeAssets }): React.ReactElement {
  const image = assets[door.site === 'kpop' ? 'siteK' : 'siteA'];
  const name = splitName(door.name);
  return (
    <a href={homeUrl({ site: door.site, path: '/' })} className={`hub-h2-site hub-h2-rise ${siteClass(door.site)}`}>
      <span className="hub-h2-ph hub-h2-ph-site">
        {image ? (
          <SlotImage asset={image} width={340} height={227} className="hub-h2-ph-img" />
        ) : (
          <span aria-hidden="true" lang={door.site === 'kpop' ? 'ko' : 'ja'} className="hub-h2-vt">
            {door.site === 'kpop' ? ht('hp.site.vtKpop') : ht('hp.site.vtAnime')}
          </span>
        )}
      </span>
      <span className="hub-h2-site-body">
        <span className="hub-h2-site-top">
          <span className="hub-h2-site-name">{name.head}<span className="hub-h2-site-tail">{name.tail}</span></span>
          <span className="hub-h2-site-count hub-h2-num">{door.count}</span>
        </span>
        <span className="hub-h2-site-tag">{door.tagline}</span>
        {door.spotlight ? (
          <span className="hub-h2-site-spot">
            <span className="hub-h2-site-spot-l">{door.spotlight.label}</span>
            <span className="hub-h2-site-spot-t hub-h2-clamp">{door.spotlight.title}</span>
          </span>
        ) : null}
        <span className="hub-h2-enter">{ht('hp.site.enter', { name: door.name })}<ArrowIcon /></span>
      </span>
    </a>
  );
}

export function HomeHero({ doors, pool, playedIds, assets }: { doors: readonly HomeDoor[]; pool: readonly SurprisePick[]; playedIds: readonly string[]; assets: HomeAssets }): React.ReactElement {
  return (
    <section aria-labelledby="hero-h" className="hub-h2-hero">
      <div className="hub-h2-hero-text">
        <p className="hub-h2-eyebrow">{ht('hp.hero.eyebrow')}</p>
        <h1 id="hero-h" className="hub-h2-h1">{ht('hp.hero.h1')}</h1>
        <p className="hub-h2-def">{ht('hp.hero.def')}</p>
        <HomeSurprise
          pool={pool}
          playedIds={playedIds}
          lede={ht('hp.hero.lede')}
          labels={{ button: ht('hp.surprise.button'), play: ht('hp.surprise.play'), another: ht('hp.surprise.another') }}
        />
      </div>
      {doors.length > 0 ? (
        <div className="hub-h2-sites">
          {doors.map((door) => <SiteCard key={door.site} door={door} assets={assets} />)}
        </div>
      ) : null}
    </section>
  );
}
