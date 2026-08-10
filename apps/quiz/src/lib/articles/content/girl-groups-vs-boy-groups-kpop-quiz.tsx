import Link from 'next/link';

import { getGroupTypeScores } from '@/lib/db/queries/stats';

// Data-entangled: the split is computed live from published quizzes with enough completions, with
// each group's type derived from its songs' gender tags. If either bucket is too sparse the helper
// returns null and this article falls back to evergreen prose with NO invented percentages.
export async function ArticleBody(): Promise<React.ReactElement> {
  const scores = await getGroupTypeScores();
  const nf = (n: number): string => n.toLocaleString('en-US');
  const lead = scores
    ? (scores.male.avgPct === scores.female.avgPct
      ? 'boy-group and girl-group quizzes'
      : (scores.male.avgPct > scores.female.avgPct ? 'boy-group quizzes' : 'girl-group quizzes'))
    : null;

  return (
    <>
      <p className="art-lead">
        Do fans score better on girl-group or boy-group quizzes? It is one of the most common
        questions people ask about K-pop trivia, and it is answerable here because every quiz on
        kpopquiz.org records real scores. {scores
          ? <>Right now {lead} come out ahead on average, though the gap is smaller than most people expect and it says more about who is playing than about which groups are harder.</>
          : <>The honest answer today is that the recorded sample is too thin to publish a split without inventing precision, so this piece explains what actually drives the difference instead.</>}
      </p>

      <h2 id="side-by-side">Do fans score higher on girl-group or boy-group quizzes?</h2>
      {scores ? (
        <>
          <p>
            The comparison below uses only published quizzes with enough completions for the average
            to mean something, so each figure is backed by real volume rather than a handful of
            runs. A group&apos;s type is derived from its catalogued songs, and mixed or general
            K-pop quizzes are excluded because they belong to neither bucket.
          </p>
          <div className="art-table-wrap">
            <table className="art-table">
              <thead>
                <tr><th>Metric</th><th>Girl groups</th><th>Boy groups</th></tr>
              </thead>
              <tbody>
                <tr><td>Average quiz score</td><td>{scores.female.avgPct}%</td><td>{scores.male.avgPct}%</td></tr>
                <tr><td>Quizzes counted</td><td>{nf(scores.female.quizzes)}</td><td>{nf(scores.male.quizzes)}</td></tr>
                <tr><td>Completions behind those averages</td><td>{nf(scores.female.plays)}</td><td>{nf(scores.male.plays)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="art-highlight">
            <strong>The honest reading:</strong> a difference of a few percentage points across
            {' '}{nf(scores.female.quizzes + scores.male.quizzes)} quizzes is a real pattern, but it is
            a small one. Anyone presenting it as proof that one half of K-pop is harder than the
            other is overselling the data.
          </p>
        </>
      ) : (
        <p>
          There is currently not enough clean data on both sides to publish a percentage split that
          would survive scrutiny, and a made-up number would be worse than none. Rather than dress
          up a thin sample as a finding, the rest of this piece covers what genuinely moves these
          averages, which is the part that stays true whatever the current numbers say.
        </p>
      )}

      <h2 id="why-gap">Why does a gap appear at all?</h2>
      <p>
        A higher average almost never means one set of groups is objectively easier. It usually
        means the audience is more concentrated. When a fandom is large and deeply invested, the
        people who take its quizzes are mostly committed fans who already know the discography, so
        the average climbs. When a group draws a broader, more casual audience, plenty of players
        arrive knowing a couple of title tracks and no more, and the average falls even if the
        questions are gentler.
      </p>
      <p>
        Catalogue depth matters just as much. A group with fifteen years of releases gives quiz
        writers room to ask about B-sides, unit tracks and Japanese singles, which pulls scores
        down. A group three years into its career has a smaller pool of well-known songs, so even a
        thorough quiz stays close to material most fans have heard. That is a property of the
        catalogue, not of the fandom&apos;s ability.
      </p>

      <h2 id="what-to-compare">What is actually worth comparing?</h2>
      <p>
        If you want a fair head-to-head, compare quizzes of the same shape rather than the same
        gender. A member-identification quiz for one group against a member-identification quiz for
        another is a real comparison. A B-side deep dive against a title-track round is not,
        regardless of who released the songs. Question format drives difficulty far more than any
        demographic split does.
      </p>
      <ol>
        <li>Match the format: members against members, title tracks against title tracks.</li>
        <li>Match the era coverage, since a quiz spanning ten years is harder than one spanning two.</li>
        <li>Check the completion count, because an average from a small sample is noise.</li>
        <li>Only then look at the score difference, and expect it to be modest.</li>
      </ol>

      <h2 id="test-it">Test it for yourself</h2>
      <p>
        The most enjoyable way to settle this is to play both sides and watch your own scores. Take
        a girl-group quiz and a boy-group quiz at the same difficulty, then check how much of the
        difference came from the questions and how much came from how well you already knew the
        discography. Most people find their personal gap is much larger than the platform-wide one,
        which is exactly the point: these averages describe crowds, not you.
      </p>
      <div className="art-cta-inline">
        <Link href="/quizzes" className="art-cta-btn">Browse all quizzes</Link>
        <Link href="/stats" className="art-cta-btn art-cta-secondary">See the live stats</Link>
      </div>
    </>
  );
}
