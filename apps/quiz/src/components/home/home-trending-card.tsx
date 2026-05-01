import Link from 'next/link';
import Image from 'next/image';
import { QuizTypeBadge } from '@/components/ui/quiz-type-badge';
import { DifficultyBadge } from '@/components/ui/difficulty-badge';
import { GroupLogo } from '@/components/ui/group-logo';
import { formatCount } from '@/lib/utils';
import type { QuizCardData } from '@/lib/db/types';

interface Props {
  quiz: QuizCardData;
  rank: number;
  priority?: boolean;
}

export function HomeTrendingCard({ quiz, rank, priority = false }: Props) {
  return (
    <Link href={`/q/${quiz.slug}`} style={{
      width: 200, flexShrink: 0, display: 'block',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 14, boxShadow: 'var(--shadow-card)',
      overflow: 'hidden', textDecoration: 'none', color: 'inherit',
      transition: 'transform 200ms ease, box-shadow 200ms ease',
    }}>
      {/* Header with cover image + gradient + rank + group logo */}
      <div style={{
        height: 96, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 10,
        background: `linear-gradient(160deg, ${quiz.display_color}, color-mix(in srgb, ${quiz.display_color} 50%, #000))`,
        overflow: 'hidden',
      }}>
        {/* Cover image as background */}
        {quiz.cover_image_url && (
          <Image
            src={quiz.cover_image_url}
            alt=""
            fill
            style={{ objectFit: 'cover' }}
            sizes="200px"
            priority={priority}
          />
        )}
        {/* Dark overlay so text stays readable */}
        <div style={{
          position: 'absolute', inset: 0,
          background: quiz.cover_image_url
            ? 'linear-gradient(160deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.4))'
            : 'none',
        }} />
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 2,
          fontSize: 32, fontWeight: 800, color: 'rgba(255,255,255,0.85)',
          letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>#{rank}</div>
        <div style={{ position: 'absolute', bottom: -18, right: -6, zIndex: 2, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--bg-surface)', boxShadow: 'var(--shadow-card)' }}>
          <GroupLogo
            groupName={quiz.group_name}
            logoUrl={quiz.logo_url}
            displayColor={quiz.display_color}
            textColor={quiz.text_color}
            size={70}
          />
        </div>
        <div style={{
          color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          position: 'relative', zIndex: 2, textShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}>
          {quiz.group_name}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <QuizTypeBadge type={quiz.quiz_type} size="xs" />
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 8,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          minHeight: 34,
        }}>
          {quiz.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            {formatCount(quiz.play_count)}
          </span>
          <span>{'\u00B7'}</span>
          <DifficultyBadge difficulty={quiz.difficulty} />
        </div>
      </div>
    </Link>
  );
}
