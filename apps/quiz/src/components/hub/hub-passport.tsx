// The common Bunnyverse passport (bunnyverse.org/passport), server component: the total level and, per site the fan joined, the level
// and the XP earned there, each with the signed-in way to their passport on that site. Real numbers from my_passport() only.
// Owner, 2026-11-22: "make this page beautiful (UX and UI), with some of the information showing live". The page is now a hero (the
// fan, the total level in a ring, the XP to the next level), a live row (the daily games left today and, with the cards bridges on, the
// packs ready and the next free pack, both ticking in the browser), one card per site in its colour, and the Collection card. Every
// number is the one the page had; the rings and bars only draw them. Styles: styles/sites/hub/pp.css (hub-pp-*).
import { HubMeAvatar } from '@/components/hub/hub-me-avatar';
import { UxPage } from '@/components/ux-v1/page';
import { passportWords as ht } from '@/lib/site/hub/passport-page';

import { HubPassportLive } from './hub-passport-live';

import type { CommonPassport, PassportSiteRow } from '@/lib/site/hub/passport-page';

const fmt = (n: number): string => n.toLocaleString('en-US');

/** A ring drawn from a percentage (0 to 100): the track and the arc. Decorative: the same number is in the words beside it. */
function Ring({ progress, size, stroke }: { progress: number; size: number; stroke: number }): React.ReactElement {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, progress));
  return (
    <svg aria-hidden="true" className="hub-pp-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ '--hub-pp-c': c.toFixed(2), '--hub-pp-off': (c * (1 - p / 100)).toFixed(2) } as React.CSSProperties}>
      <circle className="hub-pp-ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
      <circle className="hub-pp-ring-arc" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c.toFixed(2)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function Bar({ progress }: { progress: number }): React.ReactElement {
  return <span aria-hidden="true" className="hub-pp-bar"><span style={{ '--hub-pp-p': `${Math.max(0, Math.min(100, progress))}%` } as React.CSSProperties} /></span>;
}

const FLAME = 'M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.4 1.2-4 2.5-5.2.2 1.7 1 2.7 2 3.2-.4-3.4.5-6.4.5-9z';

function SiteCard({ s }: { s: PassportSiteRow }): React.ReactElement {
  return (
    <li className={`hub-pp-site hub-pp-${s.id}`}>
      <div className="hub-pp-site-top">
        <span className="hub-pp-stamp">
          <Ring progress={s.progress} size={64} stroke={5} />
          <span className="hub-pp-stamp-n">{s.level}</span>
        </span>
        <div className="hub-pp-site-name">
          <h2 className="hub-pp-h2">{s.name}</h2>
          <p className="hub-pp-title">{ht('site', { level: s.level, name: s.levelName })}</p>
        </div>
      </div>
      <Bar progress={s.progress} />
      <p className="hub-pp-meta">{ht('toNext', { xp: fmt(s.xpToNext), next: s.level + 1 })}</p>
      <dl className="hub-pp-stats">
        <div><dt>{ht('statXp')}</dt><dd className="hub-pp-num">{fmt(s.xp)}</dd></div>
        <div><dt>{ht('statPlays')}</dt><dd className="hub-pp-num">{fmt(s.plays)}</dd></div>
        <div>
          <dt>{ht('statStreak')}</dt>
          <dd className={`hub-pp-num${s.streak > 0 ? ' hub-pp-hot' : ''}`}>
            {s.streak > 0 ? <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={FLAME} /></svg> : null}
            {fmt(s.streak)}
          </dd>
        </div>
      </dl>
      <a className="hub-pp-cta" href={s.href} rel="nofollow">
        {ht('open', { name: s.name })}
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </a>
    </li>
  );
}

export function HubPassport({ passport, collection }: { passport: CommonPassport; collection?: React.ReactElement }): React.ReactElement {
  const initial = (passport.username ?? '?').charAt(0).toUpperCase();
  return (
    <UxPage width="wide" className="hub-pp-page">
      <section className="hub-pp-hero" aria-labelledby="hub-pp-h">
        <span className="hub-pp-me">
          <Ring progress={passport.progress} size={112} stroke={6} />
          {/* the fan's photo, read in the browser (components/hub/hub-me-avatar.tsx), else the initial; decorative, the name is in the H1 */}
          <span aria-hidden="true" className="hub-pp-av"><HubMeAvatar initial={initial} size={88} /></span>
          <span className="hub-pp-me-lv">{passport.level}</span>
        </span>
        <div className="hub-pp-hero-text">
          {passport.username ? <p className="hub-pp-eyebrow">{ht('eyebrow')}</p> : null}
          <h1 id="hub-pp-h" className="hub-pp-h1">{passport.username ? `@${passport.username}` : ht('title')}</h1>
          <p className="hub-pp-chips">
            <span className="hub-pp-chip">{ht('levelChip', { level: passport.level })}</span>
            <span className="hub-pp-chip hub-pp-chip-soft">{passport.levelName}</span>
          </p>
          <p className="hub-pp-total"><span className="hub-pp-num">{fmt(passport.totalXp)}</span> {ht('inAll')}</p>
          <Bar progress={passport.progress} />
          <p className="hub-pp-meta">{ht('toNext', { xp: fmt(passport.xpToNext), next: passport.level + 1 })}</p>
        </div>
      </section>
      <p className="hub-pp-lede">{ht('lede')}</p>

      <section className="hub-pp-band" aria-labelledby="hub-pp-live-h">
        <h2 id="hub-pp-live-h" className="hub-pp-bandh">{ht('liveH')}</h2>
        <HubPassportLive
          cards={!!collection}
          words={{
            live: ht('live'), dailyH: ht('dailyH'), dailyLeft: ht('dailyLeft'), dailyDone: ht('dailyDone'), dailyReset: ht('dailyReset'), dailyCta: ht('dailyCta'),
            packsH: ht('packsH'), packsReady: ht('packsReady'), packsReady1: ht('packsReady1'), packsNone: ht('packsNone'), packsNext: ht('packsNext'), packsFull: ht('packsFull'), packsCta: ht('packsCta'),
          }}
        />
      </section>

      <section className="hub-pp-band" aria-labelledby="hub-pp-sites-h">
        <h2 id="hub-pp-sites-h" className="hub-pp-bandh">{ht('sitesH')}</h2>
        <ul className="hub-pp-sites">
          {passport.sites.map((s) => <SiteCard key={s.id} s={s} />)}
        </ul>
      </section>

      {collection ?? null}
    </UxPage>
  );
}
