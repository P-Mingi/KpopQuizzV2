// Run O1, lot H2a: "Top fans this week" and the passport: the five best fans of the week on both sites; beside them the passport, which
// says what the other sites see and never see (HubShares, the same block as the privacy page) and opens the sign-in sheet, or, signed in,
// shows the level, the progress and the streak of each site. The phone board has only the passport, without the two columns.
import { HubShares } from '@/components/hub/hub-shares';
import { ht } from '@/lib/site/hub/copy';
import { homeUrl, HOME_SITES } from '@/lib/site/hub/home-types';

import { HomeSignIn } from './home-signin';
import { Dual } from './home-ui';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeFan, HomeViewer } from '@/lib/site/hub/home-types';

function Fans({ fans, viewer }: { fans: readonly HomeFan[]; viewer: HomeViewer | null }): React.ReactElement {
  return (
    <article id="top" aria-labelledby="top-h" className="hub-h2-pcard hub-h2-fans-card">
      <div className="hub-h2-pcard-head">
        <h2 id="top-h" className="hub-h2-pcard-h">{ht('hp.top.title')}</h2>
        <span className="hub-h2-pcard-sub">{ht('hp.top.both')}</span>
      </div>
      <ol className="hub-h2-fans">
        {fans.map((f, i) => (
          <li key={f.handle} className={`hub-h2-fan${viewer && f.handle === viewer.username ? ' hub-h2-fan-me' : ''}`}>
            <span className="hub-h2-fan-rank">{i + 1}</span>
            <span aria-hidden="true" className="hub-h2-fan-av">{f.handle.charAt(0).toUpperCase()}</span>
            <span className="hub-h2-fan-name">@{f.handle}</span>
            <span className="hub-h2-fan-sites" aria-label={f.onKpop && f.onAnime ? ht('hp.top.playsBoth') : ht('hp.top.playsOn', { name: siteName(f.onKpop ? 'kpop' : 'anime') })}>
              <span className={`hub-h2-fan-dot${f.onKpop ? ' hub-h2-fan-dot-k' : ''}`} />
              <span className={`hub-h2-fan-dot${f.onAnime ? ' hub-h2-fan-dot-a' : ''}`} />
            </span>
            <span className="hub-h2-fan-lv">{ht('hp.top.lv', { level: f.level })}</span>
          </li>
        ))}
      </ol>
      <a href={homeUrl({ site: 'kpop', path: '/leaderboard' })} className="hub-h2-plink hub-h2-lnk">{ht('hp.top.full')}</a>
    </article>
  );
}

function Passport({ viewer }: { viewer: HomeViewer | null }): React.ReactElement {
  if (!viewer) {
    return (
      <article id="passport" aria-labelledby="pass-h" className="hub-h2-pcard hub-h2-pcard-pass">
        <div className="hub-h2-pass">
          <h2 id="pass-h" className="hub-h2-pcard-h">{ht('hp.pass.title')}</h2>
          <p className="hub-h2-pass-p"><Dual desktop={ht('hp.pass.lede')} phone={ht('hp.pass.ledePhone')} /></p>
          <HubShares variant="home" />
          <HomeSignIn label={ht('hp.pass.cta')} sheetTitle={ht('home.signInSheetTitle')} sheetSub={ht('home.signInSheetSub')} className="hub-h2-solid-lg hub-h2-btn" />
        </div>
      </article>
    );
  }
  const joined = viewer.sitesJoined === 1 ? ht('hp.pass.joined1') : ht('hp.pass.joined', { sites: viewer.sitesJoined });
  return (
    <article id="passport" aria-labelledby="pass-h" className="hub-h2-pcard hub-h2-pcard-pass">
      <div className="hub-h2-pass">
        <div className="hub-h2-me-top">
          <span aria-hidden="true" className="hub-h2-me-big">{viewer.username.charAt(0).toUpperCase()}</span>
          <div className="hub-h2-me-id">
            <h2 id="pass-h" className="hub-h2-me-h">@{viewer.username}</h2>
            <span className="hub-h2-me-line">{ht('hp.pass.line', { level: viewer.level, joined })}</span>
          </div>
        </div>
        <div className="hub-h2-xpbar"><div className="hub-h2-xpbar-in" style={{ width: `${viewer.progress}%` }} /></div>
        <span className="hub-h2-xptext">{ht('hp.pass.toNext', { pct: viewer.progress, next: viewer.level + 1 })}</span>
        <div className="hub-h2-streaks">
          {HOME_SITES.map((site) => (
            <div key={site} className={`hub-h2-streak-box ${siteClass(site)}`}>
              <span className="hub-h2-streak-l">{siteName(site)}</span>
              <span className="hub-h2-streak-v">{viewer.streaks[site] === 1 ? ht('hp.today.streak1') : ht('hp.today.streak', { days: viewer.streaks[site] })}</span>
            </div>
          ))}
        </div>
        <a href="/passport" className="hub-h2-plink hub-h2-lnk">{ht('hp.pass.open')}</a>
      </div>
    </article>
  );
}

export function HomeCommunity({ fans, viewer }: { fans: readonly HomeFan[]; viewer: HomeViewer | null }): React.ReactElement {
  return (
    <section className="hub-h2-duo">
      <Fans fans={fans} viewer={viewer} />
      <Passport viewer={viewer} />
    </section>
  );
}
