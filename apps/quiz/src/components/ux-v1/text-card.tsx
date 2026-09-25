import Link from 'next/link';

import { formatCount } from '@/lib/utils';
import { QUIZ_TYPE_ICON, QUIZ_TYPE_LABEL } from '@/lib/ux-v1/a0/icons';

import { Icon } from './icon';
import { levelOf } from './quiz-card';

interface TextCardProps {
  href: string;
  title: string;
  /** quizzes.quiz_type (multiple_choice, true_false, guess_from_clues, image, intruder). */
  quizType: string;
  difficulty: string;
  plays: number;
  /** Real average score in % (0-100), shown when known. */
  averagePct?: number | null;
  titleAs?: 'h2' | 'h3' | 'p';
  className?: string;
}

/**
 * Text card for single-group lists (hub quizzes, "More from the group"): type
 * glyph (pink) + "Classic · Medium", title, then "842 plays · average 66%".
 * Bordered (--line), pink-line on hover; plain rows on phones. Server component.
 */
export function TextCard({ href, title, quizType, difficulty, plays, averagePct, titleAs: T = 'h3', className }: TextCardProps): React.ReactElement {
  const lv = levelOf(difficulty);
  return (
    <Link href={href} className={['ux-tcard', className ?? ''].filter(Boolean).join(' ')}>
      <span className="ux-tcard-ty">
        <Icon name={QUIZ_TYPE_ICON[quizType] ?? 't-classic'} size="sm" />
        {QUIZ_TYPE_LABEL[quizType] ?? 'Classic'} · {lv.label}
      </span>
      <T className="ux-tcard-t">{title}</T>
      <span className="ux-meta">
        <i className="ux-num">{formatCount(plays)} plays</i>
        {typeof averagePct === 'number' ? <i className="ux-num">average {averagePct}%</i> : null}
      </span>
    </Link>
  );
}

/** Three-column text-card grid (2 under 900, rows on phones). */
export function TextCardGrid({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={['ux-tgrid', className ?? ''].filter(Boolean).join(' ')}>{children}</div>;
}
