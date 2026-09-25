import { Fragment } from 'react';

import { Icon } from '@/components/ux-v1/icon';
import { UxButton } from '@/components/ux-v1/button';
import { levelOf } from '@/components/ux-v1/quiz-card';
import { QUIZ_TYPE_LABEL } from '@/lib/ux-v1/a0/icons';

import { QotdNote } from './qotd-note';

import type { HomeQotd } from '@/lib/ux-v1/p1/home-data';

/**
 * Quiz of the day (DESIGN-SPEC 17.2, 17.10, 17.11): ONE calm bordered row on the
 * pink gradient. Left: "Quiz of the day" label + note, the real title, one meta
 * line (type, level, question count, real average, real time). Right: one pink
 * Play (the daily entry, ?daily=quiz, as today's home). No group tag, no preview.
 * Server component; only the note is a client island.
 */
export function QotdRow({ qotd }: { qotd: HomeQotd }): React.ReactElement {
  const level = levelOf(qotd.difficulty);
  const meta = [
    QUIZ_TYPE_LABEL[qotd.quizType] ?? 'Classic',
    level.label,
    qotd.questionCount > 0 ? `${qotd.questionCount} ${qotd.questionCount === 1 ? 'question' : 'questions'}` : null,
    qotd.averagePct != null ? `${qotd.averagePct}% average` : null,
    qotd.time,
  ].filter((x): x is string => !!x);

  return (
    <section className="p1-qotd" aria-labelledby="p1-qotd-t">
      <div className="p1-qd-main">
        <div className="p1-qtop">
          <span className="p1-qlab"><Icon name="zap" />Quiz of the day</span>
          <QotdNote featured={qotd.featuredDate} served={qotd.servedDate} rotates={qotd.rotates} />
        </div>
        <h2 id="p1-qotd-t">{qotd.title}</h2>
        <p className="p1-qline ux-num">
          {meta.map((m, i) => (
            <Fragment key={m}>
              <span>{m}{i < meta.length - 1 ? <i aria-hidden="true">·</i> : null}</span>
              {i < meta.length - 1 ? ' ' : null}
            </Fragment>
          ))}
        </p>
      </div>
      <UxButton href={`/q/${qotd.slug}?daily=quiz`} icon="play" className="p1-qd-go" aria-label={`Play the quiz of the day: ${qotd.title}`}>
        Play
      </UxButton>
    </section>
  );
}
