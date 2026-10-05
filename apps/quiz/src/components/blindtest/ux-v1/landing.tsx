import { Icon } from '@/components/ux-v1/icon';
import { UxButton } from '@/components/ux-v1/button';
import { LangSwitch } from '@/components/ux-v1/lang-switch';
import { UxPage } from '@/components/ux-v1/page';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { Steps3 } from '@/components/ux-v1/steps';
import { ThemeCard, ThemeRail } from '@/components/ux-v1/theme-card';
import { getLandingNumbers, getThemeState } from '@/lib/growth/bt-data';
import {
  LANDING_COPY, LANDING_LANGS, LANDING_PATH, LANG_NAME, LANG_SWITCH_NAME, SITE,
  landingAlternates, landingBreadcrumbJsonLd, landingDescription, landingEyebrow, landingFaq, landingFaqJsonLd, landingLead,
} from '@/lib/growth/bt-landing';
import { BT_STRINGS } from '@/lib/growth/bt-strings';
import { themeCard, visibleThemes } from '@/lib/growth/bt-themes';
import { jsonLdScript } from '@/lib/verse/jsonld';

import { BtLandingControllerLoader, BtLandingErrorLoader, BtLandingStartLoader } from './mode-loader';

import type { BtLang } from '@/lib/growth/bt-strings';
import type { Metadata } from 'next';

// A V12 blindtest landing (SYSTEM.md 4; prototype view `btland`). One server
// component for the four pages: the language switch, the hero (H1, lead, Start,
// "Play with friends", three trust marks), the themed playlists, the three steps,
// a short FAQ, the links to the other languages. Everything a crawler reads is in
// the HTML; Start swaps the page for the v11 day-mode game in the page's language.
//
// The routes call notFound() unless isUxV12(), so nothing here runs with the flag off.

/** The metadata of a landing: its own title and description, self canonical, the four-page hreflang cluster. */
export function landingMetadata(lang: BtLang): Metadata {
  const copy = LANDING_COPY[lang];
  const description = landingDescription(copy);
  return {
    title: copy.title,
    description,
    alternates: { canonical: copy.path, languages: landingAlternates() },
    openGraph: { title: copy.title, description, url: copy.path, locale: lang },
    robots: { index: true, follow: true },
  };
}

export async function BlindtestLanding({ lang }: { lang: BtLang }): Promise<React.ReactElement> {
  const copy = LANDING_COPY[lang];
  const s = BT_STRINGS[lang];
  const [numbers, themes] = await Promise.all([getLandingNumbers(), getThemeState()]);
  const eyebrow = landingEyebrow(copy, numbers);
  const faq = landingFaq(copy, numbers);
  const cards = visibleThemes(themes.playable).map((t) => themeCard(t, lang, themes.counts, { num: s.num, songsCount: copy.songsCount }));
  const others = LANDING_LANGS.filter((l) => l !== lang);

  return (
    <UxPage width="full" padded={false} className="p6 g3">
      {/* Sets lang while the HTML is parsed, before first paint: the pattern of
          app/(site)/pt/layout.tsx. The English landing keeps the root layout's lang. */}
      {lang === 'en' ? null : <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang='${lang}';` }} />}
      {jsonLdScript(landingBreadcrumbJsonLd(copy))}
      {jsonLdScript(landingFaqJsonLd(copy, numbers))}
      <BtLandingControllerLoader lang={lang} shareUrl={`${SITE}${copy.path}`}>
        <div className="g3-landtop">
          <LangSwitch
            current={lang}
            label="Page language"
            options={LANDING_LANGS.map((l) => ({ code: l, label: LANG_SWITCH_NAME[l], href: LANDING_PATH[l] }))}
          />
          <span className="ux-urlchip">kpopquiz.org{copy.path}</span>
        </div>

        <section className="g3-landhero" aria-labelledby="g3-h1" data-ux="landhero">
          {eyebrow ? <p className="p6-eyebrow"><span className="p6-pulse" aria-hidden="true" />{eyebrow}</p> : null}
          <h1 id="g3-h1">{copy.h1.pre}<em>{copy.h1.emPre}<span className="g3-nw">K-pop</span>{copy.h1.emPost}</em></h1>
          <p className="g3-lead">{landingLead(copy, numbers)}</p>
          <div className="g3-actions">
            <BtLandingStartLoader lang={lang} label={copy.start} />
            <UxButton href="/live" variant="ghost" size="lg" icon="users" prefetch={false}>{copy.live}</UxButton>
          </div>
          <BtLandingErrorLoader lang={lang} />
          <ul className="g3-trust">
            {copy.trust.map((t) => <li key={t}><Icon name="check" />{t}</li>)}
          </ul>
        </section>

        {cards.length > 0 ? (
          <section className="ux-sec" aria-labelledby="g3-pl-h">
            <SectionHeader id="g3-pl-h" title={copy.playlistsHeading} icon="music" action={{ href: '/blindtest', label: copy.allPlaylists }} />
            <ThemeRail id="g3-th">
              {cards.map((c) => <ThemeCard key={c.href} href={c.href} name={c.name} sub={c.sub} lead={c.lead} cover={c.cover} />)}
            </ThemeRail>
          </section>
        ) : null}

        <section className="ux-sec" aria-labelledby="g3-how-h">
          <SectionHeader id="g3-how-h" title={copy.howHeading} icon="bulb" />
          <Steps3 id="g3-steps" steps={copy.steps} />
        </section>

        <section className="ux-sec p6-faq" aria-labelledby="g3-faq-h" id="g3-faq">
          <h2 id="g3-faq-h" className="ux-h2">{copy.faqHeading}</h2>
          {faq.map(({ q, a }, i) => (
            <details className="p6-acc" key={q} open={i === 0}>
              <summary>{q}<Icon name="chev" /></summary>
              <p className="p6-ab">{a}</p>
            </details>
          ))}
        </section>

        <p className="g3-langrow">
          <span>{copy.other}:</span>
          <span className="g3-langrow-links">
            {others.map((l, i) => (
              <span key={l}>{i > 0 ? ' · ' : null}<a href={LANDING_PATH[l]} hrefLang={l} lang={l}>{LANG_NAME[l]}</a></span>
            ))}
          </span>
        </p>
      </BtLandingControllerLoader>
    </UxPage>
  );
}
