import Link from 'next/link';

import { getSiteStats, getQuizScoreExtremes } from '@/lib/db/queries/stats';

// Data-entangled article: an async server component reading the live DB. Every number below comes
// from the database at build/revalidate time. No hardcoded figures, no invented averages, and no
// hourly-refresh claim on the headline totals (their cache TTL is a week).
export async function ArticleBody(): Promise<React.ReactElement> {
  const [stats, extremes] = await Promise.all([getSiteStats(), getQuizScoreExtremes()]);
  const nf = (n: number): string => n.toLocaleString('en-US');
  const topByPlays = stats.topQuizzesByGroup.slice(0, 8);
  const groupsWithQuizzes = stats.topQuizzesByGroup.length;

  return (
    <>
      <p className="art-lead">
        This is a live snapshot of kpopquiz.org: how many quizzes exist, how many times people have
        played them, how many groups and songs the catalogue covers, and which quizzes are genuinely
        hard once you look at real average scores. Every figure here is read straight from the
        database and refreshed regularly, so it stays honest instead of frozen in a screenshot taken
        months ago.
      </p>

      <h2 id="how-big">How big is the K-pop quiz catalogue?</h2>
      <p>
        The headline totals below count only what actually exists: published quizzes, real recorded
        plays, active songs in the catalogue, and every group the platform knows about. They move as
        the library grows and as people play, so read them as a current measurement rather than a
        fixed claim. They are cached and refreshed on a schedule rather than recomputed on every
        request, which keeps the page fast without letting the numbers drift far from reality.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Metric</th><th>Current value</th></tr>
          </thead>
          <tbody>
            <tr><td>Published quizzes</td><td>{nf(stats.totalQuizzes)}</td></tr>
            <tr><td>Total quiz plays recorded</td><td>{nf(stats.totalPlays)}</td></tr>
            <tr><td>Groups in the catalogue</td><td>{nf(stats.totalGroups)}</td></tr>
            <tr><td>Active songs</td><td>{nf(stats.totalSongs)}</td></tr>
            <tr><td>Generations covered</td><td>{stats.generationsCovered}</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        One clarification worth making, because a lot of quiz sites blur it: the group count is how
        many groups exist in the catalogue, not how many currently have quizzes attached. Plenty of
        groups are catalogued for the blind test and the song data long before anyone writes a quiz
        about them, so the number of groups with at least one published quiz is smaller than the
        catalogue total. Both numbers are useful, but only if you say which one you mean.
      </p>
      <div className="art-cta-inline">
        <Link href="/stats" className="art-cta-btn">See the live stats page</Link>
      </div>

      <h2 id="most-played-groups">Which K-pop groups get the most quiz plays?</h2>
      <p>
        Ranking groups by the total plays across their quizzes shows where fan energy actually
        concentrates. It tends to be a mix of the biggest acts and whichever fandoms are most
        quiz-happy right now, and it shifts over a season rather than staying fixed. The ordering
        below reflects genuine recorded activity, not editorial picks.
      </p>
      {topByPlays.length > 0 ? (
        <div className="art-table-wrap">
          <table className="art-table">
            <thead>
              <tr><th>#</th><th>Group</th><th>Quizzes</th><th>All-time plays</th></tr>
            </thead>
            <tbody>
              {topByPlays.map((g, i) => (
                <tr key={g.groupSlug || i}>
                  <td>{i + 1}</td>
                  <td>{g.groupName}</td>
                  <td>{nf(g.quizCount)}</td>
                  <td>{nf(g.totalPlays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Play counts are still being collected for this view. The live stats page has the current picture.</p>
      )}
      <p className="art-highlight">
        <strong>Reading it right:</strong> a high play count means a group has both a deep set of
        quizzes and an audience that keeps coming back. It says nothing about whether those quizzes
        are easy or hard, which is a completely separate measurement.
      </p>

      <h2 id="hardest-quiz">What is the hardest K-pop quiz by average score?</h2>
      <p>
        The most honest measure of difficulty is not the label on a quiz but how people actually
        score on it. The tables below rank quizzes by their real average percentage, counting only
        quizzes with at least {extremes.minPlays} completions so that a handful of lucky or unlucky
        runs cannot distort the picture. Out of {nf(extremes.candidates)} quizzes that clear that
        bar, these sit at the two extremes.
      </p>
      {extremes.hardest.length > 0 ? (
        <div className="art-table-wrap">
          <table className="art-table">
            <thead>
              <tr><th>Hardest quizzes (lowest average)</th><th>Group</th><th>Average score</th></tr>
            </thead>
            <tbody>
              {extremes.hardest.map((q) => (
                <tr key={q.slug}>
                  <td><Link href={`/q/${q.slug}`}>{q.title}</Link></td>
                  <td>{q.groupName}</td>
                  <td>{q.avgPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {extremes.easiest.length > 0 ? (
        <div className="art-table-wrap">
          <table className="art-table">
            <thead>
              <tr><th>Easiest quizzes (highest average)</th><th>Group</th><th>Average score</th></tr>
            </thead>
            <tbody>
              {extremes.easiest.map((q) => (
                <tr key={q.slug}>
                  <td><Link href={`/q/${q.slug}`}>{q.title}</Link></td>
                  <td>{q.groupName}</td>
                  <td>{q.avgPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div className="art-cta-inline">
        <Link href="/hard-kpop-quizzes" className="art-cta-btn">Try the hard quizzes</Link>
        <Link href="/easy-kpop-quizzes" className="art-cta-btn art-cta-secondary">Start with the easy ones</Link>
      </div>

      <h2 id="how-measured">How are these numbers measured?</h2>
      <p>
        Average score is the maintained running total of points divided by the number of
        completions, then normalised by the quiz&apos;s real question count so that a five-question
        quiz and a twenty-question quiz sit on the same zero to one hundred scale. Values that come
        out impossible, which happens when a quiz was edited after people had already played it, are
        dropped rather than patched. That is why a quiz you remember struggling with might be absent
        from the tables above: it may not have enough clean completions yet to be ranked fairly.
      </p>
      <p>
        Plays count every finished attempt, including repeat runs by the same person, because
        replaying a quiz you love is a real part of how fandom works and pretending otherwise would
        undercount genuine activity. There is no weighting, no smoothing and no editorial
        adjustment anywhere in these tables. When a number here looks surprising, the surprise is in
        the data, not in the presentation of it.
      </p>
      <p>
        Because the ranking depends on a minimum number of completions, newer quizzes take a while
        to appear. A quiz published this week is genuinely playable but statistically invisible
        until enough people finish it, which is the correct trade-off: a 3-play average is noise,
        not information. Currently {nf(extremes.candidates)} quizzes clear the bar, and that pool
        grows steadily as the catalogue is played.
      </p>

      <h2 id="stay-current">Where can I see the live numbers?</h2>
      <p>
        Every figure above is a snapshot from the same database that powers the site, and the stats
        page carries the fuller picture, including the current hardest and easiest quizzes and the
        week&apos;s most-played fandom. Between the {nf(groupsWithQuizzes)} most-played groups shown
        here and the full library, there is more than enough to find your next challenge. All of it
        is free to cite with a link back.
      </p>
      <div className="art-cta-inline">
        <Link href="/stats" className="art-cta-btn">Open the live stats</Link>
        <Link href="/quizzes" className="art-cta-btn art-cta-secondary">Browse all quizzes</Link>
      </div>
    </>
  );
}
