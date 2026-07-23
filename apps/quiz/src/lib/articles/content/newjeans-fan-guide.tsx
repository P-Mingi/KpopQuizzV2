import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        NewJeans are a 4th-generation K-pop girl group with five members: Minji,
        Hanni, Danielle, Haerin and Hyein. They debuted in 2022 and quickly
        became one of the most recognizable acts of their generation thanks to a
        breezy, retro-leaning pop sound. This guide covers the members and how to
        go from casual listener to quiz-ready fan.
      </p>

      <h2 id="members">Who are the members of NewJeans?</h2>
      <p>
        NewJeans have five members. Learning them is the first step to clearing
        any NewJeans quiz, since member questions are the most common format.
      </p>
      <ul>
        <li><strong>Minji</strong></li>
        <li><strong>Hanni</strong></li>
        <li><strong>Danielle</strong></li>
        <li><strong>Haerin</strong></li>
        <li><strong>Hyein</strong></li>
      </ul>

      <h2 id="sound">What makes NewJeans easy to recognize?</h2>
      <p>
        NewJeans built their name on a consistent, easy-listening pop style that
        leans on nostalgic, retro textures. That cohesion is a gift for quizzes:
        once you know the group&apos;s palette, their songs are among the fastest
        to place in a blind test. It also means the tricky questions tend to be
        about members and details rather than the music itself.
      </p>
      <p className="art-highlight">
        <strong>Quiz tip:</strong> because their sound is so consistent, focus
        your study on members, eras and release order rather than trying to
        distinguish songs by genre.
      </p>

      <h2 id="how-to-study">How do I get quiz-ready as a NewJeans fan?</h2>
      <p>
        Work in order. Start with a member quiz to lock in the five names, then
        take a title-tracks quiz, then try the NewJeans blind test to check your
        ear. If you want a challenge, compare yourself against another 4th-gen
        girl group to see how your recognition holds up.
      </p>

      <h2 id="play">Where can I take a NewJeans quiz?</h2>
      <p>
        The NewJeans quiz hub collects fan-made quizzes for the group, from easy
        member quizzes to deeper challenges. Pair it with the blind test for a
        listening test, or read how NewJeans compare with aespa.
      </p>
      <div className="art-cta-inline">
        <Link href="/newjeans-quiz" className="art-cta-btn">NewJeans quizzes</Link>
        <Link href="/articles/aespa-vs-newjeans-quiz" className="art-cta-btn art-cta-secondary">aespa vs NewJeans</Link>
      </div>
    </>
  );
}
