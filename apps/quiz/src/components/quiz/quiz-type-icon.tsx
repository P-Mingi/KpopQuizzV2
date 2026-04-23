'use client';

import { mapDbTypeToKey } from '@/components/ui/quiz-type-badge';
import type { QuizTypeKey } from '@/components/ui/quiz-type-badge';

interface QuizTypeIconProps {
  type: string;
  color?: string;
  size?: number;
}

/** Accent color per visual type key (matches CSS --type-* vars). */
const TYPE_COLORS: Record<QuizTypeKey, string> = {
  classic: '#378ADD',
  tf: '#639922',
  clue: '#EF9F27',
  image: '#D4537E',
  intruder: '#7F77DD',
};

export function QuizTypeIcon({ type, color, size = 18 }: QuizTypeIconProps) {
  const key = mapDbTypeToKey(type);
  const c = color ?? TYPE_COLORS[key];

  const icons: Record<QuizTypeKey, React.ReactElement> = {
    classic: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="8" height="8" rx="2"/>
        <rect x="13" y="3" width="8" height="8" rx="2"/>
        <rect x="3" y="13" width="8" height="8" rx="2"/>
        <rect x="13" y="13" width="8" height="8" rx="2"/>
        <path d="M5.5 7.5l1 1 2.5-2.5" strokeWidth="1.8"/>
      </svg>
    ),

    tf: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="12" r="5.5"/>
        <path d="M6 12.5l1.2 1.2 2.6-2.8" strokeWidth="1.8"/>
        <circle cx="17" cy="12" r="4.5" strokeWidth="1.4"/>
        <path d="M15.5 10.5l3 3M18.5 10.5l-3 3" strokeWidth="1.6"/>
      </svg>
    ),

    clue: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="10" r="7"/>
        <path d="M12 17v2"/>
        <circle cx="12" cy="21" r="1" fill={c} stroke="none"/>
        <path d="M10.5 8a2 2 0 0 1 3.5 1.5c0 1.5-1.5 1.5-1.5 3"/>
        <circle cx="12.5" cy="14" r="0.5" fill={c} stroke="none"/>
      </svg>
    ),

    image: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="4" width="19" height="16" rx="2.5"/>
        <circle cx="8.5" cy="10" r="2"/>
        <path d="M22 16l-4.5-4.5a1.5 1.5 0 0 0-2 0L8 19"/>
        <path d="M14 15l2-2a1.5 1.5 0 0 1 2 0l3.5 3.5"/>
      </svg>
    ),

    intruder: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="8.5" height="8.5" rx="2"/>
        <rect x="13.5" y="2" width="8.5" height="8.5" rx="2"/>
        <rect x="2" y="13.5" width="8.5" height="8.5" rx="2"/>
        <rect x="13.5" y="13.5" width="8.5" height="8.5" rx="2" strokeDasharray="2.5 2"/>
        <path d="M16 16l3.5 3.5M19.5 16L16 19.5" strokeWidth="1.5"/>
      </svg>
    ),
  };

  return icons[key] ?? icons.classic;
}

/** Get the accent color for a quiz type. */
export function getQuizTypeColor(type: string): string {
  return TYPE_COLORS[mapDbTypeToKey(type)];
}
