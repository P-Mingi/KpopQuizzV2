import Link from 'next/link';

export function ArticleBody(): React.ReactElement {
  return (
    <>
      <p className="art-lead">
        A guess-the-K-pop-idol quiz shows you a photo and asks you to name the idol or the group
        behind it. On kpopquiz.org this is the image quiz format: a picture, a set of
        multiple-choice answers, and the challenge of recognising faces, eras and concepts quickly.
        This guide covers how the format works, why it is harder than it looks, and the specific
        habits that turn lucky guesses into instant recognition.
      </p>

      <h2 id="how-it-works">How does a guess-the-idol quiz work?</h2>
      <p>
        The format is deliberately simple. Each question shows a photo with four possible answers
        and you pick who it is. What varies is what the photo is testing. Some quizzes ask you to
        name the individual idol, some ask which group a member belongs to, and the hardest ones use
        pre-debut, concept or throwback photos where the styling actively works against you.
      </p>
      <p>
        That variation matters more than difficulty labels do. Naming an idol requires knowing a
        person; naming their group requires knowing a roster. Those are different skills, and most
        people are noticeably better at one than the other. It is common to recognise a face
        instantly and still fail to place which of two similarly sized groups they debuted with.
      </p>
      <div className="art-cta-inline">
        <Link href="/guess-the-kpop-idol" className="art-cta-btn">Play guess the idol</Link>
      </div>

      <h2 id="why-hard">Why is guessing K-pop idols harder than it looks?</h2>
      <p>
        Concepts change everything. Idols transform their hair colour, styling and makeup
        dramatically between comebacks, so the same person can look like two different people one
        year apart. A fan who knows a group perfectly in its current era can genuinely fail to
        recognise the same members in debut-era styling, and that is not a knowledge gap so much as
        a visual one.
      </p>
      <p>
        Group styling compounds it. During a concept, members are often given deliberately
        harmonised hair, wardrobe and makeup so the group reads as a unit on stage. That is good
        design and terrible for identification: the cues you would normally use to tell people apart
        have been intentionally aligned. Add professional lighting and heavy post-processing, and
        even a longtime fan is working from a smaller set of reliable signals than they expect.
      </p>
      <p className="art-highlight">
        <strong>Tip:</strong> look past the hair colour. Facial proportions, eye shape and jawline
        stay constant across eras, so train yourself to anchor on structure rather than styling.
      </p>

      <h2 id="get-better">How can I get better at visual K-pop quizzes?</h2>
      <p>
        Start with groups you already follow, then branch out one group at a time. The mistake most
        people make is trying to improve at recognition in general, which is not a thing you can
        practise. What you can practise is a specific roster, and the general skill accumulates as a
        side effect of doing that repeatedly.
      </p>
      <ol>
        <li>Learn each member alongside their single most distinctive era, so you have a reference point.</li>
        <li>Use member name quizzes first, so the names are solid before you attempt photo-only rounds.</li>
        <li>Deliberately look at debut-era photos, which are the ones that catch people out.</li>
        <li>When you get one wrong, look at the photo again and find the feature you should have used.</li>
        <li>Repeat the same quiz a few days later, since spacing is what turns recognition into reflex.</li>
      </ol>
      <p>
        That fourth step is the one that actually creates improvement. Getting an answer wrong and
        moving straight on teaches nothing. Spending ten seconds identifying which stable feature
        would have given it away builds the anchor you will use next time, and it is the difference
        between playing a lot and getting better.
      </p>

      <h2 id="common-traps">The traps that catch experienced fans</h2>
      <p>
        Three patterns account for most wrong answers. The first is pre-debut and trainee photos,
        where the styling has not yet settled into the image the public knows. The second is
        members who have changed hair colour drastically between comebacks, which resets the visual
        shortcut you were relying on. The third is groups with members of similar height and
        colouring photographed in matching concept styling, where the intended effect is exactly the
        confusion you are experiencing.
      </p>
      <p>
        There is also a subtler trap: overconfidence on your own bias group. People routinely score
        worse on the group they know best, because they answer from instinct without looking
        carefully, while treating an unfamiliar group as a puzzle to be solved slowly. Slowing down
        on the faces you think you know is one of the cheapest score improvements available.
      </p>

      <h2 id="try">Where can I try a guess-the-idol quiz?</h2>
      <p>
        The dedicated guess-the-idol page is the fastest route to a curated visual challenge. If you
        would rather work on one group at a time, browse the quiz library and look for image-based
        quizzes for the groups you are learning, which is the more efficient path if you are trying
        to build recognition rather than just test it.
      </p>
      <div className="art-cta-inline">
        <Link href="/guess-the-kpop-idol" className="art-cta-btn">Guess the idol</Link>
        <Link href="/quizzes" className="art-cta-btn art-cta-secondary">Browse image quizzes</Link>
      </div>
    </>
  );
}
