import Link from 'next/link';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';

import type { Metadata } from 'next';

// W5 PART 1 - the K-pop Knowledge Report landing page.
//
// The prose below is docs/PLAY-W5-REPORT-DRAFT.md v3, shipped VERBATIM. Every figure in it
// is traceable to docs/data/w5-dataset.md, which is published in full at
// /data/knowledge-report-2026/dataset. Do not add a number, a percentage, a ranking or an
// example to this file: the report is trading on the fact that nothing in it was invented,
// and the discarded findings are the credibility of the piece.

export const revalidate = 3600;

const CANONICAL = 'https://kpopquiz.org/data/knowledge-report-2026';
const DATASET_URL = `${CANONICAL}/dataset`;

// Root layout appends " | KpopQuiz", so the suffix must not be repeated here.
export const metadata: Metadata = {
  title: 'The K-pop Knowledge Report 2026',
  description:
    'We scored 17,425 K-pop quiz attempts to measure what fans actually know. Fans name members at 97.5% and place eras at 41.6%. Method, full dataset and the findings we discarded.',
  alternates: { canonical: '/data/knowledge-report-2026' },
  openGraph: {
    title: 'The K-pop Knowledge Report 2026',
    description:
      'Fans know the people. They do not know the catalogue. 17,425 measured quiz attempts, 1 May to 17 August 2026.',
    url: CANONICAL,
    siteName: 'KpopQuiz',
    type: 'article',
    images: [{
      url: '/api/og/page?title=The+K-pop+Knowledge+Report+2026&subtitle=Fans+know+the+people.+They+don%27t+know+the+catalogue.&accent=%23e8457a',
      width: 1200, height: 630, alt: 'The K-pop Knowledge Report 2026',
    }],
  },
  twitter: { card: 'summary_large_image' },
};

const HARDEST = [
  ['40.0%', '71', 'BLACKPINK world records and achievements'],
  ['41.5%', '86', 'Stray Kids: Guess the Song'],
  ['41.6%', '781', 'Ultimate BTS era quiz - only real ARMYs survive'],
  ['52.3%', '59', 'BTS concerts and tour moments'],
  ['54.2%', '400', 'BLACKPINK ultimate fan challenge'],
];

const EASIEST = [
  ['99.4%', '53', 'Find the Non-BLACKPINK Member'],
  ['97.5%', '61', 'BTS members real names'],
  ['97.2%', '96', 'SEVENTEEN true or false'],
  ['96.8%', '101', 'How well do you know SKZ members?'],
  ['96.3%', '378', 'K-pop fandom names true or false'],
];

