import Link from 'next/link';

import { formatCount } from '@/lib/utils';
import type { QuizCardData } from '@/lib/db/types';

// UX v1 quiz card (DESIGN-SPEC 6), rendered by quiz-card.tsx when the flag is on,
// so it re-skins EVERY quiz-card consumer at once. Cover rule (owner): the real
// cover_image_url, else the group image (logo_url); with neither, a duo-tone
// gradient + big monogram. Link + destination (/q/{slug}) unchanged. No new data.

const TYPE_LABEL: Record<string, { key: string; label: string }> = {
  multiple_choice: { key: 'classic', label: 'Classic' },
  classic: { key: 'classic', label: 'Classic' },
  image: { key: 'image', label: 'Image' },
  intruder: { key: 'intruder', label: 'Intruder' },
  true_false: { key: 'tf', label: 'True/False' },
  tf: { key: 'tf', label: 'True/False' },
  clues: { key: 'clue', label: 'Clues' },
  clue: { key: 'clue', label: 'Clues' },
};

function monogram(name: string): string {
  const n = (name || '').trim();
  if (!n || /general/i.test(n)) return 'K';
  return n.charAt(0).toUpperCase();
}

export function UxQuizCard({ quiz }: { quiz: QuizCardData }): React.ReactElement {
  const cover = quiz.cover_image_url || quiz.logo_url || null;
  const type = TYPE_LABEL[quiz.quiz_type] ?? { key: 'classic', label: 'Classic' };
  const showType = type.key !== 'classic';

  return (
    <Link href={`/q/${quiz.slug}`} className="uxv1-qc" aria-label={quiz.title}>
      <div
        className={`uxv1-qc-cov${cover ? ' has-img' : ''}`}
        style={cover
          ? { backgroundImage: `url(${cover})` }
          : { background: `linear-gradient(135deg, ${quiz.display_color || 'var(--uxv1-tint2)'} 0%, var(--uxv1-tint) 100%)` }}
      >
        {!cover && <span className="uxv1-qc-mono" style={{ color: quiz.text_color || 'var(--uxv1-ink)' }}>{monogram(quiz.group_name)}</span>}
        <span className="uxv1-qc-plays"><i aria-hidden="true" />{formatCount(quiz.play_count)} plays</span>
      </div>
      <div className="uxv1-qc-body">
        <p className="uxv1-qc-title">{quiz.title}</p>
        <div className="uxv1-qc-tags">
          {showType && <span className={`uxv1-tag uxv1-tag-${type.key}`}>{type.label}</span>}
          {quiz.difficulty && <span className="uxv1-tag uxv1-tag-level">{quiz.difficulty.charAt(0).toUpperCase() + quiz.difficulty.slice(1)}</span>}
        </div>
      </div>
    </Link>
  );
}
