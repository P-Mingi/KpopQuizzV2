import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        The best K-pop quizzes for beginners start with one group you already like, use easy
        difficulty, and focus on members and title tracks before deep cuts. On kpopquiz.org, the
        easy quizzes section and single-group quizzes are the friendliest place to start without
        feeling lost, and the path from there to the harder material is short if you take it in the
        right order.
      </p>

      <h2 id="where-to-start">What is the best K-pop quiz for a total beginner?</h2>
      <p>
        Begin with a single group you actually enjoy rather than a general K-pop quiz. This sounds
        obvious and almost nobody does it. General quizzes pull from every group and every era at
        once, so the answer pool is enormous and a beginner spends the whole round guessing. A
        single-group quiz keeps the pool small and familiar, which means your first score reflects
        what you know instead of how lucky you were.
      </p>
      <p>
        The other reason to start narrow is motivation. Getting seven out of ten on a group you love
        feels like progress and makes you want another round. Getting three out of ten on a mixed
        quiz full of groups you have never heard of feels like being told you are not a real fan,
        which is both untrue and a good way to stop playing. Difficulty should arrive after
        confidence, not before it.
      </p>
      <div className="art-cta-inline">
        <Link href="/easy-kpop-quizzes" className="art-cta-btn">Browse easy quizzes</Link>
      </div>

      <h2 id="how-to-progress">How should beginners level up?</h2>
      <p>
        Move in three steps, and do not skip the middle one. First learn a group&apos;s members with
        a member or image quiz, because names and faces are the scaffolding everything else hangs
        on. Second, take a title-tracks quiz for that group, which is the material you have most
        likely already absorbed by listening. Third, try the group&apos;s blind test to see how well
        your ear knows the songs rather than your memory of their titles.
      </p>
      <ol>
        <li>Pick one group you already listen to regularly.</li>
        <li>Learn the members, then the title tracks, then the release order.</li>
        <li>Try the group blind test to test recognition rather than recall.</li>
        <li>Add a second group and repeat, instead of jumping straight to a mixed quiz.</li>
        <li>Only then attempt B-side deep dives or the all-groups challenges.</li>
      </ol>
      <p>
        Adding a second group before widening out is the step most people miss. Two groups you know
        well is a far better foundation for a mixed quiz than one group you know perfectly, because
        general quizzes reward breadth. Three or four groups in and the mixed rounds stop feeling
        random and start feeling winnable.
      </p>

      <h2 id="which-formats">Which quiz formats suit beginners best?</h2>
      <p>
        Not all formats are equally forgiving. Multiple-choice member quizzes are the gentlest,
        because seeing the options jogs recognition even when recall fails. Title-track quizzes come
        next, since they cover the songs that got the most airtime. Blind tests are surprisingly
        beginner-friendly for a listener, because your ear often knows a chorus your memory cannot
        name.
      </p>
      <p>
        The formats to save for later are the ones that require production knowledge rather than
        listening: B-side identification, release-year ordering and lyric completion. These reward
        years of accumulated exposure, and there is no shortcut through them. They are excellent
        once you have the basics, and demoralising before.
      </p>
      <p className="art-highlight">
        <strong>Tip:</strong> a good target is scoring eight out of ten on a single-group easy quiz
        before moving up to medium difficulty. If you are consistently above that, the quiz is no
        longer teaching you anything.
      </p>

      <h2 id="avoid">Which quizzes should beginners avoid at first?</h2>
      <p>
        Skip the hardest quizzes early on. B-side deep dives, timeline challenges and the all-groups
        blind test are designed for fans with years of listening behind them, and taking one on day
        one tells you nothing useful except that hard things are hard. There is no penalty anywhere
        for starting easy and working up, and no leaderboard that cares how you got there.
      </p>
      <p>
        It is also worth ignoring your score on your very first attempt at any new format. The first
        run is spent learning how the format works, where the timer sits and how the answers are
        phrased. The second run is the one that measures your knowledge. Judging yourself on the
        first is like grading a driving test taken before the lesson.
      </p>

      <h2 id="try">Where can I find beginner-friendly K-pop quizzes?</h2>
      <p>
        The easy quizzes section is the best starting point, and the full quiz library lets you
        filter by group and by difficulty so you can stay inside your comfort zone as long as you
        want. When you are ready to test your ear rather than your memory, the blind test adds a
        low-pressure listening challenge that works even when you cannot name a single track title.
      </p>
      <div className="art-cta-inline">
        <Link href="/easy-kpop-quizzes" className="art-cta-btn">Easy K-pop quizzes</Link>
        <Link href="/blindtest" className="art-cta-btn art-cta-secondary">Try the blind test</Link>
      </div>
    </>
  );
}
