import Link from 'next/link';

import { ChartDownloads } from '@/components/cite/chart-downloads';
import { CopyCredit } from '@/components/cite/copy-credit';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { REPORT_CREDIT, REPORT_PATH, REPORT_SCORES, REPORT_TITLE, REPORT_WINDOW } from '@/lib/report/knowledge-report-2026';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { DATA_LICENCE, FOUNDER, LINK_NOTE, PRESS_EMAIL } from '@/lib/seo/org';
import { atLeast, exact, fillStats, getPublicStatsOrNull } from '@/lib/stats/site-stats';

import type { Metadata } from 'next';
import type { PublicStats } from '@/lib/stats/site-stats';

// /press (SEO Mission 3, part F.2; rulebook section 12.3): live numbers, who runs the site,
// the reports and how we measure, licences, the report charts, the logo pack and a press
// contact. Every count comes from the site stats function (lib/stats/site-stats.ts), rounded
// only by atLeast; nothing on this page is typed. Blocks the owner has not supplied (founder
// bio and photo, press coverage) stay hidden until there is something real to show.

// Hourly, like the home page: the counts themselves are cached for six hours by the stats
// function, so this page prints the same numbers as every other page on the same day.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Press Kit: Live Numbers, Logos and Licences',
  description:
    'The kpopquiz.org press kit: live numbers from real plays, the K-pop Knowledge Report, how we measure, logos, licences and a press contact.',
  alternates: { canonical: '/press' },
  openGraph: {
    title: 'kpopquiz.org press kit',
    description: 'Live numbers from real plays, the K-pop Knowledge Report, how we measure, logos, licences and a press contact.',
    url: '/press',
    images: [DEFAULT_OG_IMAGE],
  },
};

/**
 * The founder's bio and photo, supplied by the owner only. Null = the block is hidden.
 * The owner chose to appear by first name and role (lib/seo/org.ts); do not write a bio
 * or add a photo here without his text and his file.
 */
const FOUNDER_BIO = null as string | null;
const FOUNDER_PHOTO = null as { src: string; alt: string; width: number; height: number } | null;

/** Real press coverage only (outlet, headline, URL, date). Empty = the section is hidden. */
const COVERAGE: ReadonlyArray<{ outlet: string; title: string; url: string; date: string }> = [];

/** Brand files that exist in public/ today. */
const LOGOS: ReadonlyArray<{ src: string; label: string; size: string }> = [
  { src: '/android-chrome-512x512.png', label: 'The rabbit mark on cream, the site icon', size: '512 x 512 PNG' },
  { src: '/mascot/mascot-default.png', label: 'The rabbit mark, transparent background, as in the site header', size: '128 x 128 PNG' },
  { src: '/logo-512.png', label: 'The square logo used in our structured data', size: '512 x 512 PNG' },
];

const H2 = 'mb-2 mt-9 text-lg font-bold text-[var(--text-primary)]';
const A = 'font-medium text-[var(--accent)] hover:underline';

