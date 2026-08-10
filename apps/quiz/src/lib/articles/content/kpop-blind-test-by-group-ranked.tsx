import Link from 'next/link';

// NOTE: the previous version claimed every group playlist draws from "18 curated songs". That was
// checked against the live blind-test catalogue and is not true: playlist sizes vary widely by
// group. The number has been dropped rather than replaced with a different fixed figure, since the
// catalogue keeps growing. Opinion ranking below is clearly framed as opinion, not as data.
export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        Group blind tests are not equally hard, and the reason has little to do with how big a
        group&apos;s catalogue is. What decides difficulty is how recognisable the songs are in
        their first few seconds. Groups built on hook-forward, heavily streamed title tracks are the
        easiest to guess. Groups with dense discographies or a consistent house sound are the
        hardest. Here is a practical ranking, offered as an opinion from playing them rather than as
        a measured statistic.
      </p>

      <h2 id="what-decides">What actually decides blind test difficulty?</h2>
      <p>
        Three things, in roughly this order. First, intro distinctiveness: a song with an
        unmistakable opening bar is guessable in two seconds, while one that opens on generic drums
        gives you nothing until the vocal arrives. Second, catalogue spread: if a group&apos;s
        playlist leans on famous singles you are in comfortable territory, and if it reaches into
        B-sides you need real familiarity. Third, sonic consistency, which cuts both ways. A group
        with a strong house sound is easy to identify as a group and hard to pin to a specific song.
      </p>
      <p>
        Playlist length varies from group to group rather than being fixed, because the catalogue is
        built out over time and some groups simply have more catalogued tracks than others. That
        means two group blind tests are not directly comparable as scores: a short playlist gives
        you fewer chances to recover from a bad start, while a longer one tests stamina as much as
        recognition.
      </p>

      <h2 id="easiest">Which group blind tests are the easiest?</h2>
      <p>
        The easiest playlists belong to groups whose biggest songs are recognisable from the opening
        seconds. If you have encountered K-pop on the radio, in an advert or on social media, you
        have almost certainly heard these even if you have never followed the group.
      </p>
      <ol>
        <li><strong>BLACKPINK</strong> - massive, hook-forward title tracks that are hard to miss.</li>
        <li><strong>NewJeans</strong> - a consistent, breezy sound that is easy to place.</li>
        <li><strong>TWICE</strong> - bright, sing-along choruses across a long career.</li>
        <li><strong>BTS</strong> - globally famous singles that most players recognise fast.</li>
      </ol>
      <p>
        Easy here means easy to identify, not shallow. These groups all have deep catalogues; it is
        simply that their best-known tracks did an unusual amount of cultural work, so the
        recognition threshold is low even for casual listeners.
      </p>

      <h2 id="medium">Which group blind tests are medium difficulty?</h2>
      <p>
        Mid-tier playlists mix well-known singles with B-sides that share a palette. You will get
        the hits quickly and then hit a wall where the remaining tracks all sound plausibly like one
        another, which is where real familiarity starts to matter.
      </p>
      <ol>
        <li><strong>Stray Kids</strong> - genre-shifting production rewards close listening.</li>
        <li><strong>aespa</strong> - bold concepts that vary considerably from era to era.</li>
        <li><strong>ITZY</strong> and <strong>IVE</strong> - strong hooks, but several tracks share a sonic palette.</li>
      </ol>

      <h2 id="hardest">Which group blind tests are the hardest?</h2>
      <p>
        The hardest playlists come from groups with dense catalogues or a cinematic, consistent
        house style, where B-sides blur together without deep fandom knowledge. These are the ones
        where a casual listener can identify the group instantly and still fail to name the track.
      </p>
      <ol>
        <li><strong>ATEEZ</strong> - long-running concept eras with bold, related textures.</li>
        <li><strong>SEVENTEEN</strong> - a huge catalogue with many self-produced B-sides.</li>
        <li><strong>Red Velvet</strong> - two distinct modes, sweet and experimental, that trip up casual fans.</li>
      </ol>
      <p className="art-highlight">
        <strong>Tip:</strong> if a group feels too hard, learn its title tracks era by era first.
        Each era usually carries a distinct production style, which narrows any clip to a window of
        two or three years before you even think about the song.
      </p>

      <h2 id="improve">How do you get better at group blind tests?</h2>
      <p>
        Recognition improves through exposure, but targeted exposure works much faster than simply
        listening more. The most efficient habit is to replay the opening ten seconds of the tracks
        you missed, because the intro is what a blind test actually tests. Most people know the
        chorus of far more songs than they can identify from an intro, and closing that gap is where
        the score improvement lives.
      </p>
      <ol>
        <li>Play a group blind test once and note which songs you could not place.</li>
        <li>Listen to just the intros of those songs, not the full tracks.</li>
        <li>Replay the same blind test a few days later rather than immediately.</li>
        <li>Only widen to the all-groups mix once one group feels comfortable.</li>
      </ol>

      <h2 id="how-to-play">How do I play a group blind test?</h2>
      <p>
        Open the blind test, pick a group from the playlist selector, and guess each song from a
        short clip. You can also play the all-groups mix if you want a broader challenge, which is
        considerably harder because you are identifying the group and the track at the same time.
        Starting with one group and widening out later is the route that keeps it enjoyable.
      </p>
      <div className="art-cta-inline">
        <Link href="/blindtest" className="art-cta-btn">Play the blind test</Link>
        <Link href="/blackpink-quiz" className="art-cta-btn art-cta-secondary">Start with BLACKPINK</Link>
      </div>
    </>
  );
}
