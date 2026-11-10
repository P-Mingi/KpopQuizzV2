// Daily games step 4: the frame of the pages of the Terrier (boards Main.dc.html and Kpopdle.dc.html): the bar with the tabs of the hub, the page, the footer. Server component; the tools are islands. The
// bar and the footer of the home speak English only, so these carry the two languages; same classes for the wordmark, so one rule draws both. No link to kpopquiz.org in the footer (rule 16).
import { HubWordmark, RabbitMark } from '@/components/hub/home/home-ui';
import { HUB_EMAIL } from '@/lib/site/hub/copy';
import { dleCopy } from '@/lib/dle/copy';
import { DAILY_PATH, localePath } from '@/lib/dle/games';
import { withBasePath } from '@/lib/site/base-path';
import { homeUrl } from '@/lib/site/hub/home-types';
import { REGISTRY } from '@/lib/site/registry';

import { dmMono, dmSans } from '@/components/hub/home/home-font';

import { DleAccount, DleLangSwitch, DleLanguage, DleLeftBadge } from './dle-tools';

import type { DleLocale } from '@/lib/dle/types';

interface DleChromeProps {
  readonly locale: DleLocale;
  /** The English path of the page; the switch and the language rule go to its twin. */
  readonly enPath: string;
  /** The Burrow itself is the current page. */
  readonly current?: boolean;
  /** The tools of the bar on the right (the game's), instead of Sign in. */
  readonly tools?: React.ReactNode;
  /** Extra classes of the root (the game's dots, the Unbounded of the marquee). */
  readonly className?: string;
  /** CR-021: the footer links /credits only when the site has an image that needs a credit (lib/credits/site-credits.ts); the pages pass the answer. */
  readonly showCredits?: boolean;
  readonly children: React.ReactNode;
}

export function DleChrome({ locale, enPath, current, tools, className, showCredits = true, children }: DleChromeProps): React.ReactElement {
  const t = dleCopy(locale);
  return (
    <div lang={locale} className={`hub-dle-root ${dmSans.variable} ${dmMono.variable}${className ? ` ${className}` : ''}`}>
      {/* The language of the document (rule 10.5): the root layout is shared, so a French page sets it as the French landings of kpopquiz.org do. */}
      {locale === 'fr' ? <script dangerouslySetInnerHTML={{ __html: "document.documentElement.lang='fr';" }} /> : null}
      <DleLanguage enPath={enPath} locale={locale} />
      <header className="hub-dle-head">
        <nav aria-label={t.navMain} className="hub-dle-nav">
          <a href={withBasePath('/')} className="hub-dle-brand">
            <RabbitMark size={36} className="hub-dle-brand-mk" />
            <HubWordmark className="hub-dle-brand-name" />
          </a>
          <div className="hub-dle-tabs">
            <a href={withBasePath('/')} className="hub-dle-tab">{t.navHome}</a>
            <a href={withBasePath(localePath(DAILY_PATH, locale))} className="hub-dle-tab hub-dle-tab-on" aria-current={current ? 'page' : 'true'}>{t.navTab}<DleLeftBadge locale={locale} /></a>
            <a href={withBasePath('/#hot')} className="hub-dle-tab">{t.navQuizzes}</a>
            <a href={withBasePath('/#today')} className="hub-dle-tab">{t.navBlind}</a>
            <a href={withBasePath('/#community')} className="hub-dle-tab">{t.navCommunity}</a>
          </div>
          <div className="hub-dle-actions">
            {tools}
            <DleLangSwitch enPath={enPath} locale={locale} />
            {tools ? null : <DleAccount locale={locale} />}
          </div>
        </nav>
      </header>
      {children}
      <footer className="hub-h2-foot">
        <div className="hub-h2-foot-in">
          <div className="hub-h2-foot-brand">
            <span className="hub-h2-foot-name"><RabbitMark size={28} className="hub-h2-foot-mk" /><HubWordmark className="hub-h2-foot-word" /></span>
            <span className="hub-h2-foot-tag">{t.footTag}</span>
          </div>
          <div className="hub-h2-foot-cols">
            <div className="hub-h2-foot-col">
              <span className="hub-h2-foot-h">{REGISTRY.hub.brand.name}</span>
              <a href={withBasePath(localePath(DAILY_PATH, locale))} className="hub-h2-foot-a">{t.navTab}</a>
              <a href={homeUrl({ site: 'anime', path: '/' })} className="hub-h2-foot-a">{REGISTRY.anime.brand.name}</a>
            </div>
            <div className="hub-h2-foot-col">
              <span className="hub-h2-foot-h">{t.footAbout}</span>
              <a href={withBasePath('/privacy')} className="hub-h2-foot-a">{t.footPrivacy}</a>
              <a href={withBasePath('/legal')} className="hub-h2-foot-a">{t.footLegal}</a>
              {showCredits ? <a href={withBasePath(localePath('/credits', locale))} className="hub-h2-foot-a">{t.footCredits}</a> : null}
              <span className="hub-h2-foot-mail">{HUB_EMAIL}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
