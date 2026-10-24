import { LEGAL, legalIsComplete } from '@/lib/legal-notice';

import type { Metadata } from 'next';

const LINK = 'text-primary underline hover:no-underline';
const P = 'text-sm text-secondary leading-relaxed';
const H2 = 'text-lg font-medium mt-8 mb-3';

// While a [BRACKETED] fact is still printed the page says noindex and stays out of the sitemap (lib/legal-notice.ts).
export const metadata: Metadata = {
  title: LEGAL.title,
  description: LEGAL.description,
  robots: { index: legalIsComplete(), follow: true },
  alternates: { canonical: '/legal' },
};

export default function LegalPage(): React.ReactElement {
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
