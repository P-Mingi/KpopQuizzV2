import Link from 'next/link';

import { getMostPlayedQuizzes30d } from '@/lib/db/queries/stats';

// Data-entangled: a group is only described as "climbing" when it is ACTUALLY present in the live
// trailing-30-day most-played list. No hardcoded ranking, no "as of July 2026" freeze, and no
// prediction. If nothing rookie-shaped is charting, the piece speaks in evergreen terms instead.
const ESTABLISHED = new Set([
  'bts', 'blackpink', 'twice', 'stray-kids', 'seventeen', 'exo', 'nct', 'ateez', 'enhypen',
  'txt', 'ive', 'aespa', 'itzy', 'red-velvet', 'g-i-dle', 'newjeans', 'le-sserafim', 'general-kpop',
]);

export async function ArticleBody(): Promise<React.ReactElement> {
  const top = await getMostPlayedQuizzes30d(10);
  const nf = (n: number): string => n.toLocaleString('en-US');
  // groups in the live top ten that are not one of the long-established majors: the honest
  // definition of "punching above its weight right now".
  const risers: { name: string; slug: string; plays: number; rank: number }[] = [];
  top.forEach((q, i) => {
    if (!q.groupSlug || ESTABLISHED.has(q.groupSlug)) return;
    if (risers.some((r) => r.slug === q.groupSlug)) return;
    risers.push({ name: q.groupName, slug: q.groupSlug, plays: q.plays, rank: i + 1 });
  });
  const lead = risers[0] ?? null;

  return (
    <>
      <p className="art-lead">
        Rookie fandoms show up in the data long before they show up in the headlines. On
        kpopquiz.org you can watch it happen directly: a group debuts, its fans start playing and
        writing quizzes, and within weeks those quizzes are competing with acts that have a decade
        of catalogue behind them. {lead
          ? <>Right now {lead.name} is the clearest example, sitting at number {lead.rank} in the trailing thirty-day most-played list with {nf(lead.plays)} plays.</>
          : <>This guide is about how to spot that pattern yourself rather than about predicting which group will break out next.</>}
      </p>

      <h2 id="which-rookies">Which newer groups are rising right now?</h2>
      {risers.length > 0 ? (
        <>
          <p>
            The most honest signal is real activity, not hype. The groups below are the ones outside
            the long-established majors that are currently charting in the live thirty-day
            most-played list, which means an unusually engaged share of their fandom is playing.
          </p>
          <div className="art-table-wrap">
            <table className="art-table">
              <thead>
                <tr><th>Group</th><th>Best rank this window</th><th>Plays on that quiz</th></tr>
              </thead>
              <tbody>
                {risers.map((r) => (
                  <tr key={r.slug}>
                    <td>{r.name}</td>
                    <td>#{r.rank}</td>
                    <td>{nf(r.plays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            That is the pattern worth watching. A newer fandom shows up first in engagement, playing
            and creating quizzes while the group is still building a public profile. It is a leading
            indicator precisely because it costs nothing to observe and cannot be bought.
          </p>
        </>
      ) : (
        <p>
          No group outside the established majors is charting in the current thirty-day window, so
          there is nobody to honestly call a riser this month. That happens regularly and it is not
          a verdict on any rookie: momentum comes in bursts around comebacks. The method below is
          what to watch for when the next burst arrives.
        </p>
      )}
      <div className="art-cta-inline">
        <Link href="/quizzes" className="art-cta-btn">Browse the newest quizzes</Link>
      </div>

      <h2 id="why-quizzes-signal">Why quiz activity is an early signal</h2>
      <p>
        Streaming numbers tell you how many people pressed play, which includes a great many passive
        listeners. Quiz activity tells you something narrower and more useful: how many people care
        enough to test themselves on a discography, and how many care enough to write the questions.
        Writing a good quiz about a group takes real knowledge and an hour of effort, so a rookie
        with several fan-made quizzes already has a committed core, not just an algorithmic bump.
      </p>
      <p>
        It is also a fast signal. A group can accumulate quizzes within weeks of debuting, long
        before chart positions or award nominations exist to argue about. If you want to know which
        newer acts have fandoms that behave like established fandoms, this is one of the earliest
        places it becomes visible.
      </p>

      <h2 id="how-to-spot">How to spot a rising rookie yourself</h2>
      <p>
        You do not need special access to do this. Everything below is visible on the public parts
        of the site, and the method works in any month regardless of who happens to be charting.
      </p>
      <ol>
        <li>Check the most-played list for any group you do not immediately recognise.</li>
        <li>Look at how many separate quizzes that group has, not just the plays on one.</li>
        <li>See whether the quizzes go beyond title tracks into B-sides and members, which signals depth of knowledge.</li>
        <li>Watch whether the activity survives past the comeback week or fades with it.</li>
        <li>Compare the play counts against a similarly sized established group to judge intensity fairly.</li>
      </ol>
      <p className="art-highlight">
        <strong>The tell:</strong> a rookie fandom that keeps playing between comebacks is the one
        that tends to still be here in two years. Comeback-week spikes are common; steady activity
        is not.
      </p>

      <h2 id="what-this-is-not">What this page deliberately does not do</h2>
      <p>
        There is no ranked prediction here of which rookies will make it, because that is guesswork
        dressed up as analysis and the scene reliably outruns it. There is also no fixed date-stamped
        chart, because a list frozen months ago quietly becomes wrong while still looking
        authoritative. Everything shown above is read from the live thirty-day window at the moment
        this page was last refreshed, and if the window is quiet the page says so rather than
        recycling an old ranking.
      </p>
      <p>
        The trade-off is that this piece is less dramatic than a countdown of the next big thing. It
        is, however, checkable, which matters more if you are actually trying to follow the scene
        rather than read a prediction that nobody revisits.
      </p>

      <h2 id="follow-along">Follow the rookies through their quizzes</h2>
      <p>
        The most enjoyable way to track a newer group is to play its quizzes as they appear. You
        will learn the lineup and the discography faster than passive listening manages, and you get
        a front-row view of a fandom assembling itself in real time.
      </p>
      <div className="art-cta-inline">
        <Link href="/quizzes" className="art-cta-btn">Browse all quizzes</Link>
        <Link href="/stats" className="art-cta-btn art-cta-secondary">See the live stats</Link>
      </div>
    </>
  );
}
