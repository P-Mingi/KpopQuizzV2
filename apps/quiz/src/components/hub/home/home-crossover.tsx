// Run O1, lot H2a: the Crossover block: quizzes that cross K-pop and anime, and one fact that links the two worlds.
// Home v3 (2026-10-29, Home.dc.html): the left column of the third row, light now (the dark band is gone): "When K-pop meets anime", the
// sourced fact under it, then three tiles, image first (3:2): the owner's image (site_assets) or, until there is one, a soft gradient in
// the colours of the tile's site; its site, its title and its line. Each tile links to its quiz on its own site. The fact names its source
// beside it (SEO rule 3.8), which the board leaves out; the name is a link to the source (review fix, rule 5.5).
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { FactSource, SlotImage } from './home-ui';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeAssetKey, HomeAssets } from '@/lib/site/hub/home-assets';
import type { HomeCrossover as HomeCrossoverData } from '@/lib/site/hub/home-types';

const SLOTS: readonly HomeAssetKey[] = ['cross1', 'cross2', 'cross3'];
/** The soft gradient of each tile while it has no image (three shades of its site's colours, as the board varies them). */
const SHADES = ['hub-h2-xph-1', 'hub-h2-xph-2', 'hub-h2-xph-3'] as const;

export function HomeCrossover({ data, assets }: { data: HomeCrossoverData; assets: HomeAssets }): React.ReactElement {
  return (
    <section aria-labelledby="cross-h" className="hub-h2-cross">
      <div className="hub-h2-cross-h">
        <h2 id="cross-h" className="hub-h2-h2">{ht('hp.cross.title')}</h2>
        {data.fact ? (
          <p className="hub-h2-sub">
            {data.fact}
            {data.factSource && data.factUrl ? <>{' '}<FactSource name={data.factSource} url={data.factUrl} className="hub-h2-cross-src" /></> : null}
          </p>
        ) : null}
      </div>
      <div className="hub-h2-xts">
        {data.cards.slice(0, SLOTS.length).map((card, i) => {
          const image = assets[SLOTS[i]!];
          return (
            <a key={card.title} href={homeUrl(card)} className={`hub-h2-xt ${siteClass(card.site)}`}>
              <span className={`hub-h2-ph hub-h2-xph ${SHADES[i]}`}>
                {image ? <SlotImage asset={image} width={220} height={147} className="hub-h2-ph-img" /> : null}
              </span>
              <span className="hub-h2-xbody">
                <span className="hub-h2-xsite"><span aria-hidden="true" className="hub-h2-fdot" />{siteName(card.site)}</span>
                <span className="hub-h2-xtitle">{card.title}</span>
                <span className="hub-h2-xmeta">{card.sub}</span>
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
