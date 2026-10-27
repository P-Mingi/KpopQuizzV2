'use client';

// Run O1, lot H2a: the question of "60 seconds": four answers, one pick, then the right answer, the story and the way to the full quiz
// on its own site; "Try again" starts over (the design's script). The phone board shows the short story and no "Try again".
import { useState } from 'react';

import { siteClass } from './site-class';

interface HomeQuestionProps {
  readonly site: 'kpop' | 'anime';
  readonly text: string;
  readonly options: readonly string[];
  readonly correct: number;
  readonly explain: string;
  readonly explainShort: string;
  readonly href: string;
  /** "From K-pop Songs About Magic". */
  readonly fromLabel: string;
  readonly labels: {
    readonly question: string;
    readonly right: string;
    readonly wrong: string;
    readonly markRight: string;
    readonly markPick: string;
    readonly again: string;
    readonly full: string;
    readonly fullShort: string;
  };
}

export function HomeQuestion(props: HomeQuestionProps): React.ReactElement {
  const { options, correct, labels } = props;
  const [answer, setAnswer] = useState<number | null>(null);
  const answered = answer !== null;
  return (
    <article className={`hub-h2-qcard ${siteClass(props.site)}`}>
      <div className="hub-h2-qhead">
        <span className="hub-h2-ql">{labels.question}</span>
        <span className="hub-h2-qfrom"><span aria-hidden="true" className="hub-h2-sdot" />{props.fromLabel}</span>
      </div>
      <h3 className="hub-h2-qh">{props.text}</h3>
      <div className="hub-h2-opts">
        {options.map((label, i) => {
          const state = !answered ? '' : i === correct ? ' hub-h2-opt-ok' : i === answer ? ' hub-h2-opt-no' : ' hub-h2-opt-dim';
          const mark = answered && i === correct ? labels.markRight : answered && i === answer ? labels.markPick : '';
          const markClass = answered && i === correct ? ' hub-h2-mark-ok' : answered && i === answer ? ' hub-h2-mark-no' : '';
          return (
            <button key={label} type="button" className={`hub-h2-opt${state}`} onClick={() => { if (answer === null) setAnswer(i); }}>
              {label}<span className={`hub-h2-mark${markClass}`}>{mark}</span>
            </button>
          );
        })}
      </div>
      {answered ? (
        <div role="status" className="hub-h2-result">
          <strong className={`hub-h2-result-t ${answer === correct ? 'hub-h2-result-t-ok' : 'hub-h2-result-t-no'}`}>{answer === correct ? labels.right : labels.wrong}</strong>
          {props.explain ? (
            <span className="hub-h2-result-x">
              <span className="hub-h2-nophone">{props.explain}</span>
              <span className="hub-h2-phoneonly">{props.explainShort}</span>
            </span>
          ) : null}
          <div className="hub-h2-result-act">
            <a href={props.href} className="hub-h2-full">
              <span className="hub-h2-nophone">{labels.full}</span>
              <span className="hub-h2-phoneonly">{labels.fullShort}</span>
            </a>
            <button type="button" className="hub-h2-again hub-h2-nophone" onClick={() => setAnswer(null)}>{labels.again}</button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
