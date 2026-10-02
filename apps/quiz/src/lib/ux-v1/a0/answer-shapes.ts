// The four live answers (SYSTEM.md 5.5: "Phones show 4 colour + shape answers").
// Answer i always wears the same colour AND the same shape, on the host screen
// and on every phone, so the pairing never rests on colour alone. Order and
// drawings are the prototype's (SHAPES / LVCOL), on a 24 x 24 viewBox, filled.

export type AnswerTone = 'a' | 'b' | 'c' | 'd';

export interface AnswerShapeDef {
  /** Spoken name ("Triangle"), used in the accessible name of a tile or button. */
  name: string;
  /** Colour key: class `ux-c-<tone>`, token `--ux-lt-<tone>`. */
  tone: AnswerTone;
  /** SVG path data. */
  d: string;
}

export const ANSWER_SHAPES: readonly [AnswerShapeDef, AnswerShapeDef, AnswerShapeDef, AnswerShapeDef] = [
  { name: 'Triangle', tone: 'a', d: 'M12 3l10 18H2z' },
  { name: 'Diamond', tone: 'b', d: 'M12 2l10 10-10 10L2 12z' },
  { name: 'Circle', tone: 'c', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z' },
  { name: 'Square', tone: 'd', d: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z' },
];

export type AnswerIndex = 0 | 1 | 2 | 3;

/** The shape of answer `i` (0 to 3). */
export function answerShape(i: number): AnswerShapeDef {
  return ANSWER_SHAPES[(((Math.trunc(i) % 4) + 4) % 4) as AnswerIndex];
}
