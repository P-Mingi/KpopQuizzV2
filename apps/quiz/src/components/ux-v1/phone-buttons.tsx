'use client';

import { answerShape } from '@/lib/ux-v1/a0/answer-shapes';

import { AnswerShape } from './answer-tiles';

interface PhoneButtonsProps {
  /** Called with 0 to 3 when the player taps an answer. */
  onAnswer: (index: number) => void;
  /** The player's locked answer (0 to 3): the buttons stop answering, the picked
   *  one stays bright, the others dim. null or absent = still open. */
  locked?: number | null | undefined;
  /** No tap is taken (between rounds, while a send is in flight). */
  disabled?: boolean | undefined;
  /** Accessible name of the group ("Your answer"). */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * v12 phone answer buttons (prototype `.pbtns` / `.pb`, live blindtest phone): four
 * big colour + shape buttons, two by two, no answer text (the text is on the host
 * screen). Each is named "Answer 1, triangle" so the pairing never rests on
 * colour. The grid fills its parent's free height when the parent is a flex
 * column (the phone page); give it a height otherwise. Client component.
 */
export function PhoneButtons({ onAnswer, locked = null, disabled, label = 'Your answer', className }: PhoneButtonsProps): React.ReactElement {
  const isLocked = locked !== null && locked !== undefined;
  return (
    <div role="group" aria-label={label} className={['ux-pbtns', isLocked ? 'is-locked' : '', className ?? ''].filter(Boolean).join(' ')}>
      {[0, 1, 2, 3].map((i) => {
        const s = answerShape(i);
        const me = isLocked && locked === i;
        return (
          <button
            key={i}
            type="button"
            className={`ux-pb ux-c-${s.tone}${me ? ' is-me' : ''}`}
            aria-label={`Answer ${i + 1}, ${s.name.toLowerCase()}`}
            aria-pressed={isLocked ? me : undefined}
            disabled={disabled || isLocked}
            onClick={() => onAnswer(i)}
          >
            <AnswerShape index={i} />
          </button>
        );
      })}
    </div>
  );
}
