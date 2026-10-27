// Run O1, lot (d), lane H1: the legal notice (mentions légales, LCEN article 6) of the three sites. This is the kpop route and the source:
// the OtakuQuiz and FanQuiz page (app/sites/[site]/legal/page.tsx) re-exports it (rule 18). Fusion A5 (main wins for kpop): on
// kpopquiz.org the page is main's, node for node (KpopLegal, lib/legal-notice.ts), always a known route. OtakuQuiz and FanQuiz print the
// same notice from the legal.* keys of copy/hub/h1.ts, site name and domain from the registry (NetworkLegal, lib/site/hub/legal.ts).
import { legalEmail, legalLaunchGate, legalPlaceholders, legalPrivacyUrl, lt } from '@/lib/site/hub/legal';
import { robotsFor } from '@/lib/site/indexing';
import { LEGAL, legalIsComplete } from '@/lib/legal-notice';
import { SITE_ID } from '@/lib/site/registry';

import type { Metadata } from 'next';

const LINK = 'text-primary underline hover:no-underline';
const P = 'text-sm text-secondary leading-relaxed';
const H2 = 'text-lg font-medium mt-8 mb-3';

// While a [BRACKETED] fact is still printed the page says noindex and stays out of the sitemap (lib/legal-notice.ts).
// The kpop metadata, main's. The OtakuQuiz and FanQuiz twin exports its own generateMetadata (networkLegalMetadata below).
export const metadata: Metadata = {
  title: LEGAL.title,
  description: LEGAL.description,
  robots: { index: legalIsComplete(), follow: true },
  alternates: { canonical: '/legal' },
};

function KpopLegal(): React.ReactElement {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-medium mb-2">{LEGAL.title}</h1>
      <p lang="fr" className="text-sm text-secondary mb-8">{LEGAL.sub}</p>

      <p className={P}>{LEGAL.lede}</p>

      <h2 className={H2}>Publisher</h2>
      <p className={P}>{LEGAL.site} ({LEGAL.domain}) is published by:</p>
      <ul className={`${P} list-disc pl-5 mt-2 space-y-1`}>
        <li>{LEGAL.publisher}</li>
        <li>Legal form: {LEGAL.form}</li>
        <li>{LEGAL.siren}</li>
        <li>{LEGAL.vat}</li>
        <li>Phone: {LEGAL.phone}</li>
        <li>Email: <a href={`mailto:${LEGAL.email}`} className={LINK}>{LEGAL.email}</a></li>
      </ul>

      <h2 className={H2}>Publication director</h2>
      <p className={P}>The publication director is: {LEGAL.director}</p>

      <h2 className={H2}>Host</h2>
      <p className={P}>{LEGAL.site} is hosted by:</p>
      <ul className={`${P} list-disc pl-5 mt-2 space-y-1`}>
        <li>{LEGAL.host.name}</li>
        <li>{LEGAL.host.address}</li>
        <li>Phone: {LEGAL.host.phone}</li>
      </ul>

      <h2 className={H2}>Personal data</h2>
      <p className={P}>
        What {LEGAL.site} does with your personal data, and how to use your rights, is in the privacy policy.{' '}
        <a href={LEGAL.privacyUrl} className={LINK}>Read the privacy policy</a>
      </p>
    </div>
  );
}

// While a [BRACKETED] fact is still printed the page says noindex; a build with NET_INDEXING on and one left fails here (legalLaunchGate).
export function networkLegalMetadata(): Metadata {
  legalLaunchGate();
  return {
    title: lt('legal.metaTitle'),
    description: lt('legal.metaDescription'),
    robots: robotsFor(legalPlaceholders().length === 0),
    alternates: { canonical: '/legal' },
  };
}

export default function LegalPage(): React.ReactElement {
  return SITE_ID === 'kpop' ? <KpopLegal /> : <NetworkLegal />;
}

function NetworkLegal(): React.ReactElement {
  const email = legalEmail();
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-medium mb-2">{lt('legal.h1')}</h1>
      <p lang="fr" className="text-sm text-secondary mb-8">{lt('legal.sub')}</p>

      <p className={P}>{lt('legal.lede')}</p>

      <h2 className={H2}>{lt('legal.publisher.title')}</h2>
      <p className={P}>{lt('legal.publisher.p1')}</p>
      <ul className={`${P} list-disc pl-5 mt-2 space-y-1`}>
        <li>{lt('legal.publisher')}</li>
        <li>{lt('legal.publisher.formLabel')} {lt('legal.form')}</li>
        <li>{lt('legal.siren')}</li>
        <li>{lt('legal.vat')}</li>
        <li>{lt('legal.publisher.phoneLabel')} {lt('legal.phone')}</li>
        <li>{lt('legal.publisher.emailLabel')} <a href={`mailto:${email}`} className={LINK}>{email}</a></li>
      </ul>

      <h2 className={H2}>{lt('legal.director.title')}</h2>
      <p className={P}>{lt('legal.director.p1')} {lt('legal.director')}</p>

      <h2 className={H2}>{lt('legal.host.title')}</h2>
      <p className={P}>{lt('legal.host.p1')}</p>
      <ul className={`${P} list-disc pl-5 mt-2 space-y-1`}>
        <li>{lt('legal.host.name')}</li>
        <li>{lt('legal.host.address')}</li>
        <li>{lt('legal.host.phoneLabel')} {lt('legal.host.phone')}</li>
      </ul>

      <h2 className={H2}>{lt('legal.data.title')}</h2>
      <p className={P}>
        {lt('legal.data.p1')}{' '}
        <a href={legalPrivacyUrl()} className={LINK}>{lt('legal.data.link')}</a>
      </p>
    </div>
  );
}
