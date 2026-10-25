// Run O1, lot H2a: "Today": the quiz of the day of each site, the blindtest of the day (KpopQuiz, audio only), the debate of the day.
// Streaks show when signed in. On the phone board the cards are a rail to swipe, with no debate and no player.
import { ht } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';

import { HomeBlindtest } from './home-blindtest';
import { HomeCountdown } from './home-countdown';
import { ChatIcon, NoteIcon } from './home-icons';
import { Dual } from './home-ui';
import { siteName } from './home-names';
import { siteClass } from './site-class';

import type { HomeSite, HomeToday as HomeTodayData, HomeViewer } from '@/lib/site/hub/home-types';

function streakText(days: number): string {
  return days === 1 ? ht('hp.today.streak1') : ht('hp.today.streak', { days });
}

export function HomeToday({ today, viewer }: { today: HomeTodayData; viewer: HomeViewer | null }): React.ReactElement {
  const bt = today.blindtest;
  const btName = siteName(bt.site);
  const streak = (site: HomeSite): number => viewer?.streaks[site] ?? 0;
  return (
    <section id="today" aria-labelledby="today-h" className="hub-h2-sec hub-h2-today">
      <div className="hub-h2-sec-h">
        <h2 id="today-h" className="hub-h2-h2">{ht('hp.today.title')}</h2>
        <HomeCountdown template={ht('hp.today.resets', { time: '{time}' })} fallback={ht('hp.today.resetsFallback')} />
        <span className="hub-h2-swipe hub-h2-phoneonly">{ht('hp.today.swipe')}</span>
      </div>
      <div className="hub-h2-today-grid">
        {today.quizzes.map((q) => (
          <article key={q.site} className={`hub-h2-tcard hub-h2-card ${siteClass(q.site)}`}>
            <div className="hub-h2-tcard-head">
              <span className="hub-h2-qlabel"><span aria-hidden="true" className="hub-h2-sdot" />{ht('hp.today.qotd')}</span>
              {viewer && streak(q.site) > 0 ? <span className="hub-h2-streak">{streakText(streak(q.site))}</span> : null}
            </div>
            <h3 className="hub-h2-tcard-h">{q.title}</h3>
            <p className="hub-h2-tcard-meta"><Dual desktop={ht('hp.today.meta', { name: siteName(q.site), meta: q.meta })} phone={q.meta} /></p>
            <a href={homeUrl(q)} className="hub-h2-play hub-h2-btn"><Dual desktop={ht('hp.today.play')} phone={ht('hp.today.playShort')} /></a>
          </article>
        ))}

        <article className={`hub-h2-tcard hub-h2-tcard-bt ${siteClass(bt.site)}`}>
          <span className="hub-h2-qlabel"><NoteIcon />{ht('hp.today.btLabel')}</span>
          <h3 className="hub-h2-tcard-h">{ht('hp.today.btTitle', { songs: bt.songs, seconds: bt.seconds })}</h3>
          <p className="hub-h2-tcard-meta"><Dual desktop={ht('hp.today.btMeta', { name: btName })} phone={ht('hp.today.btMetaPhone', { name: btName })} /></p>
          <HomeBlindtest
            songs={bt.songs}
            seconds={bt.seconds}
            labels={{
              playAria: ht('hp.bt.playAria', { seconds: bt.seconds }),
              pauseAria: ht('hp.bt.pauseAria'),
              press: ht('hp.bt.press', { songs: bt.songs }),
              playing: ht('hp.bt.playing', { songs: bt.songs, seconds: bt.seconds, sec: '{sec}' }),
              done: ht('hp.bt.done', { rest: '{rest}', name: btName }),
            }}
          />
          <a href={homeUrl(bt)} className="hub-h2-guess">{ht('hp.bt.guess', { songs: bt.songs })}</a>
          <a href={homeUrl(bt)} className="hub-h2-listen hub-h2-btn">{ht('hp.bt.listen')}</a>
        </article>

        <article className="hub-h2-tcard hub-h2-card hub-h2-tcard-debate">
          <span className="hub-h2-qlabel hub-h2-qlabel-muted"><ChatIcon />{ht('hp.today.debateLabel')}</span>
          <h3 className="hub-h2-tcard-h">{today.debate.title}</h3>
          <p className="hub-h2-tcard-meta">{ht('hp.today.debateMeta', { name: siteName(today.debate.site) })}</p>
          <a href={homeUrl(today.debate)} className="hub-h2-vote hub-h2-btn">{ht('hp.today.vote')}</a>
        </article>
      </div>
    </section>
  );
}
