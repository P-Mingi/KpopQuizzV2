'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { HomeFeedCard } from './home-feed-card';
import { QuizTypeIcon } from '@/components/quiz/quiz-type-icon';
import type { QuizCardData } from '@/lib/db/types';
import type { QuizTypeKey } from '@/components/ui/quiz-type-badge';

interface Props {
  quizzes: QuizCardData[];
}

const TYPE_FILTERS: Array<{ id: string; label: string; typeKey?: QuizTypeKey }> = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Image', typeKey: 'image' },
  { id: 'intruder', label: 'Intruder', typeKey: 'intruder' },
  { id: 'tf', label: 'True/False', typeKey: 'tf' },
  { id: 'clue', label: 'Clue', typeKey: 'clue' },
];

const DB_TYPE_MAP: Record<string, string> = {
  image: 'image',
  intruder: 'intruder',
  tf: 'true_false',
  clue: 'guess_from_clues',
};

export function HomeFeed({ quizzes }: Props) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return quizzes;
    const dbType = DB_TYPE_MAP[filter];
    if (!dbType) return quizzes;
    return quizzes.filter(q => q.quiz_type === dbType);
  }, [filter, quizzes]);

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.01em', color: 'var(--text-primary)', margin: 0 }}>
          All quizzes
        </h2>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-tertiary)' }}>
          {filtered.length} of {quizzes.length}
        </span>
      </div>

      {/* Filter pills */}
      <div className="scrollbar-hide" style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
        {TYPE_FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '6px 12px', borderRadius: 9999,
            border: `1px solid ${filter === f.id ? 'var(--border-strong)' : 'var(--border)'}`,
            background: filter === f.id ? 'var(--text-primary)' : 'var(--bg-surface)',
            color: filter === f.id ? 'var(--bg-primary)' : 'var(--text-primary)',
            fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            cursor: 'pointer',
          }}>
            {f.typeKey && <QuizTypeIcon type={f.typeKey} size={10} {...(filter === f.id ? { color: 'var(--bg-primary)' } : {})} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(q => (
          <HomeFeedCard key={q.id} quiz={q} />
        ))}
      </div>

      {/* Browse all link */}
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Link href="/quizzes" style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: 'transparent', color: 'var(--text-primary)',
          border: '1px solid var(--border)', textDecoration: 'none',
        }}>
          Browse all quizzes {'\u2192'}
        </Link>
      </div>
    </section>
  );
}
