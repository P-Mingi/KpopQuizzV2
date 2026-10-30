// Run O1, lot H2a: "Top fans this week" and the passport, which says what the other sites see and never see (HubShares, the same block as
// the privacy page) and opens the sign-in sheet, or, signed in, shows the passport of the fan.
// Lot H2c: the board is left out while no fan has made a profile public; the passport then takes the column.
// Home v3 (2026-10-29, Home.dc.html): the right column of the third row. Top fans per site, as rows (rank, initial, handle, level when it is
// public), with K-pop and Anime tabs and the fan's own row marked; then the passport: signed out, the rabbit, the promise and Sign in (the
// block of what other sites see and never see stays one click away, word for word the privacy page's); signed in, the level of each site
// the fan joined and the way to the next one; its heading is the link to the fan's passport page (/passport).
import { HubShares } from '@/components/hub/hub-shares';
import { ht } from '@/lib/site/hub/copy';

import { HomeFans } from './home-fans';
import { HomeSignIn } from './home-signin';
import { RabbitMark } from './home-ui';
import { PASSPORT_PATH, siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeFans as HomeFansData, HomeViewer } from '@/lib/site/hub/home-types';

function Passport({ viewer, heading }: { viewer: HomeViewer | null; heading: 'h2' | 'h3' }): React.ReactElement {
  const H = heading;
  if (!viewer) {
    return (
      <div id="passport" className="hub-h2-pass">
        <div className="hub-h2-pass-out">
          <RabbitMark size={48} className="hub-h2-pass-mk" />
          <span className="hub-h2-pass-body">
            <H className="hub-h2-pass-h">{ht('hp.pass.title')}</H>
            <span className="hub-h2-pass-p">{ht('hp.pass.lede')}</span>
          </span>
          <HomeSignIn label={ht('hp.pass.cta')} sheetTitle={ht('home.signInSheetTitle')} sheetSub={ht('home.signInSheetSub')} className="hub-h2-pass-cta hub-h2-btn" />
        </div>
        <details className="hub-h2-pass-shares">
          <summary className="hub-h2-pass-sum">{ht('hp.pass.shares')}</summary>
          <HubShares variant="home" />
        </details>
      </div>
    );
  }
  const sites = (['kpop', 'anime'] as const).filter((s) => viewer.sites[s]);
  return (
    <div id="passport" className="hub-h2-pass hub-h2-pass-in">
      <H className="hub-h2-pass-h"><a href={PASSPORT_PATH} className="hub-h2-pass-link">{ht('hp.pass.mine', { name: viewer.username })}</a></H>
      {sites.map((s) => {
        const lv = viewer.sites[s]!;
        return (
          <div key={s} className={`hub-h2-pass-site ${siteClass(s)}`}>
            <span className="hub-h2-pass-row">
              <span className="hub-h2-pass-name">{ht('hp.pass.site', { name: siteName(s), level: lv.level })}</span>
              <span className="hub-h2-pass-next">{ht('hp.pass.toNext', { pct: lv.progress, next: lv.level + 1 })}</span>
            </span>
            <span aria-hidden="true" className="hub-h2-bar"><span className="hub-h2-bar-in" style={{ width: `${lv.progress}%` }} /></span>
          </div>
        );
      })}
    </div>
  );
}

export function HomeCommunity({ fans, viewer, hasFans }: { fans: HomeFansData; viewer: HomeViewer | null; hasFans: boolean }): React.ReactElement {
  return (
    <aside id="fans" aria-labelledby={hasFans ? 'top-h' : undefined} aria-label={hasFans ? undefined : ht('hp.pass.title')} className="hub-h2-fans">
      {hasFans ? (
        <HomeFans
          fans={fans}
          me={viewer?.username ?? null}
          labels={{ title: ht('hp.top.title'), group: ht('hp.top.site'), kpop: ht('hp.top.kpop'), anime: ht('hp.top.anime'), lv: ht('hp.top.lv', { level: '{level}' }) }}
        />
      ) : null}
      <Passport viewer={viewer} heading={hasFans ? 'h3' : 'h2'} />
    </aside>
  );
}
