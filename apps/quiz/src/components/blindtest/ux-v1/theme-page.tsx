import Link from 'next/link';

import { UxButton } from '@/components/ux-v1/button';
import { Icon } from '@/components/ux-v1/icon';
import { UxPage } from '@/components/ux-v1/page';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { ThemeCard, ThemeRail } from '@/components/ux-v1/theme-card';
import { getThemeState, getThemeTracks } from '@/lib/growth/bt-data';
import { LANDING_COPY, SITE } from '@/lib/growth/bt-landing';
import { BT_STRINGS_EN } from '@/lib/growth/bt-strings';
import { KPDH_ID, themeCard, visibleThemes } from '@/lib/growth/bt-themes';
import { modeRun } from '@/lib/ux-v1/p6/modes';
import { jsonLdScript } from '@/lib/verse/jsonld';

import { BtModeControllerLoader, BtModeErrorLoader, BtThemePlayLoader } from './mode-loader';

import type { BtTheme } from '@/lib/growth/bt-themes';
import type { Metadata } from 'next';

// A V12 themed playlist page, /blindtest/<theme> (SYSTEM.md 4; prototype view
// `btpl`): the breadcrumb, the hero (typographic cover, H1, lead, Play, Play it
// live), the KPop Demon Hunters bridge card, the songs of the playlist, more
// playlists. Server component: everything a crawler reads is in the HTML. Play
// starts the v11 day-mode game in place with generate's playlist of the same id
// (lib/ux-v1/p6/modes.ts), exactly like a v11 mode page.
//
// Only rendered for a themed mode that is playable (the route answers 404 for a
// theme under 10 songs, and for every themed id with the flag off).
//
// KPop Demon Hunters: text and audio only. The cover is typographic like every
// other; there is no poster, still, character art or logo anywhere on the page.

/** Title, description and canonical of a theme page (a new URL: no v11 field to keep). */
export function themeMetadata(theme: BtTheme): Metadata {
  return {
    title: theme.h1,
    description: theme.lead,
    alternates: { canonical: `/blindtest/${theme.id}` },
    openGraph: { title: theme.h1, description: theme.lead, url: `/blindtest/${theme.id}` },
  };
}

function breadcrumbJsonLd(theme: BtTheme): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Blind Test', item: `${SITE}/blindtest` },
      { '@type': 'ListItem', position: 3, name: theme.name, item: `${SITE}/blindtest/${theme.id}` },
    ],
  };
}

export async function BlindtestThemeV12({ theme }: { theme: BtTheme }): Promise<React.ReactElement> {
  const [state, tracks] = await Promise.all([getThemeState(), getThemeTracks(theme.id)]);
  const fmt = { num: BT_STRINGS_EN.num, songsCount: LANDING_COPY.en.songsCount };
  const own = themeCard(theme, 'en', state.counts, fmt);
  const count = state.counts[theme.id];
  const more = visibleThemes(state.playable).filter((t) => t.id !== theme.id).slice(0, 6).map((t) => themeCard(t, 'en', state.counts, fmt));
  const preset = modeRun(theme.id);
  const kpdh = theme.id === KPDH_ID;

  const page = (
    <>
      <nav className="ux-crumb" aria-label="Breadcrumb">
        <Link href="/blindtest">Blindtest</Link><span aria-hidden="true">/</span><span aria-current="page">{theme.name}</span>
      </nav>

      <section className="g3-plhero" aria-labelledby="g3-h1" data-ux="plhero">
        <div className={`g3-plcv ux-th-${theme.cover}${theme.cover === 'kpdh' ? ' is-dark' : ''}`} aria-hidden="true">
          <b>{theme.name}</b>
          {own.sub ? <small>{own.sub}</small> : null}
        </div>
        <div>
          <span className="ux-kicker"><Icon name="music" />Blindtest playlist</span>
          <h1 id="g3-h1">{theme.h1}</h1>
          <p className="g3-lead">{theme.lead}</p>
          <div className="g3-actions">
            {preset ? <BtThemePlayLoader label="Play this playlist" /> : null}
            <UxButton href="/live" variant="ghost" size="lg" icon="users" prefetch={false}>Play it live</UxButton>
          </div>
          <BtModeErrorLoader />
        </div>
      </section>

      {kpdh ? (
        <section className="ux-sec" aria-labelledby="g3-bridge-h">
          <div className="g3-bridge" data-ux="bridge">
            <span className="g3-bridge-ic" aria-hidden="true"><Icon name="heart" /></span>
            <div className="g3-grow">
              <h2 id="g3-bridge-h">Loved HUNTR/X? Find your real K-pop girl group</h2>
              <p>Six questions, no pictures, a real group at the end with the three songs to start with.</p>
            </div>
            <UxButton href="/kpop-demon-hunters-quiz" prefetch={false}>Take the quiz</UxButton>
          </div>
        </section>
      ) : null}

      {tracks.length > 0 ? (
        <section className="ux-sec" aria-labelledby="g3-tracks-h">
          <SectionHeader
            id="g3-tracks-h"
            title="Songs in this playlist"
            icon="music"
            sub={typeof count === 'number' && count > 0 ? fmt.songsCount(fmt.num(count)) : undefined}
          />
          <ol className="g3-tracks" id="g3-tracks">
            {tracks.map((t, i) => (
              <li className="g3-tr" key={`${t.title}-${t.artist}-${i}`}>
                <span className="g3-grow"><b>{t.title}</b> <span>· {t.artist}</span></span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {more.length > 0 ? (
        <section className="ux-sec" aria-labelledby="g3-more-h">
          <SectionHeader id="g3-more-h" title="More playlists" icon="layers" action={{ href: '/blindtest', label: 'All playlists' }} />
          <ThemeRail id="g3-more">
            {more.map((c) => <ThemeCard key={c.href} href={c.href} name={c.name} sub={c.sub} lead={c.lead} cover={c.cover} />)}
          </ThemeRail>
        </section>
      ) : null}
    </>
  );

  return (
    <UxPage width="full" padded={false} className="p6 g3">
      {jsonLdScript(breadcrumbJsonLd(theme))}
      {preset
        ? <BtModeControllerLoader preset={preset} shareUrl={`${SITE}/blindtest/${theme.id}`} challengeLink={!kpdh} className="g3-theme">{page}</BtModeControllerLoader>
        : <div className="ux-wrap ux-pg p6-hub p6-mode g3-theme">{page}</div>}
    </UxPage>
  );
}