function asOfDate(s: PublicStats): string {
  return new Date(s.asOf).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function numbers(s: PublicStats): Array<{ label: string; value: string }> {
  return [
    { label: 'Published quizzes', value: atLeast(s.quizzes) },
    { label: 'Groups with at least one quiz', value: atLeast(s.groupsWithQuizzes) },
    { label: 'Groups in the directory', value: atLeast(s.groupsListed) },
    { label: 'Songs in the blind test', value: atLeast(s.songs) },
    { label: 'Finished quiz plays', value: atLeast(s.plays) },
  ];
}

export default async function PressPage(): Promise<React.ReactElement> {
  const stats = await getPublicStatsOrNull();
  const asOf = stats ? asOfDate(stats) : null;
  const scale = fillStats('{quizzes} published quizzes about {groups} groups, played {plays} times', stats);

  return (
    <div className="py-8 max-w-2xl mx-auto text-[15px] leading-relaxed text-[var(--text-secondary)]">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Press kit' }]} />
      <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">kpopquiz.org press kit</h1>

      {/* Answer block (rulebook 3.1): what the site is, one dated number, what is here. */}
      <p className="mt-3">
        kpopquiz.org is an independent fan site where K-pop fans play and write quizzes.
        {asOf ? ` As of ${asOf}, it holds ${scale}.` : ` It holds ${scale}.`} This press kit gives
        live numbers, our reports and how we measure them, licences, charts, logos and a press contact.
      </p>

      {stats && asOf ? (
        <>
          <h2 className={H2}>kpopquiz.org in numbers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <caption className="sr-only">kpopquiz.org in numbers, {asOf}</caption>
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th scope="col" className="py-2 pr-4 font-semibold text-[var(--text-primary)]">What we count</th>
                  <th scope="col" className="py-2 font-semibold text-[var(--text-primary)]">Count</th>
                </tr>
              </thead>
              <tbody>
                {numbers(stats).map((n) => (
                  <tr key={n.label} className="border-b border-[var(--border)]">
                    <td className="py-2 pr-4">{n.label}</td>
                    <td className="py-2 font-semibold text-[var(--text-primary)]">{n.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[13px]">
            Read from our database on {asOf}{' '}and refreshed every six hours. Counts are rounded down, so a
            &quot;+&quot; means &quot;at least&quot;. More figures on <Link href="/stats" className={A}>site statistics</Link>.
          </p>
        </>
      ) : null}

      <h2 className={H2}>Who runs kpopquiz.org?</h2>
      <p>
        kpopquiz.org is run by {FOUNDER.name}, its founder. It is an independent fan site: it is not affiliated
        with any artist, label or agency. Fans write the quizzes; see{' '}
        <Link href="/about" className={A}>about kpopquiz.org</Link> and the{' '}
        <Link href="/editorial-policy" className={A}>editorial policy</Link>.
      </p>
      {FOUNDER_PHOTO || FOUNDER_BIO ? (
        <div className="mt-4 flex gap-4">
          {FOUNDER_PHOTO ? (
            // eslint-disable-next-line @next/next/no-img-element -- owner-supplied press photo
            <img src={FOUNDER_PHOTO.src} alt={FOUNDER_PHOTO.alt} width={FOUNDER_PHOTO.width} height={FOUNDER_PHOTO.height} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
          ) : null}
          {FOUNDER_BIO ? <p>{FOUNDER_BIO}</p> : null}
        </div>
      ) : null}

      <h2 className={H2}>Reports and data</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>
          <Link href={REPORT_PATH} className={A}>{REPORT_TITLE}</Link>: what fans know, measured on{' '}
          {exact(REPORT_SCORES.attempts)} quiz attempts, {REPORT_WINDOW}, with the{' '}
          <a href={`${REPORT_PATH}/dataset`} className={A}>full dataset</a> and the findings we discarded.
        </li>
        <li><Link href="/data/pulse" className={A}>The monthly K-pop Pulse</Link>: the fandom of the month and the most-played quizzes, by real plays.</li>
        <li><Link href="/stats" className={A}>Site statistics</Link>: live counts, the most-played fandoms this week, the hardest and easiest quizzes.</li>
      </ul>

      <h2 className={H2}>How do we measure?</h2>
      <p>
        Every number comes from recorded plays, never from estimates or surveys. Site counts are read from the
        database by one shared function, so a number is the same on every page, and they are rounded down. Report
        figures are computed from individual play records, with minimum sample sizes fixed before any result was
        looked at; below the minimum, a result is named but never ranked. Read{' '}
        <Link href={`${REPORT_PATH}#kr-method`} className={A}>the report&apos;s method</Link>.
      </p>

      <h2 className={H2}>Licences</h2>
      <p>
        Our numbers, charts and reports are free to reuse under{' '}
        <a href={DATA_LICENCE.url} rel="license" className={A}>{DATA_LICENCE.name}</a>: credit kpopquiz.org. {LINK_NOTE}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        <p className="min-w-0 flex-1 break-words font-mono text-[13px] text-[var(--text-primary)]">{REPORT_CREDIT}</p>
        <CopyCredit text={REPORT_CREDIT} />
      </div>
      <p className="mt-3">
        The quizzes are written by fans and stay theirs: they are not under this licence. To show a quiz on your
        site, use the &quot;Embed this quiz&quot; button on its page. It adds a visible credit link, which you may
        mark nofollow.
      </p>

      <h2 className={H2}>Charts</h2>
      <p>Three charts from the report, with the credit line and the licence drawn into each image.</p>
      <ChartDownloads withPreview />

      <h2 className={H2}>Logos</h2>
      <p>The brand files we use today. Please use them as they are, to refer to kpopquiz.org.</p>
      <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {LOGOS.map((l) => (
          <li key={l.src} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 text-[13px]">
            {/* eslint-disable-next-line @next/next/no-img-element -- a static brand file, shown as is */}
            <img src={l.src} alt={l.label} width={96} height={96} loading="lazy" className="h-24 w-24 object-contain" />
            <p className="mt-2 text-[var(--text-primary)]">{l.label}</p>
            <p>{l.size} · <a href={l.src} download className={A}>Download</a></p>
          </li>
        ))}
      </ul>

      <h2 className={H2}>Press contact</h2>
      <p>
        Write to <a href={`mailto:${PRESS_EMAIL}`} className={A}>{PRESS_EMAIL}</a> for interviews, data
        requests and corrections.
      </p>

      {COVERAGE.length > 0 ? (
        <>
          <h2 className={H2}>Coverage</h2>
          <ul className="list-disc space-y-1 pl-5">
            {COVERAGE.map((c) => (
              <li key={c.url}>
                {c.outlet}: <a href={c.url} className={A} rel="noopener">{c.title}</a> ({c.date})
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
