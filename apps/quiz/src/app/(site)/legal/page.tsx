// Run O1, lot (d), lane H1: the legal notice (mentions légales, LCEN article 6) of the three sites. This is the kpop route and the source:
// the OtakuQuiz and FanQuiz page (app/sites/[site]/legal/page.tsx) re-exports it (rule 18). Every string is a legal.* key of
// copy/hub/h1.ts, the site name and domain come from the registry (lib/site/hub/legal.ts). On kpopquiz.org the route answers only while
// NEXT_PUBLIC_NET_PRIVACY is on (lib/route-allowlist.ts); the markup is the one of the other legal pages (terms, dmca).
import { legalEmail, legalLaunchGate, legalPlaceholders, legalPrivacyUrl, legalPublisher, lt } from '@/lib/site/hub/legal';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

const LINK = 'text-primary underline hover:no-underline';
const P = 'text-sm text-secondary leading-relaxed';
const H2 = 'text-lg font-medium mt-8 mb-3';

// While a [BRACKETED] fact is still printed the page says noindex; a build with NET_INDEXING on and one left fails here (legalLaunchGate).
export function generateMetadata(): Metadata {
  legalLaunchGate();
  return {
    title: lt('legal.metaTitle'),
    description: lt('legal.metaDescription'),
    robots: robotsFor(legalPlaceholders().length === 0),
    alternates: { canonical: '/legal' },
  };
}

export default function LegalPage(): React.ReactElement {
  const email = legalEmail();
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-medium mb-2">{lt('legal.h1')}</h1>
      <p lang="fr" className="text-sm text-secondary mb-8">{lt('legal.sub')}</p>

      <p className={P}>{lt('legal.lede')}</p>

      <h2 className={H2}>{lt('legal.publisher.title')}</h2>
      <p className={P}>{lt('legal.publisher.p1')}</p>
      <ul className={`${P} list-disc pl-5 mt-2 space-y-1`}>
        <li>{legalPublisher()}</li>
        <li>{lt('legal.publisher.formLabel')} {lt('legal.form')}</li>
        <li>{lt('legal.publisher.sirenLabel')} {lt('legal.siren')}</li>
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
