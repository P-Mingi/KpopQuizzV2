import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        Cortis is a five-member boy group under BigHit Music, the HYBE label behind BTS and TXT. They
        debuted on August 18, 2025 with the digital single "What You Want", and their members are
        Martin, James, Juhoon, Seonghyeon and Keonho. If you have been seeing the name everywhere and
        want the short version before you test yourself on them, this is who Cortis are, what their
        name and fandom mean, and where to play a Cortis quiz.
      </p>

      <h2 id="who-are-the-members">Who are the members of Cortis?</h2>
      <p>
        Cortis has five members: Martin, James, Juhoon, Seonghyeon and Keonho. They debuted as a group
        with no prior lineup changes, so the five names above are the full roster. Because the group is
        still new, most fans are only starting to tell the members apart by voice and face, which is
        exactly what makes a Cortis quiz a fair challenge right now rather than a lap of memory.
      </p>
      <div className="art-cta-inline">
        <Link href="/cortis-quiz" className="art-cta-btn">Take the Cortis quiz</Link>
      </div>

      <h2 id="when-did-cortis-debut">When did Cortis debut?</h2>
      <p>
        Cortis debuted on August 18, 2025 under BigHit Music, HYBE's label. Their first release was the
        digital single "What You Want". As a 2025 debut they sit in the newest rookie wave rather than
        any older generation, which is why their songs turn up in a fresh blind test alongside the
        current comebacks instead of the back catalogue.
      </p>
      <p className="art-highlight">
        <strong>Tip:</strong> a brand-new group is where quiz scores separate fastest. Everyone knows
        the veterans; the players who have actually listened to a 2025 rookie are the ones who clean up
        on the Cortis questions.
      </p>

      <h2 id="what-does-cortis-mean">What does the name Cortis mean?</h2>
      <p>
        Cortis comes from the phrase "Color Outside The Lines", the idea of thinking freely and
        breaking away from other people's standards. It is the kind of origin that shows up in quiz
        questions, because the meaning behind a group name is a favourite way to catch out fans who
        only know the songs.
      </p>

      <h2 id="what-is-coer">What is Cortis's fandom name?</h2>
      <p>
        The official fandom name is Coer. It joins "Cor" from Cortis with "-er" for the people who
        stand with them, and it echoes the word "core", the fans at the centre of the group. If you
        have seen "are you a real Coer" style quizzes going around, that is where the word comes from,
        and knowing it is a quick way to prove you are early to the group.
      </p>
      <div className="art-cta-inline">
        <Link href="/cortis-quiz" className="art-cta-btn">Prove you are a real Coer</Link>
        <Link href="/blindtest" className="art-cta-btn art-cta-secondary">Play the K-pop blind test</Link>
      </div>

      <h2 id="how-to-learn-them">How do you get to know Cortis fast?</h2>
      <p>
        The quickest route is to play, not cram. Start with the Cortis quiz to lock in the five members
        and the basics, then use the blind test to train your ear on their sound so a clip is instantly
        theirs. Rookies reward that kind of early attention: you build the memory now, while the
        catalogue is small, and every future comeback is easy to place.
      </p>
      <div className="art-cta-inline">
        <Link href="/cortis-quiz" className="art-cta-btn">Start the Cortis quiz</Link>
        <Link href="/articles/kpop-blind-test-2026" className="art-cta-btn art-cta-secondary">The 2026 blind test</Link>
      </div>
    </>
  );
}
