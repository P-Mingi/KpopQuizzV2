'use client';

import Link from 'next/link';

interface QuizDetailViewProps {
  quiz: {
    title: string;
    description?: string;
    question_count: number;
    type: string;
    difficulty?: string;
    group_tag?: string;
    play_count: number;
    avg_score?: number;
    image_url?: string | null;
    created_by: { username: string; level?: number; avatar_url?: string | null };
    slug: string;
  };
  similarQuizzes?: Array<{ title: string; type: string; slug: string }>;
  onStart: () => void;
}

export function QuizDetailView({ quiz, similarQuizzes = [], onStart }: QuizDetailViewProps) {
  const estimatedMinutes = Math.max(1, Math.ceil(quiz.question_count * 0.4));

  function formatPlays(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return n.toString();
  }

  const tagColors: Record<string, { bg: string; color: string }> = {
    Classic: { bg: 'rgba(212,83,126,0.08)', color: '#D4537E' },
    Image: { bg: 'rgba(74,144,208,0.08)', color: '#4a90d0' },
    Intruder: { bg: 'rgba(154,122,204,0.08)', color: '#9a7acc' },
    'True/False': { bg: 'rgba(39,174,96,0.08)', color: '#27ae60' },
    Clues: { bg: 'rgba(232,160,96,0.08)', color: '#e8a060' },
    Easy: { bg: 'rgba(39,174,96,0.08)', color: '#27ae60' },
    Medium: { bg: 'rgba(232,160,96,0.08)', color: '#e8a060' },
    Hard: { bg: 'rgba(231,76,60,0.08)', color: '#e74c3c' },
  };

  const groupColor = { bg: 'rgba(128,80,160,0.08)', color: '#8050a0' };

  const tags = [
    quiz.type && { label: quiz.type, ...(tagColors[quiz.type] || tagColors.Classic) },
    quiz.difficulty && { label: quiz.difficulty, ...(tagColors[quiz.difficulty] || tagColors.Medium) },
    quiz.group_tag && { label: quiz.group_tag, ...groupColor },
  ].filter(Boolean) as Array<{ label: string; bg: string; color: string }>;

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: '#fff', border: '1px solid #e8e6e0',
    }}>
      {/* Header image */}
      <div style={{
        height: 100,
        background: quiz.image_url
          ? `url(${quiz.image_url}) center/cover`
          : 'linear-gradient(135deg, #1a0a1e, #3a1848, #D4537E)',
        position: 'relative',
      }}>
        {quiz.group_tag && (
          <div style={{
            position: 'absolute', bottom: -16, left: 14,
            width: 56, height: 56, borderRadius: 12,
            background: 'linear-gradient(135deg, #f0e8f8, #d0c0e8)', border: '3px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 8, fontWeight: 700, color: '#8050a0',
          }}>{quiz.group_tag}</div>
        )}
      </div>

      <div style={{ padding: '24px 14px 14px' }}>
        {/* Tags */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {tags.map(t => (
            <span key={t.label} style={{
              fontSize: 8, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
              background: t.bg, color: t.color,
            }}>{t.label}</span>
          ))}
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2c2c2a', margin: 0 }}>{quiz.title}</h2>

        {quiz.description && (
          <p style={{ fontSize: 10, color: '#888780', margin: 0, marginTop: 6, lineHeight: 1.6 }}>
            {quiz.description}
          </p>
        )}

        {/* Quick info row */}
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {([
            { icon: '\u2753', label: `${quiz.question_count} questions` },
            { icon: '\u23F1', label: `~${estimatedMinutes} min` },
            quiz.avg_score != null ? { icon: '\uD83D\uDCCA', label: `${quiz.avg_score}% avg score` } : null,
            { icon: '\u25B6', label: `${formatPlays(quiz.play_count)} plays` },
          ].filter(Boolean) as Array<{ icon: string; label: string }>).map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontSize: 10 }}>{s.icon}</span>
              <span style={{ fontSize: 9, color: '#b4b2a9' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '6px 8px', borderRadius: 8, background: '#faf9f6' }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: quiz.created_by.avatar_url ? `url(${quiz.created_by.avatar_url}) center/cover` : '#f0ede8',
          }} />
          <span style={{ fontSize: 9, color: '#888780' }}>by <strong style={{ color: '#2c2c2a' }}>{quiz.created_by.username}</strong></span>
          {quiz.created_by.level && <span style={{ fontSize: 9, color: '#888780' }}>{'\u00B7'} Level {quiz.created_by.level}</span>}
        </div>

        {/* CTA */}
        <button onClick={onStart} style={{
          width: '100%', marginTop: 12, padding: '12px 0', borderRadius: 10,
          background: '#D4537E', color: '#fff', border: 'none',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(212,83,126,0.25)',
        }}>START QUIZ {'\u2192'}</button>

        {/* Byeol reward hint */}
        <p style={{ fontSize: 8, color: '#b4b2a9', textAlign: 'center', marginTop: 6 }}>
          Earn <span style={{ color: '#e8a060', fontWeight: 600 }}>30-50 {'\uBCC4'}</span> by completing this quiz
        </p>
      </div>

      {/* Similar quizzes */}
      {similarQuizzes.length > 0 && (
        <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: '#b4b2a9', margin: 0, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>You might also like</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {similarQuizzes.slice(0, 3).map(q => (
              <Link key={q.slug} href={`/q/${q.slug}`} style={{
                flex: 1, padding: '8px', borderRadius: 8,
                background: '#faf9f6', border: '1px solid #f0ede8',
                cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
              }}>
                <p style={{ fontSize: 9, fontWeight: 600, color: '#2c2c2a', margin: 0 }}>{q.title}</p>
                <p style={{ fontSize: 7, color: '#888780', margin: 0, marginTop: 2 }}>{q.type}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
