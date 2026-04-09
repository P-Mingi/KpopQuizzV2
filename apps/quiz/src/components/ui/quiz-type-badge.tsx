import type { QuizType } from '@/lib/db/types';

export type QuizTypeKey = 'classic' | 'image' | 'intruder' | 'tf' | 'clue';

interface Props {
  /** DB quiz_type enum value OR visual type key. */
  type: QuizType | QuizTypeKey | string;
  /** Display label override. Defaults to a friendly name per type. */
  label?: string;
  /** Size variant. `xs` is the compact inline form for card metadata. */
  size?: 'xs' | 'sm';
  className?: string;
}

const DEFAULT_LABELS: Record<QuizTypeKey, string> = {
  classic: 'Classic',
  image: 'Image',
  intruder: 'Intruder',
  tf: 'True / False',
  clue: 'Clues',
};

const BG_CLASS: Record<QuizTypeKey, string> = {
  classic: 'bg-type-classic-bg text-type-classic-text',
  image: 'bg-type-image-bg text-type-image-text',
  intruder: 'bg-type-intruder-bg text-type-intruder-text',
  tf: 'bg-type-tf-bg text-type-tf-text',
  clue: 'bg-type-clue-bg text-type-clue-text',
};

/** Map the DB's `quiz_type` enum values to our visual type keys. */
export function mapDbTypeToKey(dbType: string | null | undefined): QuizTypeKey {
  switch (dbType) {
    case 'multiple_choice':
      return 'classic';
    case 'image':
      return 'image';
    case 'intruder':
      return 'intruder';
    case 'true_false':
      return 'tf';
    case 'guess_from_clues':
      return 'clue';
    case 'classic':
    case 'tf':
    case 'clue':
      return dbType as QuizTypeKey;
    default:
      return 'classic';
  }
}

/**
 * Small colored badge showing a quiz type. Used on quiz cards, playing
 * screen, and the quiz start screen. Accepts either the DB enum value
 * (`multiple_choice`, `true_false`, ...) or a visual key (`classic`, `tf`, ...).
 */
export function QuizTypeBadge({ type, label, size = 'xs', className }: Props): React.ReactElement {
  const key = mapDbTypeToKey(type);
  const text = label ?? DEFAULT_LABELS[key];
  const sizeClass =
    size === 'sm'
      ? 'text-[10px] px-2 py-[2px] rounded-md'
      : 'text-[9px] px-1.5 py-[1px] rounded';
  return (
    <span className={`inline-block font-semibold ${sizeClass} ${BG_CLASS[key]} ${className ?? ''}`}>
      {text}
    </span>
  );
}
