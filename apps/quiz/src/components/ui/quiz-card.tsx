import Link from 'next/link';
import Image from 'next/image';

import { GroupLogo } from '@/components/ui/group-logo';
import { formatCount } from '@/lib/utils';

import type { QuizCardData, QuizType, Difficulty } from '@/lib/db/types';

/**
 * Canonical quiz card — spec §10c markup + §10d badges, exact classes.
 * Shared component: used on /quizzes browse now, reused on home/games later.
 * Stays a real crawlable <a href="/q/{slug}"> for SEO — never a JS-only onClick.
 */

const TYPE_BADGE: Record<QuizType, { cls: string; label: string }> = {
  multiple_choice:  { cls: 'b-classic',  label: 'Classic' },
  true_false:       { cls: 'b-tf',       label: 'True/False' },
  guess_from_clues: { cls: 'b-clues',    label: 'Clues' },
  image:            { cls: 'b-image',    label: 'Image' },
  intruder:         { cls: 'b-intruder', label: 'Intruder' },
};

const DIFF_BADGE: Record<Difficulty, { cls: string; label: string }> = {
  easy:   { cls: 'b-easy',   label: 'Easy' },
  medium: { cls: 'b-medium', label: 'Medium' },
  hard:   { cls: 'b-hard',   label: 'Hard' },
};

/** Average score as a 0–100 percentage, or null when there's no data yet. */
function avgScorePct(q: QuizCardData): number | null {
  return q.total_completions > 0 && q.question_count > 0
    ? Math.round((q.total_score_sum / q.total_completions / q.question_count) * 100)
    : null;
}

/** §3c colour bands: green ≥65%, amber 50–64%, red <50%. */
function scoreClass(pct: number): string {
  if (pct >= 65) return 'score-green';
  if (pct >= 50) return 'score-amber';
  return 'score-red';
}

interface Props {
  quiz: QuizCardData;
  /** Position in the grid — drives the staggered fade-in (index * 40ms). */
  index?: number;
}

export function QuizCard({ quiz, index = 0 }: Props): React.ReactElement {
  const type = TYPE_BADGE[quiz.quiz_type];
  const diff = DIFF_BADGE[quiz.difficulty];
  const pct = avgScorePct(quiz);

  return (
    <Link
      href={`/q/${quiz.slug}`}
      className="quiz-card"
      style={{ animationDelay: `${index * 40}ms` }}
      aria-label={`${quiz.title} — ${quiz.group_name} ${type.label} quiz`}
    >
      <div className="quiz-cover">
        {quiz.cover_image_url ? (
          <Image
            src={quiz.cover_image_url}
            alt=""
            fill
            sizes="72px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <GroupLogo
            groupName={quiz.group_name}
            logoUrl={quiz.logo_url}
            displayColor={quiz.display_color}
            textColor={quiz.text_color}
            size={88}
          />
        )}
      </div>

      <div className="quiz-body">
        <div className="badge-row">
          <span className={`badge ${type.cls}`}>{type.label}</span>
          <span className={`badge ${diff.cls}`}>{diff.label}</span>
        </div>

        <p className="quiz-title">{quiz.title}</p>

        <div className="quiz-meta">
          <span className="quiz-plays">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            {formatCount(quiz.play_count)}
          </span>
          {pct !== null && (
            <span className={`quiz-score ${scoreClass(pct)}`}>{pct}%</span>
          )}
          <span className="quiz-author">{quiz.creator_username}</span>
        </div>
      </div>
    </Link>
  );
}
