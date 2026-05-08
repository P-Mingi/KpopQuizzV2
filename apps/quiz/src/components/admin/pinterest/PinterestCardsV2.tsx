'use client';
import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { QuizCardManager } from './QuizCardManager';
import { BulkActions } from './BulkActions';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const C = {
  pink: '#D4537E',
  bg: '#FAF9F6',
  textDark: '#2c2c2a',
  textMuted: '#888780',
  border: '#e8e6e0',
};

type Filter = 'all' | 'with_cards' | 'missing' | 'recent';

export function PinterestCardsV2() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data: stats, mutate: mutateStats } = useSWR('/api/admin/pinterest/stats', fetcher);
  const { data: quizzes, mutate: mutateQuizzes } = useSWR(
    `/api/admin/pinterest/quizzes?filter=${filter}`,
    fetcher,
  );

  const refresh = useCallback(() => {
    mutateStats();
    mutateQuizzes();
  }, [mutateStats, mutateQuizzes]);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.textDark, margin: 0 }}>
          Pinterest Cards V2
        </h2>
        <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>
          Each quiz gets 3 share cards (Editorial, Neon, Y2K). All 3 get posted to Pinterest as separate pins.
        </p>
      </div>

      {/* Stats + bulk actions */}
      {stats && !stats.error && <BulkActions stats={stats} onRefresh={refresh} />}

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: 4, marginTop: 20, marginBottom: 14,
        borderBottom: `1px solid ${C.border}`,
      }}>
        {([
          { id: 'all' as const, label: 'All quizzes', count: stats?.total_quizzes },
          { id: 'with_cards' as const, label: 'With cards', count: stats?.with_all_cards },
          { id: 'missing' as const, label: 'Missing cards', count: stats?.missing_cards },
          { id: 'recent' as const, label: 'Recent', count: stats?.recent_count },
        ]).map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding: '8px 14px', background: 'transparent', border: 'none',
            borderBottom: filter === t.id ? `2px solid ${C.pink}` : '2px solid transparent',
            fontSize: 12, fontWeight: filter === t.id ? 600 : 500,
            color: filter === t.id ? C.pink : C.textMuted,
            cursor: 'pointer', marginBottom: -1,
            display: 'flex', alignItems: 'center', gap: 5,
            fontFamily: 'inherit',
          }}>
            {t.label}
            {t.count != null && (
              <span style={{
                fontSize: 9, padding: '1px 6px', borderRadius: 999,
                background: filter === t.id ? C.pink : C.border,
                color: filter === t.id ? '#fff' : C.textMuted, fontWeight: 700,
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Quiz list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.isArray(quizzes) && quizzes.map((q: Record<string, unknown>) => (
          <QuizCardManager
            key={q.id as string}
            quiz={q as unknown as Parameters<typeof QuizCardManager>[0]['quiz']}
            onRefresh={refresh}
          />
        ))}
        {Array.isArray(quizzes) && quizzes.length === 0 && (
          <div style={{
            padding: '40px 20px', borderRadius: 12,
            background: '#fff', border: `1px dashed ${C.border}`, textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>No quizzes match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
