// SEO-LAUNCH-1, lane C: /about of bunnyverse.org, the trust page of rule 12: the mission, who runs it, how the content is made (team, sources, AI drafts and a person reviews), the Team accounts
// and the contact. Server component, no number: it counts nothing. app/sites/[site]/about/page.tsx dispatches here when SITE_ID is 'hub' (OtakuQuiz keeps its own about page there).
// Who may be named: the owner chose to appear by his first name and his role, nothing more (lib/seo/org.ts FOUNDER). The links to kpopquiz.org are in context, on its own pages, without a query string.
import Link from 'next/link';

import { jsonLdString } from '@/lib/seo/json-ld';
import { FOUNDER, SITE_URL as KPOP_URL } from '@/lib/seo/org';
import { siteHasCredits } from '@/lib/credits/site-credits';
import { cardsOn } from '@/lib/cards/ui-flag';
import { HUB_ABOUT_ANSWER, HUB_ABOUT_DESCRIPTION, HUB_ABOUT_PATH, HUB_ABOUT_TITLE } from '@/lib/site/hub/about';
import { HUB_EMAIL } from '@/lib/site/hub/copy';
import { homeUrl } from '@/lib/site/hub/home-types';
import { burrowOpen } from '@/lib/site/hub/daily-guess';
import { robotsFor } from '@/lib/site/indexing';
import { organizationId, websiteId } from '@/lib/site/jsonld';
import { SITE } from '@/lib/site/registry';
import { SOCIAL_LINKS } from '@kpopquiz/shared/social-links';

import type { Metadata } from 'next';

const H2 = 'text-lg font-medium mt-8 mb-3';
const P = 'text-sm text-secondary leading-relaxed';
const A = 'text-primary underline hover:no-underline';

export function hubAboutMetadata(): Metadata {
  return {
    title: HUB_ABOUT_TITLE,
    description: HUB_ABOUT_DESCRIPTION,
    robots: robotsFor(true),
    alternates: { canonical: HUB_ABOUT_PATH },
    openGraph: {
      title: `${HUB_ABOUT_TITLE} | ${SITE.brand.name}`, description: HUB_ABOUT_DESCRIPTION, url: `${SITE.url}${HUB_ABOUT_PATH}`, siteName: SITE.brand.name, type: 'website',
      images: [{ url: SITE.brand.ogTemplate, width: 1200, height: 630, alt: SITE.brand.name }],
    },
  };
}

/** AboutPage, tied to the WebSite and the Organization of the network by @id; its text is the visible answer block. */
export function hubAboutJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: HUB_ABOUT_TITLE,
    description: HUB_ABOUT_DESCRIPTION,
    url: `${SITE.url}${HUB_ABOUT_PATH}`,
    inLanguage: 'en',
    isPartOf: { '@id': websiteId() },
    about: { '@id': organizationId() },
  };
}

export async function HubAbout(): Promise<React.ReactElement> {
  const credits = await siteHasCredits().catch(() => false);
  const cards = cardsOn();
  const games = burrowOpen();
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(hubAboutJsonLd()) }} />
      <h1 className="text-2xl font-medium mb-3">About Bunnyverse</h1>
      <p className={P}>{HUB_ABOUT_ANSWER}</p>

      <h2 className={H2}>What is Bunnyverse for?</h2>
      <p className={P}>
        Bunnyverse is a place to play every day and to keep one passport across the sites of the network. It holds
        {games ? <> the <Link href="/daily" className={A}>daily games</Link>, Kpopdle and Otakudle,</> : ' the daily games,'}
        {cards ? <> <Link href="/kpopcards" className={A}>KpopCards</Link>, a card collection game,</> : null}
        {' '}and <a href={homeUrl({ site: 'anime', path: '/' })} className={A}>OtakuQuiz</a> for anime quizzes. Its sister site <a href={KPOP_URL} className={A}>kpopquiz.org</a> has the K-pop quizzes.
        Everything is free to play.
      </p>

      <h2 className={H2}>Who makes Bunnyverse?</h2>
      <p className={P}>
        {`${FOUNDER.name}, the ${FOUNDER.role.charAt(0).toLowerCase()}${FOUNDER.role.slice(1)}, runs Bunnyverse. It is an independent fan project. We are not affiliated with any artist, record label, agency, studio or publisher, and the names and pictures we use belong to their owners.`}
      </p>

      <h2 className={H2}>How is the content made?</h2>
      <ul className="list-disc pl-5 space-y-2 text-sm text-secondary leading-relaxed">
        <li><b>Sources.</b> Facts come from official sites and verified accounts, Wikidata, MusicBrainz and Wikipedia. We do not copy fan databases or lyrics.</li>
        <li><b>AI drafts, a person reviews.</b> AI may help to draft a text or a list. A person checks it against the sources before it is published, and corrections are logged with their date.</li>
        <li><b>Photos.</b> We use official pictures, pictures under a free licence with their author and licence shown, or our own.{credits ? <> The <Link href="/credits" className={A}>photo credits</Link> list them.</> : null}</li>
        <li><b>Real data only.</b> Counts and scores shown on the sites come from recorded plays, never from estimates.</li>
      </ul>
      <p className={`${P} mt-3`}>
        The rules for sources, AI help, images and corrections are written in the{' '}
        <a href={`${KPOP_URL}/editorial-policy`} className={A}>editorial policy of KpopQuiz</a>, which applies to the sites of the network.
      </p>

      <h2 className={H2}>Who are the Team accounts?</h2>
      <p className={P}>
        A few accounts are labelled <b>Team</b>. They publish quizzes and posts for the sites through an editorial review, and only that way. They never post
        in the community as if they were fans. You can meet the community on{' '}
        <a href={SOCIAL_LINKS.discord.invite} rel="noopener nofollow" className={A}>Discord</a> and on{' '}
        <a href={SOCIAL_LINKS.reddit.url} rel="noopener nofollow" className={A}>{SOCIAL_LINKS.reddit.label}</a>.
      </p>

      <h2 className={H2}>How can I contact you?</h2>
      <p className={P}>
        Write to <a href={`mailto:${HUB_EMAIL}`} className={A}>{HUB_EMAIL}</a> for a question, a correction, a photo you want removed or a press request. The{' '}
        <Link href="/contact" className={A}>contact page</Link>, the <Link href="/legal" className={A}>legal notice</Link>, the{' '}
        <Link href="/privacy" className={A}>privacy policy</Link> and the <Link href="/terms" className={A}>terms</Link> say who publishes the site and how your data is handled.
      </p>
    </div>
  );
}
