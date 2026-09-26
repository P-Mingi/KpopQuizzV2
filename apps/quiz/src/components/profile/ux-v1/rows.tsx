import Link from 'next/link';

import { Icon } from '@/components/ux-v1/icon';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { cssUrl, historyLine, quizLine } from '@/lib/ux-v1/p10/passport-model';

import type { HistoryRow } from '@/lib/ux-v1/p10/passport-model';
import type { QuizCardData } from '@/lib/db/types';

// Passport list rows (shared by the server passport and the "Show more" island).
// No directive: server-safe and client-safe.

/** 56 x 42 thumb: the photo, else the typographic glyph (16.8). */
export function Thumb({ src, glyph = 'layers', className }: { src: string | null | undefined; glyph?: 'layers' | 'music'; className?: string }): React.ReactElement {
  const bg = cssUrl(src);
  return (
    <span className={['ux-thumb', bg ? '' : 'is-glyph', className ?? ''].filter(Boolean).join(' ')} aria-hidden="true" style={bg ? { backgroundImage: bg } : undefined}>
      {bg ? null : <Icon name={glyph} />}
    </span>
  );
}

/** Round group avatar (40px) from public/idols, else the initial. */
export function GroupAvatar({ slug, name }: { slug: string; name: string }): React.ReactElement {
  const bg = cssUrl(groupPhotoUrl(slug));
  return <span className="ux-gav" aria-hidden="true" style={bg ? { backgroundImage: bg } : undefined}>{bg ? null : name.slice(0, 1)}</span>;
}

export function quizRowAverage(q: Pick<QuizCardData, 'total_score_sum' | 'total_completions' | 'question_count'>): string | null {
  if (!q.total_completions || !q.question_count) return null;
  const pct = Math.round((q.total_score_sum / (q.total_completions * q.question_count)) * 100);
  return Number.isFinite(pct) ? `${Math.max(0, Math.min(100, pct))}% average` : null;
}

export function QuizRows({ quizzes }: { quizzes: QuizCardData[] }): React.ReactElement {
  return (
    <>
      {quizzes.map((q) => (
        <Link key={q.id} href={`/q/${q.slug}`} className="ux-row">
          <Thumb src={q.cover_image_url || groupPhotoUrl(q.group_slug)} />
          <span className="ux-row-grow">
            <span className="ux-rt">{q.title}</span>
            <span className="ux-rs">{[quizLine(q), quizRowAverage(q)].filter(Boolean).join(' · ')}</span>
          </span>
        </Link>
      ))}
    </>
  );
}

export function HistoryList({ rows, now }: { rows: HistoryRow[]; now: number }): React.ReactElement {
  return (
    <div className="ux-rows">
      {rows.map((r, i) => {
        const lead = r.kind === 'blindtest'
          ? <Thumb src={null} glyph="music" className="p10-thumb-bt" />
          : <Thumb src={r.groupSlug ? groupPhotoUrl(r.groupSlug) : null} />;
        const body = (
          <span className="ux-row-grow">
            <span className="ux-rt">{r.title}</span>
            <span className="ux-rs">{historyLine(r, now)}</span>
          </span>
        );
        return r.href
          ? <Link key={`${r.at}-${i}`} href={r.href} className="ux-row">{lead}{body}</Link>
          : <div key={`${r.at}-${i}`} className="ux-row">{lead}{body}</div>;
      })}
    </div>
  );
}
