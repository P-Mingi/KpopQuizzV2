import type { QuizType } from '@/lib/db/types';

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  multiple_choice: { bg: '#E6F1FB', text: '#0C447C', label: 'Classic' },
  true_false:      { bg: '#EAF3DE', text: '#27500A', label: 'True or False' },
  guess_from_clues:{ bg: '#FAEEDA', text: '#633806', label: 'Clues' },
  image:           { bg: '#FBEAF0', text: '#72243E', label: 'Image' },
  intruder:        { bg: '#EEEDFE', text: '#3C3489', label: 'Intruder' },
};

export function QuizTypeBadge({ type }: { type: QuizType | string }): React.ReactElement {
  const style = TYPE_STYLES[type] ?? TYPE_STYLES.multiple_choice!;
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}
