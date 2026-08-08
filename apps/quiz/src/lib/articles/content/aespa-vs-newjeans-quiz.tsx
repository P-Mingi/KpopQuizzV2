import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        aespa and NewJeans are two defining 4th-generation girl groups with very
        different sounds: aespa lean into bold, hyperpop-adjacent concepts while
        NewJeans built their name on breezy, retro-leaning pop. On kpopquiz.org
        each has 18 blind test songs. aespa has four members, NewJeans five, and
        both draw strong quiz activity from the 4th-gen girl-group wave.
      </p>

      <h2 id="side-by-side">aespa vs NewJeans: the quick comparison</h2>
      <p>
        The table pairs verifiable platform data from kpopquiz.org with widely
        known group facts. Both debuted in the 4th generation and both anchor
        the current girl-group quiz surge on the platform.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr><th>Metric</th><th>aespa</th><th>NewJeans</th></tr>
          </thead>
          <tbody>
            <tr><td>Generation</td><td>4th Gen</td><td>4th Gen</td></tr>
            <tr><td>Members</td><td>4</td><td>5</td></tr>
            <tr><td>Fandom</td><td>MY</td><td>Bunnies</td></tr>
            <tr><td>Albums on platform</td><td>11</td><td>2</td></tr>
            <tr><td>Blind test songs (Deezer)</td><td>18</td><td>18</td></tr>
            <tr><td>Signature sound</td><td>Bold, concept-heavy pop</td><td>Retro, easy-listening pop</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        aespa have a much deeper catalog with 11 albums (including EPs and
        singles) compared to NewJeans&apos; compact 2 EPs. That catalog depth is
        what makes aespa quizzes harder: there are more eras and concept shifts
        to learn.
      </p>

      <h2 id="which-easier">Which group is easier to quiz on?</h2>
      <p>
        For newer fans, NewJeans is often the gentler entry point: five members
        and a cohesive, instantly recognizable sound make their songs easy to
        place. aespa cover more sonic ground across their releases, so their
        blind test can feel harder even with the same 18-song catalog.
      </p>
      <p className="art-highlight">
        <strong>Quick call:</strong> NewJeans rewards vibe recognition; aespa
        rewards knowing distinct eras and title-track concepts.
      </p>

      <h2 id="blind-test">How do they compare in the blind test?</h2>
      <p>
        Both groups have 18 curated songs, so catalog size is even. NewJeans
        tracks share a consistent palette that helps you guess fast once you know
        the group. aespa tracks vary more from era to era, which raises the
        difficulty ceiling for their blind test.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Try the blind test</Link>
      </div>

      <h2 id="take-both">Which quiz should I take first?</h2>
      <p>
        Start with NewJeans if you want an accessible warm-up, then move to aespa
        for a tougher test of era and concept knowledge. The only real way to
        settle the 4th-gen girl-group face-off is to take both quizzes and compare.
      </p>
      <div className="art-cta-inline">
        <Link href="/aespa-quiz" className="art-cta-btn">aespa quizzes</Link>
        <Link href="/newjeans-quiz" className="art-cta-btn art-cta-secondary">NewJeans quizzes</Link>
      </div>
    </>
  );
}
