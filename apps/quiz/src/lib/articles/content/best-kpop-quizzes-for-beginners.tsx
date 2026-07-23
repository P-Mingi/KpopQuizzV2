import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        The best K-pop quizzes for beginners start with one group you already
        like, use easy difficulty, and focus on members and title tracks before
        deep cuts. On kpopquiz.org, the easy quizzes section and single-group
        quizzes on medium difficulty are the friendliest place to start without
        feeling lost.
      </p>

      <h2 id="where-to-start">What is the best K-pop quiz for a total beginner?</h2>
      <p>
        Begin with a single group you enjoy rather than a general K-pop quiz.
        Single-group quizzes keep the answer pool small and familiar, so you can
        build confidence. The easy quizzes section collects the most approachable
        options across the platform in one place.
      </p>
      <div className="art-cta-inline">
        <Link href="/easy-kpop-quizzes" className="art-cta-btn">Browse easy quizzes</Link>
      </div>

      <h2 id="how-to-progress">How should beginners level up?</h2>
      <p>
        Move in three steps. First, learn a group&apos;s members with a member or
        image quiz. Second, take a title-tracks quiz for that group. Third, try
        the group&apos;s blind test to test your ear. Only after that should you
        attempt hard, B-side-heavy quizzes or the all-groups mix.
      </p>
      <ol>
        <li>Pick one group you already listen to.</li>
        <li>Learn the members, then the title tracks.</li>
        <li>Try the group blind test, then widen out.</li>
      </ol>

      <h2 id="avoid">Which quizzes should beginners avoid at first?</h2>
      <p>
        Skip the hardest quizzes early on. B-side deep dives, timeline
        challenges, and the all-groups blind test are designed for fans with
        years of knowledge and can feel discouraging on day one. There is no
        penalty for starting easy and working up.
      </p>
      <p className="art-highlight">
        <strong>Tip:</strong> a good target is scoring 8 out of 10 on a
        single-group easy quiz before moving to medium difficulty.
      </p>

      <h2 id="try">Where can I find beginner-friendly K-pop quizzes?</h2>
      <p>
        The easy quizzes section is the best starting point, and the full quiz
        library lets you filter by group and difficulty. Try a blind test once
        you know a few groups to add a fun, low-pressure listening challenge.
      </p>
      <div className="art-cta-inline">
        <Link href="/easy-kpop-quizzes" className="art-cta-btn">Easy K-pop quizzes</Link>
        <Link href="/blindtest" className="art-cta-btn art-cta-secondary">Try the blind test</Link>
      </div>
    </>
  );
}
