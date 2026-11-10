// Home v4 (2026-11-10, HOME-AUDIT.md S3 and P0-4, P1-4, validated prototype): "Pick your side". Two compact horizontal cards, one per quiz site:
// the name is the link to the site (an H3), the real count of its quizzes, what it is about, its quiz of the moment as its own link (a contextual
// link to the canonical quiz page, SEO rule 16), one solid button in the colour of the site and the address it opens. The left tile is the
// owner's image when its admin slot (home:site-k, home:site-a) is filled; until then it is a flat tile in the colours of the site with its name
// written down the side, never an empty image panel and never a dotted placeholder.
import { siteAddress } from '@/lib/site/brand';
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';
import { siteConfig } from '@/lib/site/registry';

import { ArrowIcon } from './home-icons';
import { SlotImage } from './home-ui';
import { siteClass } from './site-class';

import type { HomeAssets } from '@/lib/site/hub/home-assets';
import type { HomeDoor } from '@/lib/site/hub/home-types';

/** "Kpop" and "Quiz": the name of a site with its last word in the site's colour, as the board writes it. */
function splitName(name: string): { head: string; tail: string } {
  const at = name.toLowerCase().lastIndexOf('quiz');
  return at > 0 ? { head: name.slice(0, at), tail: name.slice(at) } : { head: name, tail: '' };
}

/** The loaders say "Top now" or "Just added"; the page says what a fan understands. */
function spotLabel(label: string): string {
  return label === 'Just added' ? ht('hp.sites.spotNew') : ht('hp.sites.spotTop');
}

function SiteCard({ door, assets }: { door: HomeDoor; assets: HomeAssets }): React.ReactElement {
  const image = assets[door.site === 'kpop' ? 'siteK' : 'siteA'];
  const name = splitName(door.name);
  const home = homeUrl({ site: door.site, path: '/' });
  return (
    <article className={`hub-h2-card hub-h2-site ${siteClass(door.site)}`}>
      <div aria-hidden="true" className={`hub-h2-site-media${image ? ' hub-h2-site-media-img' : ''}`}>
        {image ? (
          <SlotImage asset={image} width={120} height={216} className="hub-h2-ph-img" />
        ) : (
          <span lang={door.site === 'kpop' ? 'ko' : 'ja'} className="hub-h2-vt">{door.site === 'kpop' ? ht('hp.site.vtKpop') : ht('hp.site.vtAnime')}</span>
        )}
      </div>
      <div className="hub-h2-site-body">
        <div className="hub-h2-site-top">
          <h3 className="hub-h2-h3"><a href={home} className="hub-h2-site-link">{name.head}<span className="hub-h2-tail">{name.tail}</span></a></h3>
          <span className="hub-h2-meta hub-h2-num">{door.count}</span>
        </div>
        <p className="hub-h2-body">{door.tagline}</p>
        {door.spotlight ? (
          <p className="hub-h2-spot">
            <span className="hub-h2-meta">{spotLabel(door.spotlight.label)}</span>
            <a href={homeUrl({ site: door.site, path: door.spotlight.path })} className="hub-h2-ql">{door.spotlight.title}</a>
          </p>
        ) : null}
        <div className="hub-h2-site-cta">
          <a href={home} className="hub-h2-cta hub-h2-cta-site hub-h2-btn">{door.site === 'kpop' ? ht('hp.sites.browseKpop') : ht('hp.sites.browseAnime')}<ArrowIcon /></a>
          <span className="hub-h2-meta hub-h2-num">{siteAddress(siteConfig(door.site))}</span>
        </div>
      </div>
    </article>
  );
}

export function HomeSites({ doors, assets }: { doors: readonly HomeDoor[]; assets: HomeAssets }): React.ReactElement {
  return (
    <section aria-labelledby="sides-h" className="hub-h2-band hub-h2-wrap">
      <div className="hub-h2-bhead">
        <div>
          <h2 id="sides-h" className="hub-h2-h2">{ht('hp.sites.title')}</h2>
          <p className="hub-h2-body">{ht('hp.sites.sub')}</p>
        </div>
      </div>
      <div className="hub-h2-sites">
        {doors.map((door) => <SiteCard key={door.site} door={door} assets={assets} />)}
      </div>
    </section>
  );
}
