// Run O1, lot H2a: the Crossover block, the one dark block of the page: quizzes that cross K-pop and anime, and one fact that links the
// two worlds. The phone board shows two cards and no fact.
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { siteName } from './home-names';

import type { HomeCrossover as HomeCrossoverData } from '@/lib/site/hub/home-types';

export function HomeCrossover({ data }: { data: HomeCrossoverData }): React.ReactElement {
  return (
    <section aria-labelledby="cross-h" className="hub-h2-xsec">
      <div className="hub-h2-x">
        <div className="hub-h2-x-head">
          <div className="hub-h2-x-col">
            <span className="hub-h2-x-eyebrow">{ht('hp.cross.eyebrow')}</span>
            <h2 id="cross-h" className="hub-h2-h2">{ht('hp.cross.title')}</h2>
          </div>
          <span className="hub-h2-x-fact">{data.fact}</span>
        </div>
        <div className="hub-h2-x-grid">
          {data.cards.map((card) => (
            <a key={card.title} href={homeUrl(card)} className={`hub-h2-xcard hub-h2-card ${card.site === 'kpop' ? 'hub-h2-xs-k' : 'hub-h2-xs-a'}`}>
              <span className="hub-h2-xl"><span aria-hidden="true" className="hub-h2-xdot" />{siteName(card.site)}</span>
              <span className="hub-h2-xt">{card.title}</span>
              <span className="hub-h2-xs">{card.sub}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
