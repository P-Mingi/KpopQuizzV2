import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        Fans score slightly higher on boy-group quizzes than girl-group quizzes.
        As of July 2026, boy-group quizzes on kpopquiz.org average 71.8 percent
        while girl-group quizzes average 68.1 percent, measured across quizzes
        with at least 30 plays. Girl groups draw more total plays, but the
        per-quiz gap is real and consistent.
      </p>

      <h2 id="side-by-side">Do fans score higher on girl-group or boy-group quizzes?</h2>
      <p>
        The comparison below uses only quizzes with 30 or more completions, so
        each average is backed by real volume. Group type is derived from the
        blind test catalog, where every song carries a gender tag. General
        mixed-group quizzes are excluded.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Metric (as of Jul 2026)</th><th>Girl groups</th><th>Boy groups</th></tr>
          </thead>
          <tbody>
            <tr><td>Average quiz score</td><td>68.1%</td><td>71.8%</td></tr>
            <tr><td>Median quiz score</td><td>66%</td><td>71%</td></tr>
            <tr><td>Quizzes (30+ plays)</td><td>65</td><td>34</td></tr>
            <tr><td>Total plays</td><td>16,005</td><td>9,421</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="why-boy-higher">Why do boy-group quizzes score higher?</h2>
      <p>
        A higher average does not mean boy groups are easier in absolute terms. It
        usually means the audience is more concentrated. Boy-group fandoms like
        ARMY and STAY are large and deeply invested, so the players who take those
        quizzes tend to be committed fans who answer more questions correctly.
      </p>
      <p>
        Girl-group quizzes attract a broader mix of casual and hardcore players,
        which pulls the average down even when the questions are comparable in
        difficulty.
      </p>

      <h2 id="more-girl-quizzes">Why are there more girl-group quizzes?</h2>
      <p>
        Girl groups account for nearly twice as many high-volume quizzes (65
        versus 34) and 16,005 total plays against 9,421 for boy groups. The 4th
        generation girl-group wave, from aespa and IVE to NewJeans and LE
        SSERAFIM, gave creators a lot of fresh material, and fans keep playing it.
      </p>
      <p className="art-highlight">
        <strong>Takeaway:</strong> girl groups win on quiz volume and total plays;
        boy groups win on average score. Both signals point to healthy, active
        fandoms.
      </p>

      <h2 id="test-yourself">How can I test my own score?</h2>
      <p>
        The honest way to settle it is to play both sides and compare. Take a
        girl-group quiz and a boy-group quiz back to back, then check where you
        land against the averages above.
      </p>
      <div className="art-cta-inline">
        <Link href="/quizzes" className="art-cta-btn">Browse all quizzes</Link>
        <Link href="/leaderboard" className="art-cta-btn art-cta-secondary">See the community</Link>
      </div>

      <h2 id="live">Are these numbers current?</h2>
      <p>
        These averages are a July 2026 snapshot. The stats page tracks the same
        underlying data and refreshes hourly, including the week&apos;s most-played
        fandom across both group types.
      </p>
      <div className="art-cta-inline">
        <Link href="/stats" className="art-cta-btn">Live K-pop quiz stats</Link>
      </div>
    </>
  );
}
