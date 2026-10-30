'use client';

// Run O1, lot H2a: the question of "60 seconds": four answers, one pick, then the right answer, the story and the way to the full quiz
// on its own site; "Try again" starts over (the design's script).
// Home v3 (2026-10-29, Home.dc.html): the answers are rows lettered A to D; after the pick the right one turns green ("Right"), a wrong pick
// red ("Your pick") and the others fade, and the story shows under them.
import { useState } from 'react';

interface HomeQuestionProps {
  readonly text: string;
  readonly options: readonly string[];
  readonly correct: number;
  readonly explain: string;
  readonly href: string;
  readonly labels: {
    readonly right: string;
    readonly wrong: string;
    readonly markRight: string;
    readonly markPick: string;
    readonly again: string;
    readonly full: string;
  };
}

const KEYS = 'ABCDEFGH';

export function HomeQuestion(props: HomeQuestionProps): React.ReactElement {
  const { options, correct, labels } = props;
  const [answer, setAnswer] = useState<number | null>(null);
  const answered = answer !== null;
  return (
    <>
      <p className="hub-h2-qtext">{props.text}</p>
      <ul className="hub-h2-lines">
        {options.map((label, i) => {
          const state = !answered ? '' : i === correct ? ' hub-h2-opt-ok' : i === answer ? ' hub-h2-opt-no' : ' hub-h2-opt-dim';
          const mark = answered && i === correct ? labels.markRight : answered && i === answer ? labels.markPick : '';
          return (
            <li key={label}>
              <button type="button" className={`hub-h2-line hub-h2-opt${state}`} onClick={() => { if (answer === null) setAnswer(i); }}>
                <span aria-hidden="true" className="hub-h2-key">{KEYS.charAt(i)}</span>
                <span className="hub-h2-optl">{label}</span>
                <span className="hub-h2-mark">{mark}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {answered ? (
        <div role="status" className="hub-h2-result hub-h2-rise">
          <strong className={`hub-h2-result-t ${answer === correct ? 'hub-h2-result-t-ok' : 'hub-h2-result-t-no'}`}>{answer === correct ? labels.right : labels.wrong}</strong>
          {props.explain ? <span className="hub-h2-result-x">{props.explain}</span> : null}
          <span className="hub-h2-result-act">
            <a href={props.href} className="hub-h2-full">{labels.full}</a>
            <button type="button" className="hub-h2-again" onClick={() => setAnswer(null)}>{labels.again}</button>
          </span>
        </div>
      ) : null}
    </>
  );
}