function ScoreTable({ caption, rows }: { caption: string; rows: string[][] }): React.ReactElement {
  return (
    <div className="kr-table-wrap">
      <table className="kr-table">
        <caption className="kr-table-caption">{caption}</caption>
        <thead>
          <tr><th scope="col">Score</th><th scope="col">Attempts</th><th scope="col">Quiz</th></tr>
        </thead>
        <tbody>
          {rows.map(([score, attempts, quiz]) => (
            <tr key={quiz}>
              <td className="kr-num">{score}</td>
              <td className="kr-num">{attempts}</td>
              <td>{quiz}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function KnowledgeReportPage(): React.ReactElement {
  // schema.org Report, with the dataset it is derived from attached as a real Dataset.
  // Deliberately minimal: a wrong Dataset shape is worse than none on a page aimed at the
  // machines that read it.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Report',
    headline: 'The K-pop Knowledge Report 2026',
    name: 'The K-pop Knowledge Report 2026',
    description:
      'A measurement of what K-pop fans know, from 17,425 scored quiz attempts on kpopquiz.org between 1 May and 17 August 2026.',
    url: CANONICAL,
    datePublished: '2026-08-17',
    inLanguage: 'en',
    author: { '@type': 'Organization', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
    publisher: { '@type': 'Organization', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
    isBasedOn: {
      '@type': 'Dataset',
      name: 'K-pop Knowledge Report 2026: figures, queries and sample sizes',
      description:
        'Every figure in the report with the query that produced it, its denominator and its date window, including the findings that were tested and discarded.',
      url: DATASET_URL,
      license: 'https://creativecommons.org/licenses/by/4.0/',
      creator: { '@type': 'Organization', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
      temporalCoverage: '2026-05-01/2026-08-17',
      distribution: {
        '@type': 'DataDownload',
        contentUrl: DATASET_URL,
        encodingFormat: 'text/markdown',
      },
    },
  };

  return (
    <article className="kr">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'The K-pop Knowledge Report 2026' }]} />

      <header className="kr-head">
        <h1 className="kr-title">The K-pop Knowledge Report 2026</h1>
        <p className="kr-standfirst">Fans know the people. They don&apos;t know the catalogue.</p>
        <p className="kr-dek">
          kpopquiz.org · 1 May to 17 August 2026 · 17,425 measured attempts ·{' '}
          <a href={DATASET_URL} className="kr-inline-link">full dataset</a>
        </p>
      </header>

      <section className="kr-section" aria-labelledby="kr-method">
        <h2 id="kr-method" className="kr-h2">Method, before any finding</h2>
        <p>
          This report measures quiz scores. It is not a survey and it contains no opinion data.
          Every claim reduces to the same sentence: on this many attempts, the average score was
          this.
        </p>
        <p className="kr-callout">
          <strong>Window: 1 May 2026 to 17 August 2026. 17,425 completed attempts across 76
          quizzes.</strong>
        </p>
        <p>
          We hold a longer history and we are deliberately not using most of it. In March and
          April the site took an unusual burst of traffic: 56 accounts produced just over half of
          that period&apos;s attempts, at a median of 249 attempts each, against a median of six
          per account afterwards. Ten of them scored within 2.4 points of each other and finished
          within four seconds of the same median time. That is not ordinary use, so it is excluded
          - at a cost of 70.7% of our raw volume.
        </p>
        <p>
          Minimum samples were fixed before any result was looked at: 100 attempts per group, 50
          per quiz, 100 votes per matchup. Anything below is named and never ranked. No table in
          this report mixes the two. Everything is computed from individual play records at read
          time, never from stored counters.
        </p>
      </section>

      <section className="kr-section" aria-labelledby="kr-finding">
        <h2 id="kr-finding" className="kr-h2">The finding: it depends what you ask about</h2>
        <p>
          The five hardest quizzes on the site all ask about output or history. Four of the five
          easiest ask who is in the group.
        </p>

        <ScoreTable caption="Hardest" rows={HARDEST} />
        <ScoreTable caption="Easiest" rows={EASIEST} />

        <p>
          The same fandoms appear on both lists. ARMY sits at 97.5% naming BTS members and 41.6%
          on BTS eras - a 56 point drop between two quizzes about the same group, taken by the
          same population, weeks apart. Fans have the roster memorised. Ask which album a B-side
          came from, or what year a group debuted, and the floor gives way.
        </p>
        <p>
          Every quiz in the hard list is also about a group with a deep catalogue, and that is not
          a coincidence - you cannot write a hard B-sides quiz about a group with one album. Which
          is also why we are not turning this into a ranking of fandoms. See below.
        </p>
        <p>
          Across the whole window, <strong>one attempt in five is a perfect score</strong>, and
          2.1% score zero.
        </p>
      </section>

      <section className="kr-section kr-cannot" aria-labelledby="kr-cannot">
        <h2 id="kr-cannot" className="kr-h2">What we cannot say, and why we are telling you</h2>
        <p>
          We set out to publish a ranking of fandoms by knowledge. We could not, and the reasons
          are more useful than the ranking would have been.
        </p>
        <p>
          <strong>The ranking is not real.</strong> In raw numbers the biggest fandoms score worst
          - BTS last, attempts correlating negatively with score. Adjust for the fact that big
          fandoms are given harder quizzes and 41.7% of that relationship disappears. What was
          left changed sign depending on which months we looked at, and the two periods ranked the
          groups in nearly opposite order. There is no stable ladder in our data.
        </p>
        <p>
          <strong>Neither is the gender comparison.</strong> Girl-group fandoms appeared to
          outscore boy-group fandoms by 5.6 points once we adjusted for difficulty, and the result
          survived removing any single group. Then we matched quizzes by format instead - members
          quizzes against members quizzes - and the advantage split three formats to three, with
          the four largest gaps pointing in opposite directions. A result that reverses depending
          on whether you look at photo quizzes or fan-knowledge quizzes is not a result about
          knowledge.
        </p>
        <p>
          <strong>Neither is the generation gradient.</strong> Fifth-generation fandoms score
          highest in our window, on 12 quizzes across 4 groups, with no history before May to
          check against. And second-generation fandoms score higher than all of them - on 85
          attempts, below our own minimum, which is the only reason they are not sitting on top of
          the chart.
        </p>
        <p>
          <strong>The root cause is us.</strong> We did not write comparable quizzes. Across the
          21 groups compared here, the share of attempts on easy quizzes runs from 0% to 92.3%,
          and published quizzes per group run from 3 to 27. Two boy groups of similar catalogue
          size make it concrete: 70.1% of Stray Kids attempts are on easy quizzes, against 7.6%
          for BTS. They are not sitting the same exam, and any table that ranks them is measuring
          our editorial history.
        </p>
        <p>
          <strong>We cannot tell you which questions people miss.</strong> We record a score per
          attempt, not an answer per question. The single most interesting thing we could publish,
          we do not yet store. We are changing that.
        </p>
        <p>
          <strong>This is our audience, not K-pop fans in general.</strong> People who choose to
          take a K-pop quiz are not a representative sample of anything, and we claim nothing
          beyond our own players.
        </p>
      </section>

      <section className="kr-section" aria-labelledby="kr-votes">
        <h2 id="kr-votes" className="kr-h2">The fan votes, for colour only</h2>
        <p>
          Separately from the quizzes, 891 people have cast 60,364 head-to-head votes, all of it
          inside the report window. Too small a panel to carry a claim, so we use it for texture:
          the most one-sided matchups nearly all come from a single &quot;best of the third
          generation&quot; prompt, and the most evenly split come from asking ARMY to name a bias
          - which is exactly the question a fandom refuses to settle.
        </p>
      </section>

      <footer className="kr-foot">
        <p>
          <em>
            Data: kpopquiz.org, 1 May - 17 August 2026, 17,425 attempts. Full figures, queries and
            sample sizes - including the findings we discarded - are{' '}
            <a href={DATASET_URL} className="kr-inline-link">published alongside this report</a>.
          </em>
        </p>
        <p className="kr-foot-links">
          <Link href="/data/pulse">Monthly K-pop Pulse</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/stats">Site statistics</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/quizzes">Play a quiz</Link>
        </p>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </article>
  );
}
