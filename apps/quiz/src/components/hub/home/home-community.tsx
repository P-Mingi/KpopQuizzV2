// Run O1, lot H2a: "Top fans this week" and the passport, which says what the other sites see and never see (HubShares, the same block as
// the privacy page) and opens the sign-in sheet, or, signed in, shows the passport of the fan.
// Lot H2c: the board is left out while no fan has made a profile public; the passport then takes the column.
// Home v4 (2026-11-10, HOME-AUDIT.md S6, validated prototype): the Community band (id "community"): the debate of the day and Top fans this week,
// two cards. The passport left this block: the account card (guest) and "Your day" (signed in) are in the hero. A card whose data is missing
// is left out, and the band with it when both are (its tab then leaves the top bar too). The debate is a link to its page on its site; the
// prototype's Agree and Disagree buttons do not exist as data, so the card offers "Vote" there.
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { HomeFans } from './home-fans';
import { ArrowIcon } from './home-icons';
import { Mark } from './home-today';
import { PASSPORT_PATH } from './home-names';

import type { LiveIcons } from '@/lib/photos/icons-read';
import type { HomeAssets } from '@/lib/site/hub/home-assets';
import type { HomeDebate, HomeFans as HomeFansData, HomeViewer } from '@/lib/site/hub/home-types';

/** What the band shows: its sentence follows what it has. */
export function communitySub(hasDebate: boolean, hasFans: boolean): string | null {
  return hasDebate && hasFans ? ht('hp.comm.subBoth') : hasDebate ? ht('hp.comm.subDebate') : hasFans ? ht('hp.comm.subFans') : null;
}

export function HomeCommunity({ fans, viewer, debate, assets, icons }: { fans: HomeFansData; viewer: HomeViewer | null; debate: HomeDebate | null; assets: HomeAssets; icons: LiveIcons }): React.ReactElement | null {
  const hasFans = fans.kpop.length > 0 || fans.anime.length > 0;
  const sub = communitySub(debate !== null, hasFans);
  if (sub === null) return null;
  return (
    <section id="community" aria-labelledby="community-h" className="hub-h2-band hub-h2-wrap">
      <div className="hub-h2-bhead">
        <div>
          <h2 id="community-h" className="hub-h2-h2">{ht('hp.comm.title')}</h2>
          <p className="hub-h2-body">{sub}</p>
        </div>
      </div>
      <div className="hub-h2-comm">
        {debate ? (
          <article aria-labelledby="debate-h" className="hub-h2-card hub-h2-debate">
            <div className="hub-h2-debate-top">
              <span aria-hidden="true" className="hub-h2-th hub-h2-th-48"><Mark assetKey="debate" assets={assets} icons={icons} size={48} /></span>
              <div>
                <h3 id="debate-h" className="hub-h2-h3">{ht('hp.today.debate')}</h3>
                <p className="hub-h2-meta">{ht('hp.comm.debateSub')}</p>
              </div>
            </div>
            <p className="hub-h2-quote">{debate.title}</p>
            <a href={homeUrl(debate)} className="hub-h2-cta hub-h2-cta-line hub-h2-btn">{ht('hp.today.vote')}<ArrowIcon /></a>
          </article>
        ) : null}
        {hasFans ? (
          <article aria-labelledby="top-h" className="hub-h2-card hub-h2-fans">
            <HomeFans
              fans={fans}
              me={viewer?.username ?? null}
              labels={{ title: ht('hp.top.title'), group: ht('hp.top.site'), kpop: ht('hp.top.kpop'), anime: ht('hp.top.anime'), lv: ht('hp.top.lv', { level: '{level}' }), you: ht('hp.top.you') }}
            />
            {viewer ? <a href={PASSPORT_PATH} className="hub-h2-tl">{ht('hp.comm.fansOpen')}<ArrowIcon /></a> : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
