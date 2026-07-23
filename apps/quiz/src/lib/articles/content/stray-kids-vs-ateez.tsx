import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        Stray Kids and ATEEZ are two of the biggest 4th-generation boy groups,
        each with eight members and a reputation for high-concept, self-produced
        music. On kpopquiz.org both have 18 blind test songs and a deep quiz
        library, but Stray Kids pulls far more quiz plays. Here is how the two
        stack up for fans deciding which challenge to take.
      </p>

      <h2 id="side-by-side">Stray Kids vs ATEEZ: the quick comparison</h2>
      <p>
        Both groups debuted in the 4th generation, both have eight members, and
        both are known for writing and producing their own title tracks. The
        table below uses verifiable platform data plus widely known group facts.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Metric</th><th>Stray Kids</th><th>ATEEZ</th></tr>
          </thead>
          <tbody>
            <tr><td>Generation</td><td>4th Gen</td><td>4th Gen</td></tr>
            <tr><td>Members</td><td>8</td><td>8</td></tr>
            <tr><td>Fandom</td><td>STAY</td><td>ATINY</td></tr>
            <tr><td>Blind test songs</td><td>18</td><td>18</td></tr>
            <tr><td>Self-produced title tracks</td><td>Yes (3RACHA)</td><td>Yes (EDEN-led writing)</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="which-harder">Which group is harder to quiz on?</h2>
      <p>
        Both reward deep listening, but for different reasons. Stray Kids lean
        into dense, genre-bending production and a large B-side pool, so telling
        similar-era tracks apart takes real familiarity. ATEEZ build long-running
        story concepts across their releases, so their quizzes often test lore
        and era order as much as the music itself.
      </p>
      <p className="art-highlight">
        <strong>Quick call:</strong> Stray Kids quizzes stress music recognition
        and catalog breadth; ATEEZ quizzes stress concept and timeline knowledge.
      </p>

      <h2 id="blind-test">How do they compare in the blind test?</h2>
      <p>
        With 18 curated songs each, the two groups are evenly matched on catalog
        size in the blind test. The difference is texture: Stray Kids tracks
        shift style aggressively within a single song, while ATEEZ tracks lean on
        bold, cinematic hooks that are easier to place once you know the era.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Try the blind test</Link>
      </div>

      <h2 id="take-both">Which quiz should I take first?</h2>
      <p>
        If you want raw music recognition, start with Stray Kids. If you enjoy
        lore, era order and concept detail, start with ATEEZ. The honest way to
        settle the 4th-gen boy-group debate is to take both and compare your
        scores.
      </p>
      <div className="art-cta-inline">
        <Link href="/stray-kids-quiz" className="art-cta-btn">Stray Kids quizzes</Link>
        <Link href="/ateez-quiz" className="art-cta-btn art-cta-secondary">ATEEZ quizzes</Link>
      </div>
    </>
  );
}
