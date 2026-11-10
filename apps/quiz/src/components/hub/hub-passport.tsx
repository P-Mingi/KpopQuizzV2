// The common Bunnyverse passport (bunnyverse.org/passport), server component: the total level and, per site the fan joined, the level
// and the XP earned there, each with the signed-in way to their passport on that site. Real numbers from my_passport() only.
import { HubMeAvatar } from '@/components/hub/hub-me-avatar';
import { UxPage } from '@/components/ux-v1/page';
import { passportWords as ht } from '@/lib/site/hub/passport-page';

import type { CommonPassport } from '@/lib/site/hub/passport-page';

export function HubPassport({ passport }: { passport: CommonPassport }): React.ReactElement {
  return (
    <UxPage width="text" className="hub-h1-pass">
      <div className="hub-h1-pass-top">
        {/* the fan's photo, read in the browser (components/hub/hub-me-avatar.tsx), else the initial; decorative, the name is in the H1 */}
        {passport.username ? <span aria-hidden="true" className="hub-h1-pass-av"><HubMeAvatar initial={passport.username.charAt(0).toUpperCase()} size={48} /></span> : null}
        <h1 className="hub-h1-pass-h">{passport.username ? `${ht('title')} · @${passport.username}` : ht('title')}</h1>
      </div>
      <p className="hub-h1-prose">{ht('lede')}</p>
      <p className="hub-h1-pass-total">{ht('total', { level: passport.level, name: passport.levelName, xp: passport.totalXp })}</p>
      <ul className="hub-h1-pass-list">
        {passport.sites.map((s) => (
          <li key={s.id} className="hub-h1-pass-site">
            <h2 className="hub-h1-policy-h">{s.name}</h2>
            <p className="hub-h1-pass-level">{ht('site', { level: s.level, name: s.levelName })}</p>
            <p className="hub-h1-prose">{ht('stats', { xp: s.xp, plays: s.plays, streak: s.streak })}</p>
            <a className="ux-lnk" href={s.href} rel="nofollow">{ht('open', { name: s.name })}</a>
          </li>
        ))}
      </ul>
    </UxPage>
  );
}
