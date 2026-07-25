import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { listPulseReports } from '@/lib/pulse/data';

import type { Metadata } from 'next';

const SITE_URL = 'https://kpopquiz.org';

// T0: the Pulse index. Static/ISR; lists every generated month, newest first.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Monthly K-pop Pulse - First-Party Fan Data from kpopquiz.org',
  description:
    'A monthly K-pop data report from kpopquiz.org: the fandom of the month by real quiz plays, the most-played quizzes, fan duel verdicts, and honest community growth. First-party, dated, and free to cite with a link.',
  openGraph: {
    title: 'Monthly K-pop Pulse',
    description: 'The fandom of the month, most-played quizzes, and fan verdicts, measured first-party each month on kpopquiz.org. Free to cite.',
    url: '/data/pulse',
    images: [{ url: '/api/og/page?title=Monthly+K-pop+Pulse&subtitle=First-party+fan+data%2C+one+report+a+month&accent=%23e8457a', width: 1200, height: 630, alt: 'Monthly K-pop Pulse' }],
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/data/pulse' },
};

function IconArrow(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default async function PulseIndexPage(): Promise<React.ReactElement> {
  const reports = await listPulseReports();

  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Monthly K-pop Pulse',
    description: 'Monthly first-party K-pop fan data reports from kpopquiz.org, free to cite with a link.',
    url: `${SITE_URL}/data/pulse`,
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: SITE_URL },
    hasPart: reports.map((r) => ({
      '@type': 'Dataset',
      name: `K-pop Pulse: ${r.payload.monthLabel}`,
      url: `${SITE_URL}/data/pulse/${r.month}`,
      dateModified: r.updatedAt,
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Pulse', item: `${SITE_URL}/data/pulse` },
    ],
  };

  return (
    <div className="pulse-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <header className="pulse-header">
        <nav className="pulse-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="pulse-breadcrumb-sep">/</span>
          <span>Pulse</span>
        </nav>
        <div className="pulse-title-row">
          <div>
            <span className="pulse-eyebrow">Monthly report</span>
            <h1 className="pulse-title font-display">The K-pop Pulse</h1>
            <p className="pulse-subtitle">First-party fan data from kpopquiz.org, one report a month</p>
          </div>
          <div className="pulse-mascot" aria-hidden="true">
            <Mascot variant="celebrate" size={56} alt="" />
          </div>
        </div>
        <p className="pulse-method">
          Each month we measure what fans actually played and voted on: the fandom of the month by real
          quiz plays, the most-played quizzes, the fan duel verdict, and honest monthly growth. Every
          number is first-party and dated. Thin sections are hidden rather than shown thin.
        </p>
      </header>

      {reports.length === 0 ? (
        <p className="pulse-empty">The first monthly report publishes at the start of next month. Check back soon.</p>
      ) : (
        <div className="pulse-index-grid">
          {reports.map((r) => (
            <Link key={r.month} href={`/data/pulse/${r.month}`} className="pulse-index-card">
              <span className="pulse-index-month">{r.payload.monthLabel}</span>
              {r.payload.fandom && (
                <span className="pulse-index-lead">
                  <strong>{r.payload.fandom.name}</strong> led with {r.payload.fandom.plays.toLocaleString('en-US')} plays
                </span>
              )}
              <span className="pulse-index-stats">
                {r.payload.community.plays.toLocaleString('en-US')} plays · {r.payload.community.newFans.toLocaleString('en-US')} new fans
              </span>
              <span className="pulse-index-read">Read the report <IconArrow /></span>
            </Link>
          ))}
        </div>
      )}

      <p className="pulse-cite-foot">
        This data is free to cite with a link to{' '}
        <Link href="/data/pulse" className="pulse-cite-foot-link">kpopquiz.org/data/pulse</Link>. Every figure is
        first-party and stamped with the month it was measured.
      </p>
    </div>
  );
}
