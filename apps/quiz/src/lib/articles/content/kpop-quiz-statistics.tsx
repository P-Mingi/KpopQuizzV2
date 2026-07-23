import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        As of July 2026, kpopquiz.org hosts 374 fan-made quizzes across 87 K-pop
        groups, with 3,964 songs in the blind test catalog and more than 54,000
        quiz plays recorded. This page rounds up the real, first-party numbers
        behind how fans actually score. The living version updates hourly on the
        stats page.
      </p>

      <h2 id="how-big">How big is the K-pop quiz catalog?</h2>
      <p>
        The platform tracks four headline numbers, all pulled from live queries
        and refreshed hourly. These are real counts, not estimates.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Metric</th><th>Value (as of Jul 2026)</th></tr>
          </thead>
          <tbody>
            <tr><td>Published quizzes</td><td>374</td></tr>
            <tr><td>Total quiz plays</td><td>54,000+</td></tr>
            <tr><td>Groups covered</td><td>87</td></tr>
            <tr><td>Blind test songs</td><td>3,964</td></tr>
          </tbody>
        </table>
      </div>
      <div className="art-cta-inline">
        <Link href="/stats" className="art-cta-btn">See the live stats</Link>
      </div>

      <h2 id="most-played-groups">Which K-pop groups get the most quiz plays?</h2>
      <p>
        Ranked by all-time quiz plays, a handful of 3rd and 4th generation groups
        dominate. General K-pop (mixed-group quizzes) leads overall, followed by
        BTS and Stray Kids. This ordering reflects genuine fan activity, not
        editorial picks.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Rank</th><th>Group</th><th>All-time quiz plays</th></tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>General K-pop</td><td>14,570</td></tr>
            <tr><td>2</td><td>BTS</td><td>8,468</td></tr>
            <tr><td>3</td><td>Stray Kids</td><td>5,684</td></tr>
            <tr><td>4</td><td>BLACKPINK</td><td>4,186</td></tr>
            <tr><td>5</td><td>SEVENTEEN</td><td>2,654</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="hardest-quiz">What is the hardest K-pop quiz by average score?</h2>
      <p>
        Across the 232 quizzes with at least 30 plays, the lowest average score
        belongs to a Stray Kids song quiz, where fans average just 41 percent.
        Average score is the maintained total divided by completions, normalized
        by question count, so it reflects real performance rather than a
        difficulty label.
      </p>
      <div className="art-cta-inline">
        <Link href="/hard-kpop-quizzes" className="art-cta-btn">Try the hard quizzes</Link>
      </div>

      <h2 id="girl-vs-boy">Do fans score higher on girl-group or boy-group quizzes?</h2>
      <p>
        Boy-group quizzes edge out girl-group quizzes on average. Across quizzes
        with 30 or more plays, boy-group quizzes average 71.8 percent while
        girl-group quizzes average 68.1 percent, a small but consistent gap. Girl
        groups draw more total plays, reflecting a larger catalog.
      </p>

      <h2 id="stay-current">Where can I see the live numbers?</h2>
      <p>
        Every figure above is a snapshot. The stats page recomputes hourly and
        adds the week&apos;s most-played fandom, the current hardest and easiest
        quizzes, and fan duel verdicts. It is free to cite with a link.
      </p>
      <div className="art-cta-inline">
        <Link href="/stats" className="art-cta-btn">Open the live stats</Link>
        <Link href="/quizzes" className="art-cta-btn art-cta-secondary">Browse all quizzes</Link>
      </div>
    </>
  );
}
