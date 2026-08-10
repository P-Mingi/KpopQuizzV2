import Link from 'next/link';

import { getGroupMemberCounts } from '@/lib/db/queries/stats';

// Data-entangled: roster sizes come live from the idols table (active members), which is the
// actual source of the counts. Source claim corrected: the counts are the catalogued group
// rosters on kpopquiz.org, not a by-product of any single game mode.
export async function ArticleBody(): Promise<React.ReactElement> {
  const rosters = await getGroupMemberCounts(12);
  const biggest = rosters[0] ?? null;
  const sevenPlus = rosters.filter((r) => r.members >= 7).length;

  return (
    <>
      <p className="art-lead">
        Some K-pop groups are simply harder to hold in your head than others, and the main reason is
        blunt: there are more people to remember.{biggest
          ? <> {biggest.groupName} currently has the largest catalogued roster with {biggest.members} active members, and several other groups sit close behind.</>
          : null} The counts below are the active member rosters recorded on kpopquiz.org, so they
        reflect the lineups the site actually tests you on rather than a fan wiki snapshot.
      </p>

      <h2 id="most-members">Which K-pop group has the most members to memorize?</h2>
      <p>
        Member count is the single biggest factor in how hard a group is to recall under time
        pressure. Every extra member adds another name, another face and another stage name variant
        to keep straight, and the difficulty rises faster than the count does because you also have
        to avoid repeating yourself when the clock is running.
      </p>
      {rosters.length > 0 ? (
        <div className="art-table-wrap">
          <table className="art-table">
            <thead>
              <tr><th>Group</th><th>Active members</th><th>Generation</th></tr>
            </thead>
            <tbody>
              {rosters.map((r) => (
                <tr key={r.groupSlug}>
                  <td>{r.groupName}</td>
                  <td>{r.members}</td>
                  <td>{r.generation ?? 'K-pop'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>Roster data is still being catalogued for this view, so there is nothing accurate to rank here yet.</p>
      )}
      <p>
        {sevenPlus > 0
          ? <>{sevenPlus} of the groups listed above carry seven or more active members, which is roughly the point where most people stop being able to rattle off a lineup without pausing.</>
          : <>Most catalogued groups sit in the four to seven member range, which is comfortably inside what most fans can recall unprompted.</>} Larger
        rosters are not a flaw, they are a format: they give a group more subunits, more vocal
        colours and more room to rotate a line distribution. They just make memorisation work.
      </p>

      <h2 id="why-hard">Why are big rosters so hard to recall?</h2>
      <p>
        Human recall works in chunks, and most people can comfortably hold about four to seven items
        in one go. A five-member group fits inside that limit, so the names come out in a single
        burst. A nine or thirteen-member group does not fit, so you end up hunting for the last two
        or three names while the timer runs down. That is why the difficulty curve feels so steep
        between a seven-member group and a thirteen-member one: you have crossed from one recall
        strategy into needing another.
      </p>
      <p>
        Stage names make it harder again. A member may be known by a stage name, a birth name and an
        occasional nickname, and different fandoms default to different ones. When you are typing
        under pressure, ambiguity costs seconds, and seconds are usually what separate a full clear
        from missing the last member.
      </p>

      <h2 id="how-to-learn">How do you actually learn a large lineup?</h2>
      <p>
        The trick that works for nearly everyone is to stop learning the roster as one flat list and
        start learning it in units. Most large groups are already organised into official subunits or
        stable line groupings, and those are far easier to hold than an alphabetical run.
      </p>
      <ol>
        <li>Split the roster into its official units or line groupings, three or four names each.</li>
        <li>Learn one unit at a time until you can say it without hesitating.</li>
        <li>Chain the units together, then practise saying the whole roster in unit order.</li>
        <li>Only then try it against a timer, which is where gaps show up fastest.</li>
        <li>Re-learn the two names you always miss last, since those are the ones that cost you a clear.</li>
      </ol>
      <p className="art-highlight">
        <strong>Practical target:</strong> if you can name a thirteen-member roster in unit order
        without pausing, you can almost certainly name any smaller group cold.
      </p>

      <h2 id="where-counts-come-from">Where do these counts come from?</h2>
      <p>
        The numbers above are read from the group rosters catalogued on kpopquiz.org, counting
        members currently marked active. Custom and unreviewed community entries are excluded, along
        with the general K-pop catch-all, so the table lists real groups with maintained lineups.
        Because rosters change with debuts, hiatuses and departures, the counts update as the
        catalogue does rather than being pinned to a date in the past.
      </p>
      <p>
        This is worth stating plainly because roster counts are often quoted from memory and then
        repeated for years after they stopped being true. A count that comes from the same data the
        games are built on is the one worth trusting, and when it disagrees with something you half
        remember, the catalogue is usually the thing that moved.
      </p>

      <h2 id="test-yourself">Test your memory</h2>
      <p>
        The fastest way to find out whether you really know a lineup is to try to type it out
        against a clock. Start with a group you are confident about to calibrate, then move to one
        of the larger rosters above and see how far you get before the names run out.
      </p>
      <div className="art-cta-inline">
        <Link href="/games/name-all" className="art-cta-btn">Play Name All Members</Link>
        <Link href="/quizzes" className="art-cta-btn art-cta-secondary">Browse member quizzes</Link>
      </div>
    </>
  );
}
