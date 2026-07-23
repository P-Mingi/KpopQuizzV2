import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        As of July 2026, the most-played K-pop quizzes on kpopquiz.org over the
        last 30 days are led by a General K-pop label-matching quiz, a Stray Kids
        true-or-false, and the Ultimate BTS era quiz. These rankings come from
        real play counts and shift week to week, so treat them as a live
        snapshot rather than an all-time list.
      </p>

      <h2 id="most-played">What are the most-played K-pop quizzes this month?</h2>
      <p>
        Here are the ten quizzes with the most plays in the trailing 30 days,
        counted directly from the plays table. Play counts are modest by design:
        activity spreads across roughly 190 quizzes a month, so a spot in the top
        ten is genuinely competitive.
      </p>
      <ol>
        <li><strong>K-pop company quiz: match the group to the label</strong> (General K-pop) - 44 plays</li>
        <li><strong>SKZ true or false: only real STAYs pass</strong> (Stray Kids) - 41 plays</li>
        <li><strong>Ultimate BTS era quiz: only real ARMYs survive</strong> (BTS) - 38 plays</li>
        <li><strong>Cortis fun quiz</strong> (Cortis) - 31 plays</li>
        <li><strong>Are you a real coer?</strong> (Cortis) - 29 plays</li>
        <li><strong>Stray Kids albums and B-sides deep dive</strong> (Stray Kids) - 28 plays</li>
        <li><strong>BLACKPINK ultimate fan challenge</strong> (BLACKPINK) - 23 plays</li>
        <li><strong>ENHYPEN quiz: ultimate fan challenge</strong> (ENHYPEN) - 21 plays</li>
        <li><strong>Which K-pop group debuted first? Timeline challenge</strong> (General K-pop) - 21 plays</li>
        <li><strong>BTS true or false: bet you can&apos;t get 100%</strong> (BTS) - 21 plays</li>
      </ol>

      <h2 id="what-it-shows">What does the most-played list tell you?</h2>
      <p>
        Two patterns stand out. Group-specific challenge quizzes (Stray Kids,
        BTS, BLACKPINK, ENHYPEN) travel well because fandoms rally around a
        pass-or-fail framing. And General K-pop quizzes that test breadth, like
        label-matching and debut timelines, pull players from every fandom rather
        than one.
      </p>
      <p className="art-highlight">
        <strong>Trend to watch:</strong> newer 4th and 5th generation acts such
        as Cortis are climbing the monthly chart, a sign that rookie fandoms are
        active early.
      </p>

      <h2 id="play-the-top">Where can I play the most-played quizzes?</h2>
      <p>
        The quickest route is each group&apos;s quiz hub, which lists that
        group&apos;s most popular quizzes first. Start with the fandoms leading
        the chart this month.
      </p>
      <div className="art-cta-inline">
        <Link href="/stray-kids-quiz" className="art-cta-btn">Stray Kids quizzes</Link>
        <Link href="/bts-quiz" className="art-cta-btn art-cta-secondary">BTS quizzes</Link>
      </div>

      <h2 id="live-data">How current are these numbers?</h2>
      <p>
        This list reflects the trailing 30 days as of July 2026. For the always-on
        version, the stats page recomputes hourly and shows the week&apos;s
        most-played fandom alongside other live figures.
      </p>
      <div className="art-cta-inline">
        <Link href="/quizzes" className="art-cta-btn">Browse all quizzes</Link>
        <Link href="/stats" className="art-cta-btn art-cta-secondary">Live stats</Link>
      </div>
    </>
  );
}
