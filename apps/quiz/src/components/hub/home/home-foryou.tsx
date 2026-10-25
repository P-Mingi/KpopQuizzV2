// Run O1, lot H2a: "For you" (signed in: continue, the next one in the fandom, the bridge to the other site) or "New here? Start easy"
// (signed out: the friendliest first quiz of each site, and a card that leads to the passport). The phone board shows Start easy as two
// plain cards.
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { HomeSignIn } from './home-signin';
import { Dual } from './home-ui';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeForYou as HomeForYouData, HomeForYouCard, HomeViewer } from '@/lib/site/hub/home-types';

function Card({ card, bridge, phoneShort }: { card: HomeForYouCard; bridge: boolean; phoneShort: boolean }): React.ReactElement {
  const full = ht('hp.you.label', { label: card.label, name: siteName(card.site) });
  return (
    <a href={homeUrl(card)} className={`hub-h2-fcard hub-h2-card ${siteClass(card.site)}${bridge ? ' hub-h2-fcard-bridge' : ''}`}>
      <span className="hub-h2-fl">{phoneShort ? <Dual desktop={full} phone={card.label} /> : full}</span>
      <span className="hub-h2-ft">{card.title}</span>
      {card.progress !== undefined ? (
        <>
          <span className="hub-h2-fbar"><span className="hub-h2-fbar-in" style={{ width: `${card.progress}%` }} /></span>
          <span className="hub-h2-fm">{card.meta}</span>
        </>
      ) : (
        <span className="hub-h2-fm">{card.meta}</span>
      )}
    </a>
  );
}

export function HomeForYou({ data, viewer }: { data: HomeForYouData; viewer: HomeViewer | null }): React.ReactElement {
  if (viewer) {
    return (
      <section aria-labelledby="you-h" className="hub-h2-sec">
        <div className="hub-h2-block">
          <div className="hub-h2-block-h">
            <h2 id="you-h" className="hub-h2-h2">{ht('hp.you.title', { name: viewer.username })}</h2>
            <span className="hub-h2-sub">{ht('hp.you.sub')}</span>
          </div>
          <div className="hub-h2-you-grid">
            {data.signedIn.map((card) => <Card key={card.title} card={card} bridge={card.bridge === true} phoneShort={false} />)}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="start-h" className="hub-h2-sec">
      <div className="hub-h2-block">
        <div className="hub-h2-block-h">
          <h2 id="start-h" className="hub-h2-h2">{ht('hp.start.title')}</h2>
          <span className="hub-h2-sub hub-h2-nophone">{ht('hp.start.sub')}</span>
        </div>
        <div className="hub-h2-you-grid">
          {data.signedOut.map((card) => <Card key={card.title} card={card} bridge={false} phoneShort />)}
          <div className="hub-h2-save">
            <span className="hub-h2-save-l">{ht('hp.start.saveLabel')}</span>
            <span className="hub-h2-save-t">{ht('hp.start.saveText')}</span>
            <HomeSignIn label={ht('hp.start.create')} sheetTitle={ht('home.signInSheetTitle')} sheetSub={ht('home.signInSheetSub')} className="hub-h2-solid-md hub-h2-btn" />
          </div>
        </div>
      </div>
    </section>
  );
}
