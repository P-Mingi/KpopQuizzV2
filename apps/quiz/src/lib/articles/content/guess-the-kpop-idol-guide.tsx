import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        A guess-the-K-pop-idol quiz shows you a photo and asks you to name the
        idol or group behind it. On kpopquiz.org this is the image quiz format:
        you get a picture and multiple-choice answers, and the challenge is
        recognizing faces, eras and concepts fast. This guide covers how the
        visual quiz works and how to get better at it.
      </p>

      <h2 id="how-it-works">How does a guess-the-idol quiz work?</h2>
      <p>
        The image quiz format is simple: each question shows a photo and four
        possible answers. You pick who it is. Some quizzes test individual idols,
        others test which group a member belongs to, and the hardest ones use
        pre-debut, concept or throwback photos where the visual is less obvious.
      </p>
      <div className="art-cta-inline">
        <Link href="/guess-the-kpop-idol" className="art-cta-btn">Play guess the idol</Link>
      </div>

      <h2 id="why-hard">Why is guessing K-pop idols harder than it looks?</h2>
      <p>
        Concepts change everything. K-pop idols transform their hair, styling and
        makeup dramatically between eras, so the same person can look completely
        different from one comeback to the next. Group members also share styling
        during a concept, which makes telling them apart a real test even for
        longtime fans.
      </p>
      <p className="art-highlight">
        <strong>Tip:</strong> look past the hair color. Facial features and
        proportions stay constant across eras, so train yourself to anchor on
        those instead of the styling.
      </p>

      <h2 id="get-better">How can I get better at visual K-pop quizzes?</h2>
      <p>
        Start with groups you already follow, then branch out one group at a time.
        Learn each member alongside their most distinctive era, and use member
        quizzes to lock in names before you attempt photo-only rounds. Repetition
        is what turns a lucky guess into instant recognition.
      </p>

      <h2 id="try">Where can I try a guess-the-idol quiz?</h2>
      <p>
        Play the dedicated guess-the-idol page for a curated visual challenge, or
        browse the quiz library and filter for the image quiz type to find
        photo-based quizzes for specific groups.
      </p>
      <div className="art-cta-inline">
        <Link href="/guess-the-kpop-idol" className="art-cta-btn">Guess the idol</Link>
        <Link href="/quizzes" className="art-cta-btn art-cta-secondary">Browse image quizzes</Link>
      </div>
    </>
  );
}
