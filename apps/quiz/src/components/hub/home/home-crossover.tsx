// Run O1, lot H2a: the Crossover block: quizzes that cross K-pop and anime, and one fact that links the two worlds.
// Home v3 (2026-10-29, Home.dc.html): the left column of the third row, light now (the dark band is gone): "When K-pop meets anime", the
// sourced fact under it, then three tiles, image first (3:2): the owner's image (site_assets) or, until there is one, a soft gradient in
// the colours of the tile's site; its site, its title and its line. Each tile links to its quiz on its own site. The fact names its source
// beside it (SEO rule 3.8), which the board leaves out; the name is a link to the source (review fix, rule 5.5).
// Home v4 (2026-11-10, HOME-AUDIT.md S5 and P0-4, validated prototype): a full-width band, the fact as its line, and one tile pattern: a contained
// card with the site chip, the title (the stretched link), the line and "Play quiz". A 3:2 image sits on top ONLY when the owner filled the slot
// (home:cross-1 to home:cross-3); with the slot empty there is no image area at all, only the small brand tile.
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { ArrowIcon, ShuffleIcon } from './home-icons';
import { FactSource, SlotImage } from './home-ui';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeAssetKey, HomeAssets } from '@/lib/site/hub/home-assets';
import type { HomeCrossover as HomeCrossoverData } from '@/lib/site/hub/home-types';

const SLOTS: readonly HomeAssetKey[] = ['cross1', 'cross2', 'cross3'];

export function HomeCrossover({ data, assets }: { data: HomeCrossoverData; assets: HomeAssets }): React.ReactElement {
  return (
    <section aria-labelledby="cross-h" className="hub-h2-band hub-h2-wrap">
      <div className="hub-h2-bhead">
        <div>
          <h2 id="cross-h" className="hub-h2-h2">{ht('hp.cross.title')}</h2>
          {data.fact ? (
            <p className="hub-h2-body">
              {data.fact}
              {data.factSource && data.factUrl ? <>{' '}<FactSource name={data.factSource} url={data.factUrl} className="hub-h2-meta" /></> : null}
            </p>
          ) : null}
        </div>
      </div>
      <ul className="hub-h2-xts">
        {data.cards.slice(0, SLOTS.length).map((card, i) => {
          const image = assets[SLOTS[i]!];
          return (
            <li key={card.title} className={`hub-h2-card hub-h2-xt ${siteClass(card.site)}`}>
              {image ? (
                <span aria-hidden="true" className="hub-h2-xph"><SlotImage asset={image} width={220} height={147} className="hub-h2-ph-img" /></span>
              ) : null}
              <span className="hub-h2-xbody">
                <span className="hub-h2-xtop">
                  <span aria-hidden="true" className="hub-h2-xmark"><ShuffleIcon /></span>
                  <span className="hub-h2-chip hub-h2-chip-s"><span aria-hidden="true" className="hub-h2-sdot hub-h2-sdot-s" />{siteName(card.site)}</span>
                </span>
                <h3 className="hub-h2-h3"><a href={homeUrl(card)} className="hub-h2-stretch">{card.title}</a></h3>
                <span className="hub-h2-body">{card.sub}</span>
                <span className="hub-h2-verb">{ht('hp.cross.play')}<ArrowIcon /></span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
