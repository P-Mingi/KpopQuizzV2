import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Mascot } from '@/components/ui/mascot';
import { PulseReportView } from '@/components/pulse/report-view';
import { getPulseReport, listPulseReports, PULSE_MONTH_RE } from '@/lib/pulse/data';

import type { Metadata } from 'next';

const SITE_URL = 'https://kpopquiz.org';

// T0: one monthly report. Static/ISR (hourly revalidate); the report itself
// only changes when the 1st-of-month cron regenerates it, so this is generous.
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ month: string }>;
}

export async function generateStaticParams(): Promise<Array<{ month: string }>> {
  try {
    const reports = await listPulseReports();
    return reports.map((r) => ({ month: r.month }));
  } catch {
    // On a build-time DB blip, prerender nothing; ISR fills pages on demand.
    return [];
  }
}

function summarize(monthLabel: string, fandom: string | null, plays: number): string {
  const lead = fandom ? `${fandom} was ${monthLabel}'s most-played fandom on kpopquiz.org` : `${monthLabel} on kpopquiz.org`;
  return `${lead}, drawn from ${plays.toLocaleString('en-US')} real quiz plays. Fandom of the month, most-played quizzes, fan duel verdict, and community growth. Free to cite with a link.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { month } = await params;
  if (!PULSE_MONTH_RE.test(month)) return {};
  const report = await getPulseReport(month);
  if (!report) return {};

  const { payload } = report;
  const title = `K-pop Pulse: ${payload.monthLabel}`;
  const description = summarize(payload.monthLabel, payload.fandom?.name ?? null, payload.community.plays);
  const ogTitle = `K-pop Pulse ${payload.monthLabel}`;
  const ogSubtitle = payload.fandom
    ? `${payload.fandom.name} led the month with ${payload.fandom.plays.toLocaleString('en-US')} plays`
    : 'Monthly first-party K-pop fan data';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: payload.generatedAt,
      modifiedTime: report.updatedAt,
      url: `/data/pulse/${payload.month}`,
      images: [{ url: `/api/og/page?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(ogSubtitle)}&accent=%23e8457a`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/data/pulse/${payload.month}` },
  };
}

export default async function PulseMonthPage({ params }: PageProps): Promise<React.ReactElement> {
  const { month } = await params;
  if (!PULSE_MONTH_RE.test(month)) notFound();
  const report = await getPulseReport(month);
  if (!report) notFound();

  const { payload } = report;
  const canonical = `${SITE_URL}/data/pulse/${payload.month}`;

  // Dataset LD: this page IS a dataset of first-party fan metrics for the month.
  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: `K-pop Pulse: ${payload.monthLabel}`,
    description: summarize(payload.monthLabel, payload.fandom?.name ?? null, payload.community.plays),
    url: canonical,
    creator: { '@type': 'Organization', name: 'KpopQuiz', url: SITE_URL },
    dateModified: report.updatedAt,
    temporalCoverage: `${payload.windowStart.slice(0, 10)}/${payload.windowEnd.slice(0, 10)}`,
    isAccessibleForFree: true,
    variableMeasured: [
      ...(payload.fandom ? [{ '@type': 'PropertyValue', name: 'Fandom of the month plays', value: payload.fandom.plays }] : []),
      { '@type': 'PropertyValue', name: 'Total quiz plays', value: payload.community.plays },
      { '@type': 'PropertyValue', name: 'Quizzes created', value: payload.community.quizzesCreated },
      { '@type': 'PropertyValue', name: 'New fans', value: payload.community.newFans },
      ...(payload.duel ? [{ '@type': 'PropertyValue', name: 'Top duel votes', value: payload.duel.votes }] : []),
    ],
  };

  // Article LD: the month report is also a dated, authored piece.
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `K-pop Pulse: ${payload.monthLabel}`,
    description: summarize(payload.monthLabel, payload.fandom?.name ?? null, payload.community.plays),
    datePublished: payload.generatedAt,
    dateModified: report.updatedAt,
    author: { '@type': 'Organization', name: 'KpopQuiz', url: SITE_URL },
    publisher: { '@type': 'Organization', name: 'KpopQuiz', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-512.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    isAccessibleForFree: true,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Pulse', item: `${SITE_URL}/data/pulse` },
      { '@type': 'ListItem', position: 3, name: payload.monthLabel, item: canonical },
    ],
  };

  return (
    <div className="pulse-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <header className="pulse-header">
        <nav className="pulse-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className="pulse-breadcrumb-sep">/</span>
          <Link href="/data/pulse">Pulse</Link>
          <span className="pulse-breadcrumb-sep">/</span>
          <span>{payload.monthLabel}</span>
        </nav>
        <div className="pulse-title-row">
          <div>
            <span className="pulse-eyebrow">Monthly K-pop Pulse</span>
            <h1 className="pulse-title font-display">{payload.monthLabel}</h1>
            <p className="pulse-subtitle">First-party fan data from kpopquiz.org, one report a month</p>
          </div>
          <div className="pulse-mascot" aria-hidden="true">
            <Mascot variant="celebrate" size={56} alt="" />
          </div>
        </div>
      </header>

      <PulseReportView payload={payload} />
    </div>
  );
}
