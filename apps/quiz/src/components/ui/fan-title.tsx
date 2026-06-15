import { getTitleForLevel } from '@/lib/level-titles';

// L5 - the worn Fan title chip. Small, token-styled, NOT a loud badge.
// Reuses getTitleForLevel; renders the English label (KR optional).
interface Props {
  level: number;
  showKr?: boolean;
  className?: string;
}

export function FanTitle({ level, showKr = false, className }: Props): React.ReactElement {
  const t = getTitleForLevel(level);
  return (
    <span className={`fan-title-chip${className ? ' ' + className : ''}`} aria-label={`Fan title: ${t.en}, Level ${level}`}>
      {t.en}
      {showKr && <span className="fan-title-kr">{t.kr}</span>}
    </span>
  );
}
