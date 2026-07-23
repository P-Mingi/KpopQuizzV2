import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        SEVENTEEN is the hardest major K-pop group to fully memorize, with 13
        members. EXO, NCT and TWICE follow at nine, then Stray Kids and ATEEZ at
        eight. These counts come from the Name All Members rosters used on
        kpopquiz.org as of July 2026, so they reflect the exact lineups fans are
        tested on.
      </p>

      <h2 id="most-members">Which K-pop group has the most members to memorize?</h2>
      <p>
        Member count is the single biggest factor in how hard a group is to
        recall under time pressure. The table below ranks groups by roster size,
        taken from the Name All Members game rosters.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Group</th><th>Members</th><th>Generation</th></tr>
          </thead>
          <tbody>
            <tr><td>SEVENTEEN</td><td>13</td><td>3rd Gen</td></tr>
            <tr><td>EXO</td><td>9</td><td>3rd Gen</td></tr>
            <tr><td>NCT</td><td>9</td><td>3rd Gen</td></tr>
            <tr><td>TWICE</td><td>9</td><td>3rd Gen</td></tr>
            <tr><td>Stray Kids</td><td>8</td><td>4th Gen</td></tr>
            <tr><td>ATEEZ</td><td>8</td><td>4th Gen</td></tr>
            <tr><td>ENHYPEN</td><td>7</td><td>4th Gen</td></tr>
            <tr><td>BTS</td><td>7</td><td>3rd Gen</td></tr>
          </tbody>
        </table>
      </div>
      <div className="art-cta-inline">
        <Link href="/games/name-all" className="art-cta-btn">Play Name All Members</Link>
      </div>

      <h2 id="why-hard">Why is SEVENTEEN so hard to memorize?</h2>
      <p>
        Thirteen members is a genuine memory challenge. Beyond the raw count,
        SEVENTEEN splits into three official units (hip-hop, vocal, and
        performance), so fans juggle names, positions and unit assignments at
        once. That layered structure is why SEVENTEEN consistently trips up
        players in timed roster games.
      </p>

      <h2 id="four-gen">Are 4th-generation groups easier to memorize?</h2>
      <p>
        On average, yes. Most 4th generation groups on the platform sit between
        five and eight members: Stray Kids and ATEEZ at eight, ENHYPEN at seven,
        IVE at six, and ITZY, LE SSERAFIM, (G)I-DLE, NewJeans and TXT at five
        each. Smaller lineups are quicker to recall, which is part of why rookie
        fandoms clear roster games fast.
      </p>
      <p className="art-highlight">
        <strong>Memory tip:</strong> for big groups, learn members in their unit
        or sub-group clusters rather than as one flat list. Chunking is how fans
        lock in a 13-member roster.
      </p>

      <h2 id="test">How can I test my roster memory?</h2>
      <p>
        The Name All Members game gives you a countdown and asks you to type every
        member before time runs out. Start with a mid-size group, then work up to
        SEVENTEEN once you can clear the smaller rosters clean.
      </p>
      <div className="art-cta-inline">
        <Link href="/games/name-all" className="art-cta-btn">Try a roster challenge</Link>
        <Link href="/seventeen-quiz" className="art-cta-btn art-cta-secondary">SEVENTEEN quizzes</Link>
      </div>
    </>
  );
}
