import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { parseFrom } from '@/lib/analytics';
import { DAILY_HUB_DESCRIPTION, DAILY_HUB_TITLE, dailyHubAnswer, dailyHubOn } from '@/lib/daily-hub';
import { addDays } from '@/lib/daily-rest';
import { getQuizOfDate, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { safeFetch } from '@/lib/error-handling';
import { quizEndBridge } from '@/lib/passerelles/quiz-end';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { jsonLdString } from '@/lib/seo/json-ld';
import { SITE } from '@/lib/site/registry';

import { DailyHubStatus } from './daily-hub-status';

import type { Metadata } from 'next';

// Audit 01 P2-9: the daily hub. DAILY_HUB off (default): /daily redirects to today's quiz as it always did (the redirect itself now
// lives at /daily/play, and the `from` of the link is forwarded). On: a page with the three dailies, their played states (a client island),
// the streak, the countdown and the last 7 quizzes of the day. Dynamic by nature (the redirect), never cached with a stale day.
export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  if (!dailyHubOn()) return {};
  return {
    title: DAILY_HUB_TITLE,
    description: DAILY_HUB_DESCRIPTION,
    alternates: { canonical: '/daily' },
    openGraph: { title: `${DAILY_HUB_TITLE} | ${SITE.brand.name}`, description: DAILY_HUB_DESCRIPTION, url: `${SITE.url}/daily`, siteName: SITE.brand.name, type: 'website', images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function DailyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<React.ReactElement> {
  const sp = await searchParams;
  if (!dailyHubOn()) {
    const qotd = await safeFetch(getQuizOfTheDay(), null, '[daily] getQuizOfTheDay');
    const from = parseFrom(`?from=${typeof sp['from'] === 'string' ? sp['from'] : ''}`);
    redirect(qotd ? `/q/${qotd.slug}?daily=quiz${from === 'direct' ? '' : `&from=${from}`}` : '/quizzes');
  }

  const date = new Date().toISOString().slice(0, 10);
  const days = Array.from({ length: 7 }, (_, i) => addDays(date, -(i + 1)));
  const [qotd, past] = await Promise.all([
    safeFetch(getQuizOfTheDay(), null, '[daily] getQuizOfTheDay'),
    Promise.all(days.map((d) => safeFetch(getQuizOfDate(d), null, '[daily] getQuizOfDate'))),
  ]);
  const last7 = past.map((p, i) => (p ? { date: days[i]!, ...p } : null)).filter((x): x is { date: string; slug: string; title: string } => x !== null && x.slug !== qotd?.slug);
  const bridge = quizEndBridge();

  return (
    <div className="daily-hub">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
          { '@type': 'ListItem', position: 2, name: 'Daily', item: `${SITE.url}/daily` },
        ],
      }) }} />
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Daily' }]} />
      <header>
        <h1>Daily K-pop quiz, blindtest and Kpopdle</h1>
        <p>{dailyHubAnswer({ date, questions: qotd?.question_count ?? null })}</p>
      </header>

      <DailyHubStatus />

      <section aria-labelledby="dh-games">
        <h2 id="dh-games">Today&apos;s daily games</h2>
        <ul>
          {qotd ? <li><Link href="/daily/play?from=hub">Daily quiz: {qotd.title}</Link></li> : null}
          {SITE.features.dailyBlindTest ? <li><Link href="/blindtest?daily=true&from=hub">Daily blindtest</Link></li> : null}
          {bridge?.kind === 'kpopdle' ? <li><a href={bridge.href}>Kpopdle</a></li> : null}
        </ul>
      </section>

      {last7.length >= 3 ? (
        <section aria-labelledby="dh-past">
          <h2 id="dh-past">Daily quizzes of the last 7 days</h2>
          <p>Play one you missed. It does not count for your streak.</p>
          <table>
            <thead><tr><th scope="col">Day (UTC)</th><th scope="col">Quiz</th></tr></thead>
            <tbody>{last7.map((p) => <tr key={p.date}><td>{p.date}</td><td><Link href={`/q/${p.slug}`}>{p.title}</Link></td></tr>)}</tbody>
          </table>
        </section>
      ) : null}

      <p><Link href="/kpop-games">K-pop games</Link> · <Link href="/quizzes">All K-pop quizzes</Link></p>
    </div>
  );
}
