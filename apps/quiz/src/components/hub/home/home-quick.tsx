// Run O1, lot H2a: "60 seconds": one playable question and the sourced facts, a K-pop one and an anime one.
// Lot H2c: the question and each fact are left out when there is none.
// Home v3 (2026-10-29, Home.dc.html): the right column of the second row. "60 seconds" (the quiz the question comes from, the question, its
// four answers as rows A to D, the story after the pick and the way to the full quiz), then "Did you know": the facts as rows, each with its
// subject (the group or series it is about) and its source, linked. With no question the facts stand alone under their own heading.
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { HomeQuestion } from './home-question';
import { FactSource } from './home-ui';
import { siteClass } from './site-class';

import type { HomeQuick as HomeQuickData } from '@/lib/site/hub/home-types';

export function HomeQuick({ quick }: { quick: HomeQuickData }): React.ReactElement {
  const q = quick.question;
  const facts = quick.facts.length > 0 ? (
    <ul className="hub-h2-lines">
      {quick.facts.map((f) => (
        <li key={f.site} className={`hub-h2-fact ${siteClass(f.site)}`}>
          <span className="hub-h2-fact-subj"><span aria-hidden="true" className="hub-h2-fdot" />{f.subject}</span>
          <span className="hub-h2-fact-t">{f.text}</span>
          <FactSource name={f.source} url={f.sourceUrl} className="hub-h2-fsrc" />
        </li>
      ))}
    </ul>
  ) : null;
  return (
    <aside aria-labelledby="quick-h" className="hub-h2-quick">
      {q ? (
        <>
          <div className="hub-h2-quick-h">
            <h2 id="quick-h" className="hub-h2-h2">{ht('hp.quick.title')}</h2>
            <p className="hub-h2-sub">{ht('hp.quick.sub')}</p>
          </div>
          <p className={`hub-h2-qfrom ${siteClass(q.site)}`}><span aria-hidden="true" className="hub-h2-fdot" />{ht('hp.quick.from', { title: q.source })}</p>
          <HomeQuestion
            text={q.text}
            options={q.options}
            correct={q.correct}
            explain={q.explain}
            href={homeUrl(q)}
            labels={{
              right: ht('hp.quick.right'),
              wrong: ht('hp.quick.wrong'),
              markRight: ht('hp.quick.markRight'),
              markPick: ht('hp.quick.markPick'),
              again: ht('hp.quick.again'),
              full: ht('hp.quick.full'),
            }}
          />
          {facts ? <p className="hub-h2-glabel hub-h2-dyk">{ht('hp.quick.dyk')}</p> : null}
        </>
      ) : (
        <h2 id="quick-h" className="hub-h2-h2">{ht('hp.quick.dyk')}</h2>
      )}
      {facts}
    </aside>
  );
}
