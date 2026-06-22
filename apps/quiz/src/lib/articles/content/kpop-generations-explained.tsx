import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        K-pop has evolved through five distinct generations, each defined by new sounds,
        business models, and global breakthroughs. Understanding these generations helps
        fans appreciate how the industry grew from a niche Korean export into the
        dominant force in global pop music. Here is every generation explained, with the
        key groups and defining moments of each era.
      </p>

      <h2 id="1st-gen">1st Generation (1996 - 2003): The Foundation</h2>
      <p>
        The first generation of K-pop laid the groundwork for everything that followed.
        Idol groups debuted through a trainee system pioneered by SM Entertainment, YG
        Entertainment, and JYP Entertainment. The music drew heavily from American
        R&amp;B, hip-hop, and pop, adapted for Korean audiences.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Debut</th>
              <th>Agency</th>
              <th>Known for</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>H.O.T.</td><td>1996</td><td>SM</td><td>First idol group phenomenon</td></tr>
            <tr><td>S.E.S.</td><td>1997</td><td>SM</td><td>First major girl group</td></tr>
            <tr><td>Sechs Kies</td><td>1997</td><td>Daesung</td><td>Rival to H.O.T.</td></tr>
            <tr><td>g.o.d</td><td>1999</td><td>JYP</td><td>National group status</td></tr>
            <tr><td>BoA</td><td>2000</td><td>SM</td><td>First solo idol to break into Japan</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="2nd-gen">2nd Generation (2003 - 2012): The Hallyu Wave</h2>
      <p>
        The second generation turned K-pop into a regional and then global export.
        YouTube launched in 2005 and gave groups unprecedented international reach.
        TVXQ, Super Junior, and BIGBANG built massive fanbases across Asia. Girls&apos;
        Generation and 2NE1 proved girl groups could match boy groups in scale.
        PSY&apos;s &quot;Gangnam Style&quot; in 2012 showed the world was paying attention.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Debut</th>
              <th>Agency</th>
              <th>Known for</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>TVXQ</td><td>2003</td><td>SM</td><td>Asia-wide dominance, Japan records</td></tr>
            <tr><td>Super Junior</td><td>2005</td><td>SM</td><td>13-member supergroup</td></tr>
            <tr><td>BIGBANG</td><td>2006</td><td>YG</td><td>Genre-defining artistry</td></tr>
            <tr><td>Girls&apos; Generation (SNSD)</td><td>2007</td><td>SM</td><td>The Nation&apos;s Girl Group</td></tr>
            <tr><td>SHINee</td><td>2008</td><td>SM</td><td>Performance innovation</td></tr>
            <tr><td>2NE1</td><td>2009</td><td>YG</td><td>Girl crush concept pioneer</td></tr>
            <tr><td>f(x)</td><td>2009</td><td>SM</td><td>Experimental concepts</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="3rd-gen">3rd Generation (2012 - 2017): Global Breakthrough</h2>
      <p>
        The third generation is when K-pop truly went global. BTS went from a small-agency
        underdog to the biggest act on the planet. BLACKPINK became the highest-charting
        female K-pop act. EXO dominated physical album sales. TWICE set streaming records
        across Asia. Social media and streaming platforms replaced TV shows as the primary
        way fans discovered and consumed K-pop.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Debut</th>
              <th>Agency</th>
              <th>Known for</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>EXO</td><td>2012</td><td>SM</td><td>Million-seller, concept king</td></tr>
            <tr><td>BTS</td><td>2013</td><td>Big Hit</td><td>Global phenomenon, social media era</td></tr>
            <tr><td>SEVENTEEN</td><td>2015</td><td>Pledis</td><td>Self-producing, performance units</td></tr>
            <tr><td>TWICE</td><td>2015</td><td>JYP</td><td>Asia streaming dominance</td></tr>
            <tr><td>BLACKPINK</td><td>2016</td><td>YG</td><td>Highest-charting girl group globally</td></tr>
            <tr><td>NCT</td><td>2016</td><td>SM</td><td>Unlimited-member system</td></tr>
            <tr><td>Red Velvet</td><td>2014</td><td>SM</td><td>Dual-concept pioneers (red + velvet)</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="4th-gen">4th Generation (2018 - 2022): The Streaming Era</h2>
      <p>
        Fourth-generation groups debuted into an industry already global. Competition
        was fierce. Stray Kids, ATEEZ, and ENHYPEN built loyal international fanbases
        through digital-first strategies. aespa introduced metaverse concepts. IVE and
        NewJeans challenged expectations with streamlined, hook-driven pop. Album sales
        exploded past 10 million copies for top groups.
      </p>
      <div className="art-table-wrap">
        <table className="art-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Debut</th>
              <th>Agency</th>
              <th>Known for</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Stray Kids</td><td>2018</td><td>JYP</td><td>Self-produced, genre-bending</td></tr>
            <tr><td>ATEEZ</td><td>2018</td><td>KQ</td><td>Performance powerhouse</td></tr>
            <tr><td>ITZY</td><td>2019</td><td>JYP</td><td>Teen crush concept</td></tr>
            <tr><td>aespa</td><td>2020</td><td>SM</td><td>AI/metaverse concept</td></tr>
            <tr><td>ENHYPEN</td><td>2020</td><td>BELIFT</td><td>Survival show debut, vampire lore</td></tr>
            <tr><td>IVE</td><td>2021</td><td>Starship</td><td>Self-love anthems, mega hits</td></tr>
            <tr><td>NewJeans</td><td>2022</td><td>ADOR</td><td>Y2K nostalgia, instant virality</td></tr>
          </tbody>
        </table>
      </div>

      <h2 id="5th-gen">5th Generation (2023+): The Current Wave</h2>
      <p>
        The fifth generation is still taking shape. Groups like BABYMONSTER (YG),
        RIIZE (SM), ILLIT (BELIFT), TWS (Pledis), and KATSEYE (HYBE/Geffen) are
        building fanbases in a post-pandemic landscape where debuts instantly reach
        global audiences. The line between K-pop and global pop continues to blur.
      </p>

      <h2 id="test-your-knowledge">Test Your K-pop Generation Knowledge</h2>
      <p>
        Think you can identify songs across all five generations? Try the K-pop blind
        test to see how well you know each era, or challenge yourself with group-specific
        quizzes.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">K-pop blind test</Link>
        <Link href="/quizzes" className="art-cta-btn art-cta-secondary">Browse quizzes</Link>
      </div>
    </>
  );
}
