import { Children, cloneElement, isValidElement } from 'react';

import { QUIZ_TYPE_WORD, SeriesCover } from './series-cover';

import type { ReactElement, ReactNode } from 'react';

type Node = ReactElement<{ className?: string; children?: ReactNode }>;

const isNode = (n: unknown): n is Node => isValidElement(n);

/**
 * Lane O2: the element tree that the shared UxQuizCard drew (components/ux-v1/quiz-card.tsx), dressed with the art of the series of
 * the quiz. When the card has no picture of its own (no cover, no group photo) the shared card draws the typographic block
 * `ux-qcov-fb`: this puts the art in its place as a strip (a square in the stacked phone list), the quiz type in place of the
 * series name above the title, and prints the whole title. A card with a picture of its own comes back as it is. The shared card
 * is not copied and not edited for this: its tree is read, so the kpop card stays what it was, and with it the kpop chunks.
 */
export function dressQuizCard(card: ReactElement, quiz: { readonly group_slug: string; readonly group_name: string; readonly quiz_type: string }): ReactElement {
  if (!isNode(card)) return card;
  const body = card.props.children;
  if (!isNode(body)) return card;
  const [cover, text] = Children.toArray(body.props.children);
  if (!isNode(cover) || !isNode(text)) return card;
  const fallback = Children.toArray(cover.props.children)[0];
  if (!isNode(fallback) || fallback.props.className !== 'ux-qcov-fb') return card;
  const label = fallback.props.children;
  const glyph = isNode(label) ? Children.toArray(label.props.children)[0] : null;
  const [eyebrow, title, footer] = Children.toArray(text.props.children);
  if (!isNode(eyebrow) || !isNode(title)) return card;
  return cloneElement(card, undefined, <>
    {cloneElement(cover, { className: 'ux-qcov anime-o2-art-cov' }, <SeriesCover slug={quiz.group_slug} name={quiz.group_name} />)}
    {cloneElement(text, undefined,
      cloneElement(eyebrow, { className: 'ux-qg anime-o2-art-type' }, glyph, QUIZ_TYPE_WORD[quiz.quiz_type] ?? 'Classic'),
      cloneElement(title, { className: [title.props.className, 'anime-o2-art-name'].filter(Boolean).join(' ') }),
      footer,
    )}
  </>);
}
