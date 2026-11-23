// KpopCards (lot SEO-LAUNCH-1, lane B): the server HTML of the three indexable pages: the H1 and the answer block at the top of /kpopcards, the question
// H2s under the lobby, the one-line disclaimer, the odds answer block and the JSON-LD. Server components, no state: Googlebot reads the same words a guest does
// (the lobby below is client-rendered from /api/cards, which robots.txt closes). Texts and numbers come from lib/kpopcards/seo.ts.
import Link from 'next/link';

import { kcPath } from '@/lib/cards/kc-paths';
import { jsonLdString } from '@/lib/seo/json-ld';
import {
  CARDS_H1, CARDS_ODDS_CHANGED, DISCLAIMER, cardsJsonLd, landingAnswer, landingQuestions, longDate, oddsAnswer,
} from '@/lib/kpopcards/seo';

import type { CardsPageKey, CardsStats } from '@/lib/kpopcards/seo';
import type { CatalogOdds } from '@/lib/cards/types';

/** The JSON-LD blocks of a page (parsed by the test, equal to the visible text). */
export function CardsJsonLd({ page, stats = null }: { page: CardsPageKey; stats?: CardsStats | null }): React.ReactElement {
  return <>{cardsJsonLd(page, stats).map((d, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(d) }} />)}</>;
}

/** The top of /kpopcards for every visitor: the one H1 and the 59-word answer block. The lobby ("Your packs", an H2) follows. */
export function CardsIntro({ stats }: { stats: CardsStats | null }): React.ReactElement {
  return (
    <header className="wrap kc-intro" id="kc-intro" style={{ textAlign: 'center', paddingTop: 18 }}>
      <h1 className="h1" id="t-kpopcards">{CARDS_H1.landing}</h1>
      <p className="lede" id="kc-answer" style={{ margin: '8px auto 0', maxWidth: 640 }}>{landingAnswer(stats)}</p>
    </header>
  );
}

/** Under the lobby: the question H2s, each answered in its first sentence, the links to the odds, the rules and the credits, and the disclaimer. */
export function CardsQuestions(): React.ReactElement {
  return (
    <section className="wrap help kc-questions" id="kc-questions" aria-label="About KpopCards">
      {landingQuestions().map((x) => (
        <div key={x.id} id={`kc-${x.id}`}>
          <h2>{x.q}</h2>
          <p>{x.lead}</p>
          {x.id === 'how' ? <ol>{x.more.map((m) => <li key={m}>{m}</li>)}</ol> : x.more.map((m) => <p key={m}>{m}</p>)}
        </div>
      ))}
      <p id="kc-links">
        <Link href={kcPath.odds}>KpopCards odds and drop rates</Link>
        {' · '}
        <Link href={kcPath.help}>How KpopCards works</Link>
        {' · '}
        <Link href="/credits">Photo credits</Link>
      </p>
      <p className="hint" id="kc-disclaimer">{DISCLAIMER}</p>
    </section>
  );
}

/** The top of /kpopcards/odds: the answer block computed from the odds, the date the rates last changed, and the links to the neighbours. */
export function OddsIntro({ odds }: { odds: CatalogOdds | null }): React.ReactElement {
  return (
    <>
      <h1 className="h1" id="t-odds">{CARDS_H1.odds}</h1>
      <p className="lede" id="odds-answer">{oddsAnswer(odds)}</p>
      <p className="hint" id="odds-updated">{`Updated ${longDate(CARDS_ODDS_CHANGED)}`}</p>
    </>
  );
}

export function OddsLinks(): React.ReactElement {
  return (
    <p id="odds-links" style={{ marginTop: 18 }}>
      <Link href={kcPath.lobby}>KpopCards, the free photocard game</Link>
      {' · '}
      <Link href={kcPath.help}>How KpopCards works</Link>
      {' · '}
      <Link href="/credits">Photo credits</Link>
    </p>
  );
}
