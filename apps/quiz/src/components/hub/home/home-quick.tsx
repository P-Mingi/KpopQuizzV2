// Run O1, lot H2a: "60 seconds": one playable question and the sourced facts (a K-pop one and an anime one on the desktop board, the
// anime one on the phone board), each with the way to the trivia page of its own site.
// Lot H2c: the question and each fact are left out when there is none, and the grid adapts.
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { HomeQuestion } from './home-question';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeFact, HomeQuick as HomeQuickData } from '@/lib/site/hub/home-types';

function Fact({ fact, first }: { fact: HomeFact; first: boolean }): React.ReactElement {
  const label = fact.site === 'kpop' ? ht('hp.quick.factKpop') : ht('hp.quick.factAnime');
  const more = fact.site === 'kpop' ? ht('hp.quick.moreKpop') : ht('hp.quick.moreAnime');
  return (
    <div className={`hub-h2-fact ${first ? 'hub-h2-fact-first' : ''} ${siteClass(fact.site)}`}>
      <span className="hub-h2-flabel"><span aria-hidden="true" className="hub-h2-sdot" />{label}</span>
      <p className="hub-h2-ftext">{fact.text}</p>
      <span className="hub-h2-fsrc">{ht('hp.quick.source', { source: fact.source })}<a href={homeUrl(fact)}>{more}</a></span>
    </div>
  );
}

export function HomeQuick({ quick }: { quick: HomeQuickData }): React.ReactElement {
  const q = quick.question;
  const anime = quick.facts.find((f) => f.site === 'anime');
  return (
    <section aria-labelledby="quick-h" className="hub-h2-sec">
      <div className="hub-h2-sec-h">
        <h2 id="quick-h" className="hub-h2-h2">{ht('hp.quick.title')}</h2>
        <span className="hub-h2-sub hub-h2-quick-sub">{ht('hp.quick.sub')}</span>
      </div>
      <div className="hub-h2-quick-grid">
        {q ? (
          <HomeQuestion
            site={q.site}
            text={q.text}
            options={q.options}
            correct={q.correct}
            explain={q.explain}
            explainShort={q.explainShort}
            href={homeUrl(q)}
            fromLabel={ht('hp.quick.from', { title: q.source })}
            labels={{
              question: ht('hp.quick.label'),
              right: ht('hp.quick.right'),
              wrong: ht('hp.quick.wrong'),
              markRight: ht('hp.quick.markRight'),
              markPick: ht('hp.quick.markPick'),
              again: ht('hp.quick.again'),
              full: ht('hp.quick.full', { name: siteName(q.site) }),
              fullShort: ht('hp.quick.fullShort'),
            }}
          />
        ) : null}
        {quick.facts.length > 0 ? (
          <article className="hub-h2-qcard hub-h2-nophone">
            <span className="hub-h2-ql">{ht('hp.quick.dyk')}</span>
            {quick.facts.map((f, i) => <Fact key={f.site} fact={f} first={i < quick.facts.length - 1} />)}
          </article>
        ) : null}
        {anime ? (
          <article className={`hub-h2-qcard hub-h2-dyk-m ${siteClass('anime')}`}>
            <span className="hub-h2-ql">{ht('hp.quick.dykAnime')}</span>
            <p className="hub-h2-dyk-m-p">{anime.text}</p>
            <a href={homeUrl(anime)} className="hub-h2-dyk-m-a">{ht('hp.quick.moreAnime')}</a>
          </article>
        ) : null}
      </div>
    </section>
  );
}
