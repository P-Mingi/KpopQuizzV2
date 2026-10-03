import { ANSWER_SHAPES, answerShape } from '@/lib/ux-v1/a0/answer-shapes';

/** The shape of answer `index` (0 to 3) as a filled 24 x 24 SVG. Decorative by
 *  default: the tile or button around it carries the name. */
export function AnswerShape({ index, label, className }: { index: number; label?: string | undefined; className?: string | undefined }): React.ReactElement {
  const s = answerShape(index);
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label} focusable="false">
      <path d={s.d} />
    </svg>
  );
}

interface HostTilesProps {
  /** The four answers, in order (answer i wears colour and shape i). */
  options: readonly string[];
  /** After the round: the right answer and how many phones picked each one. The
   *  wrong tiles dim, the right one gets the green ring, counts and bars show. */
  reveal?: { correct: number; counts: readonly number[] } | undefined;
  className?: string | undefined;
}

/**
 * v12 host answer tiles (prototype `.ltiles` / `.lt`, live blindtest big screen):
 * two by two, each a solid colour with its shape and the answer text in white.
 * A list, each item named "Triangle: <answer>" for assistive tech. Server-safe.
 */
export function HostTiles({ options, reveal, className }: HostTilesProps): React.ReactElement {
  const total = reveal ? reveal.counts.reduce((a, b) => a + (Number.isFinite(b) && b > 0 ? b : 0), 0) : 0;
  return (
    <ul className={['ux-ltiles', reveal ? 'is-reveal' : '', className ?? ''].filter(Boolean).join(' ')}>
      {options.slice(0, 4).map((o, i) => {
        const s = answerShape(i);
        const n = reveal ? Math.max(0, reveal.counts[i] ?? 0) : 0;
        const ok = reveal?.correct === i;
        return (
          <li key={i} className={`ux-lt ux-c-${s.tone}${ok ? ' is-ok' : ''}`}>
            <AnswerShape index={i} />
            <span><span className="ux-sr">{s.name}: </span>{o}{ok ? <span className="ux-sr"> (right answer)</span> : null}</span>
            {reveal ? (
              <>
                <span className="ux-lt-cnt">{n}<span className="ux-sr"> {n === 1 ? 'answer' : 'answers'}</span></span>
                <span className="ux-lt-bar" style={{ width: `${total > 0 ? Math.round((n / total) * 100) : 0}%` }} aria-hidden="true" />
              </>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export { ANSWER_SHAPES };
