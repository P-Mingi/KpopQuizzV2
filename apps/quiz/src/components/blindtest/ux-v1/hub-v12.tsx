import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { ThemeCard, ThemeRail } from '@/components/ux-v1/theme-card';
import { LANDING_COPY, LANDING_LANGS, LANDING_PATH } from '@/lib/growth/bt-landing';

import type { ThemeCardCopy } from '@/lib/growth/bt-themes';

// What /blindtest gains with the V12 flag (SYSTEM.md 4; prototype #blindtest): the
// Playlists rail under the hero, the live band after "Ways to play", the language
// row at the foot. Server components, rendered by hub.tsx only when isUxV12(); the
// hub's H1, intro, FAQ, JSON-LD, metadata and its en / pt-BR hreflang pair are not
// touched, and every link the v11 hub has is still there.

/** The themed playlists as cover cards. Hidden when there is none to show. */
export function BtHubPlaylists({ cards }: { cards: readonly ThemeCardCopy[] }): React.ReactElement | null {
  if (cards.length === 0) return null;
  return (
    <section className="ux-sec" aria-labelledby="g3-pl-h">
      <SectionHeader id="g3-pl-h" title="Playlists" icon="layers" action={{ href: LANDING_PATH.en, label: 'Play in your language' }} />
      <ThemeRail id="bt-th">
        {cards.map((c) => <ThemeCard key={c.href} href={c.href} name={c.name} sub={c.sub} lead={c.lead} cover={c.cover} />)}
      </ThemeRail>
    </section>
  );
}

/** The live mode band: host on one screen (/live), join from a phone (/join). */
export function BtHubLiveBand(): React.ReactElement {
  return (
    <section className="ux-sec" aria-labelledby="g3-live-h">
      <div className="g3-liveband" data-ux="liveband">
        <div>
          <span className="ux-kicker"><Icon name="users" />Live mode <span className="ux-badge-new">New</span></span>
          <h2 id="g3-live-h">Play live with friends</h2>
          <p>One screen hosts, everyone plays on their phone. Scan the code, pick a name, and the fastest right answer wins. Perfect for a party, a class or a stream.</p>
          <div className="g3-actions">
            <UxButton href="/live" size="lg" icon="play" prefetch={false}>Host a live blindtest</UxButton>
            <UxButton href="/join" variant="ghost" size="lg" prefetch={false}>Join with a code</UxButton>
          </div>
        </div>
        <div className="g3-lvart" aria-hidden="true">
          <div className="g3-lvscr"><i className="ux-c-a" /><i className="ux-c-b" /><i className="ux-c-c" /><i className="ux-c-d" /></div>
          <div className="g3-lvp"><i className="ux-c-a" /><i className="ux-c-b" /><i className="ux-c-c" /><i className="ux-c-d" /></div>
        </div>
      </div>
    </section>
  );
}

/** "Play in your language": one link per landing, each named by its own H1. */
export function BtHubLangRow(): React.ReactElement {
  return (
    <p className="g3-langrow" data-ux="langrow">
      <span>Play in your language:</span>
      {LANDING_LANGS.map((l) => (
        <a key={l} href={LANDING_PATH[l]} hrefLang={l} lang={l}>{LANDING_COPY[l].h1Text}</a>
      ))}
    </p>
  );
}
