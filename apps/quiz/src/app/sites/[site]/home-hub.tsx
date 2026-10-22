// Run O1, lot (d), lane H1: the network page, served at / of the hub build (fanquiz.org). Row H-1 of the twins contract:
// the hero, the sites, "What your passport shares" and the account block are built from components/ux-v1/page.tsx,
// section-header.tsx and panel.tsx. Copy: copy/hub/h1.ts. Styles: styles/sites/hub/h1.css (classes hub-h1-*).
import { HubShares } from '@/components/hub/hub-shares';
import { HubSignIn } from '@/components/hub/hub-sign-in';
import { UxLink } from '@/components/ux-v1/button';
import { UxPage } from '@/components/ux-v1/page';
import { Panel } from '@/components/ux-v1/panel';
import { SectionHeader } from '@/components/ux-v1/section-header';
import { ht } from '@/lib/site/hub/copy';
import { networkCards } from '@/lib/site/hub/network-page';
import { readHubPassport } from '@/lib/site/hub/passport-summary';
import { jsonLdString } from '@/lib/seo/json-ld';
import { robotsFor } from '@/lib/site/indexing';
import { websiteJsonLdFor } from '@/lib/site/jsonld';
import { NETWORK, SITE } from '@/lib/site/registry';

import type { NetworkCard } from '@/lib/site/hub/network-page';
import type { HubPassportSummary } from '@/lib/site/hub/passport-summary';
import type { Metadata } from 'next';

const HOME_URL = `${NETWORK.url}/`;


// The home is the one indexable page of the hub (the layout closes the others, and every page while NET_INDEXING is off); canonical from the registry.
export const metadata: Metadata = {
  title: { absolute: ht('home.metaTitle') },
  description: ht('home.metaDescription'),
  robots: robotsFor(true),
  alternates: { canonical: HOME_URL },
  openGraph: {
    type: 'website',
    siteName: SITE.brand.name,
    title: ht('home.metaTitle'),
    description: ht('home.metaDescription'),
    url: HOME_URL,
    images: [{ url: SITE.brand.ogTemplate, width: 1200, height: 630, alt: SITE.brand.name }],
  },
  twitter: { card: 'summary_large_image', title: ht('home.metaTitle'), description: ht('home.metaDescription') },
};

/** The accent of a card, from the theme of its site (the CSS picks the light or the dark value). */
function accentVars(card: NetworkCard): React.CSSProperties | undefined {
  if (!card.accentLight || !card.accentDark) return undefined;
  return { '--hub-accent-light': card.accentLight, '--hub-accent-dark': card.accentDark } as React.CSSProperties;
}

function SiteCard({ card }: { card: NetworkCard }): React.ReactElement {
  return (
    <li className="hub-h1-card" style={accentVars(card)}>
      <Panel title={card.name} titleAs="h3" className="hub-h1-panel">
        <span className="hub-h1-accent" aria-hidden="true" />
        <p className="hub-h1-pitch">{card.pitch}</p>
        <UxLink href={card.origin} icon="arrow" aria-label={ht('home.cardOpenAria', { name: card.name })}>
          {ht('home.cardOpen')}
        </UxLink>
      </Panel>
    </li>
  );
}

function SignedOut(): React.ReactElement {
  return (
    <Panel title={ht('home.accountTitle')} titleAs="h2" icon="user">
      <p className="hub-h1-account-line">{ht('home.accountSignedOut')}</p>
      <HubSignIn label={ht('home.signIn')} sheetTitle={ht('home.signInSheetTitle')} sheetSub={ht('home.signInSheetSub')} />
    </Panel>
  );
}

function SignedIn({ passport }: { passport: HubPassportSummary }): React.ReactElement {
  return (
    <Panel title={ht('home.passportTitle')} titleAs="h2" icon="user">
      <dl className="hub-h1-facts">
        <div>
          <dt>{ht('home.passportUsername')}</dt>
          <dd>@{passport.username}</dd>
        </div>
        <div>
          <dt>{ht('home.passportLevel')}</dt>
          <dd>{ht('home.passportLevelValue', { level: passport.level })}</dd>
        </div>
        <div>
          <dt>{ht('home.passportSites')}</dt>
          <dd>{passport.sites.length > 0 ? passport.sites.map((s) => s.name).join(', ') : ht('home.passportNoSites')}</dd>
        </div>
      </dl>
      <UxLink href="/passport" icon="arrow">{ht('home.passportOpen')}</UxLink>
    </Panel>
  );
}

export default async function HubHome(): Promise<React.ReactElement> {
  const cards = networkCards({ NEXT_PUBLIC_NET_ORIGINS: process.env.NEXT_PUBLIC_NET_ORIGINS, VERCEL_ENV: process.env.VERCEL_ENV });
  // Any error reads as signed out: the page never fails because the database is down.
  const passport = await readHubPassport();
  return (
    <UxPage width="wide" className="hub-h1-home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(websiteJsonLdFor(ht('home.metaDescription'))) }} />
      <div className="ux-ph">
        <h1>{ht('home.h1')}</h1>
        <p>{ht('home.lede')}</p>
      </div>

      <section className="ux-sec" aria-labelledby="hub-h1-sites-h">
        <SectionHeader id="hub-h1-sites-h" icon="grid" title={ht('home.sitesTitle')} />
        <ul className="hub-h1-cards">
          {cards.map((card) => <SiteCard key={card.id} card={card} />)}
        </ul>
      </section>

      <div className="ux-sec">
        <HubShares />
      </div>

      <div className="ux-sec">
        {passport ? <SignedIn passport={passport} /> : <SignedOut />}
      </div>
    </UxPage>
  );
}
