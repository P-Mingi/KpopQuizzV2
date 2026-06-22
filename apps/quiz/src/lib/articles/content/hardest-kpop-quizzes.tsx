import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        Think you know K-pop? These are the 10 hardest K-pop quizzes available
        online in 2026, ranked by average score and completion rate. Each one
        has humbled fans who thought they knew everything. How many can you
        beat?
      </p>

      <h2 id="ranking-criteria">How We Ranked These</h2>
      <p>
        We looked at average score, completion rate (how many people finish
        versus quit), and player feedback from kpopquiz.org and other quiz
        platforms. A quiz is &quot;hard&quot; when even dedicated fans of that
        group consistently score below 70%.
      </p>

      <h2 id="10">10. SEVENTEEN Member Positions Quiz</h2>
      <p>
        SEVENTEEN has 13 members split across vocal, hip-hop, and performance
        units. Most fans know their bias&apos;s unit, but matching all 13
        members to their correct positions (including dual roles) trips up even
        Carats. The questions get specific: who is the lead dancer versus the
        main dancer? Which members are in the vocal unit but also rap?
      </p>
      <p className="art-highlight">
        <strong>Why it is hard:</strong> 13 members with overlapping roles.
        Unit boundaries are blurrier than fans assume.
      </p>

      <h2 id="9">9. K-pop Debut Dates Timeline</h2>
      <p>
        Can you put 20 K-pop groups in chronological debut order? This quiz
        gives you groups from 2nd gen through 5th gen and asks you to rank them
        by debut date. The trap: groups that debuted in the same year (2018
        alone saw Stray Kids, ATEEZ, (G)I-DLE, and IZ*ONE) are nearly
        impossible to order correctly.
      </p>
      <p className="art-highlight">
        <strong>Why it is hard:</strong> same-year debuts and the sheer number
        of groups make precise ordering a guessing game.
      </p>

      <h2 id="8">8. NCT Full Lineup Quiz</h2>
      <p>
        NCT&apos;s unlimited-member concept means there are over 25 members
        across NCT 127, NCT DREAM, WayV, and NCT New Team. Naming all of them
        is one thing. Matching each member to their correct subunit(s),
        including members who have been in multiple subunits, is where this
        quiz gets brutal.
      </p>
      <p className="art-highlight">
        <strong>Why it is hard:</strong> 25+ members, overlapping subunits, and
        lineup changes over the years.
      </p>

      <h2 id="7">7. BTS B-Side Deep Cuts</h2>
      <p>
        Forget &quot;Butter&quot; and &quot;Dynamite.&quot; This quiz tests your
        knowledge of BTS album tracks, hidden tracks, and solo mixtape songs
        that even casual ARMY skip. Questions cover production credits, album
        placement, and lyrics from songs with under 10 million streams.
      </p>
      <p className="art-highlight">
        <strong>Why it is hard:</strong> BTS has 200+ songs. The deep cuts
        require listening to every album front to back, multiple times.
      </p>

      <h2 id="6">6. K-pop Music Video Details</h2>
      <p>
        This quiz shows screenshots from K-pop music videos and asks you to
        identify the song, the scene, or the member. Sounds easy until you
        realize how many MVs share similar aesthetics (dark room with neon
        lights, anyone?). Questions about specific outfits, set pieces, and
        background details separate the real fans from the casual viewers.
      </p>

      <h2 id="5">5. Stray Kids Discography in Order</h2>
      <p>
        Stray Kids have released music at a pace that makes even dedicated
        STAYs lose track. This quiz asks you to place songs in the correct
        album and chronological order. The challenge: SKZ releases mini albums,
        full albums, and special albums so frequently that the timeline blurs
        together.
      </p>

      <h2 id="4">4. 2nd Generation K-pop Trivia</h2>
      <p>
        How well do you know the 2nd gen? Questions cover BIGBANG, Girls&apos;
        Generation, SHINee, 2NE1, Super Junior, f(x), and INFINITE. This is
        where newer fans struggle: the 2nd gen had different variety show
        formats, different chart systems, and a different fan culture. If you
        started following K-pop after 2018, expect to learn a lot.
      </p>
      <p className="art-highlight">
        <strong>Why it is hard:</strong> pre-social-media K-pop is a blind spot
        for fans who grew up on Twitter and TikTok.
      </p>

      <h2 id="3">3. K-pop Producer Match</h2>
      <p>
        Match the song to its producer or production team. Do you know which
        songs Teddy Park produced for BLACKPINK? Can you identify a Monotree
        track from the production style? This quiz demands knowledge that goes
        beyond the idols and into the creative teams behind the music.
      </p>

      <h2 id="2">2. All-K-pop Blind Test (B-Sides Only)</h2>
      <p>
        The standard blind test is already challenging. The B-sides-only mode
        removes every title track from the pool, leaving only album tracks,
        pre-release singles, and OSTs. You get 10 seconds of audio from a song
        that was never promoted on music shows. Average scores drop below 40%.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Try the blind test</Link>
      </div>

      <h2 id="1">1. Name All Members: Every Active K-pop Group</h2>
      <p>
        The single hardest K-pop challenge: name every member of every active
        K-pop group, one group at a time, against a 60-second timer. You type
        names from memory with no hints. Getting through BTS (7 members) and
        BLACKPINK (4 members) is the warm-up. Then come SEVENTEEN (13),
        NCT (25+), and groups you have heard of but never studied closely.
        Nobody has completed the full run with a perfect score.
      </p>
      <div className="art-cta-inline">
        <Link href="/games/name-all" className="art-cta-btn">Try Name All Members</Link>
        <Link href="/hard-kpop-quizzes" className="art-cta-btn art-cta-secondary">Hard quizzes</Link>
      </div>

      <h2 id="ready">Think You Can Handle It?</h2>
      <p>
        These quizzes are not for casual fans. They reward deep listening,
        obsessive attention to detail, and years of following K-pop. Start with
        the ones you feel confident about, then work your way up to the top 3.
        Your score will tell you exactly how much of a stan you really are.
      </p>
    </>
  );
}
