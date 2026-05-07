'use client';

import { useEffect, useState, useCallback } from 'react';
import type { BattleQuestion } from '@/lib/db/types';

const C = {
  bg: '#FAF9F6', card: '#fff', cardBorder: '#e8e6e0',
  pink: '#D4537E', pinkLight: 'rgba(212,83,126,0.08)', pinkBorder: 'rgba(212,83,126,0.15)',
  textDark: '#2c2c2a', textMuted: '#888780', textLight: '#b4b2a9',
  amber: '#e8a060', green: '#27ae60', red: '#e74c3c', purple: '#9a7acc',
  borderLight: '#f0ede8',
};

export default function AdminBattlePage(): React.ReactElement {
  const [questions, setQuestions] = useState<BattleQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadQuestions = useCallback(() => {
    setLoading(true);
    fetch('/api/battle/questions?filter=pending')
      .then(r => r.json())
      .then(data => { setQuestions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const handleAction = async (id: string, action: 'approve' | 'reject', reason?: string) => {
    setActionLoading(id);
    await fetch(`/api/battle/questions/${id}/moderate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, rejection_reason: reason }),
    });
    setActionLoading(null);
    setRejectId(null);
    setRejectReason('');
    loadQuestions();
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.textDark, margin: 0 }}>
            Battle Question Moderation
          </h1>
          <p style={{ fontSize: 12, color: C.textMuted, margin: '2px 0 0' }}>
            {questions.length} pending question{questions.length !== 1 ? 's' : ''} to review
          </p>
        </div>
        <button onClick={loadQuestions} style={{
          padding: '8px 16px', borderRadius: 8,
          background: '#fff', border: `1px solid ${C.cardBorder}`,
          color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', padding: 40 }}>Loading...</p>
      ) : questions.length === 0 ? (
        <div style={{
          padding: '60px 20px', borderRadius: 14,
          background: '#fff', border: `1px dashed ${C.cardBorder}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, opacity: 0.4, marginBottom: 8 }}>{'\u2705'}</div>
          <p style={{ fontSize: 13, color: C.textMuted }}>All caught up! No pending questions.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map(q => (
            <div key={q.id} style={{
              padding: '16px 20px', borderRadius: 14,
              background: '#fff', border: `1px solid ${C.cardBorder}`,
            }}>
              {/* Question preview */}
              <div style={{
                padding: '14px', borderRadius: 10, marginBottom: 12,
                background: 'linear-gradient(160deg, #1a0a1e, #2a1035)',
                textAlign: 'center',
              }}>
                {q.text_content && (
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                    &ldquo;{q.text_content}&rdquo;
                  </p>
                )}
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', margin: '8px 0 0' }}>
                  {q.prompt}
                </p>
              </div>

              {/* Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                {[
                  { k: 'Answer', v: q.answer, bold: true, c: C.textDark },
                  { k: 'Variants', v: q.variants.length > 0 ? q.variants.join(', ') : 'none', bold: false, c: C.pink },
                  { k: 'Group', v: q.group_name, bold: true, c: C.pink },
                  { k: 'Difficulty', v: q.difficulty, bold: false, c: q.difficulty === 'Hard' || q.difficulty === 'Insane' ? C.red : C.amber },
                ].map(row => (
                  <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{row.k}</span>
                    <span style={{
                      fontSize: 12, fontWeight: row.bold ? 700 : 600,
                      color: row.c, fontFamily: row.k === 'Variants' ? 'monospace' : 'inherit',
                    }}>
                      {row.v}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {rejectId === q.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (visible to the submitter)..."
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      background: C.bg, border: `1px solid ${C.cardBorder}`,
                      fontSize: 12, fontFamily: 'inherit', color: C.textDark,
                      outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setRejectId(null)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      background: '#fff', border: `1px solid ${C.cardBorder}`,
                      color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAction(q.id, 'reject', rejectReason)}
                      disabled={actionLoading === q.id}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8,
                        background: 'rgba(231,76,60,0.05)', border: `1px solid rgba(231,76,60,0.3)`,
                        color: C.red, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Confirm reject
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleAction(q.id, 'approve')}
                    disabled={actionLoading === q.id}
                    style={{
                      flex: 2, padding: '10px 0', borderRadius: 10,
                      background: C.green, color: '#fff', border: 'none',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(39,174,96,0.3)',
                      opacity: actionLoading === q.id ? 0.6 : 1,
                    }}
                  >
                    {'\u2713'} Approve
                  </button>
                  <button
                    onClick={() => setRejectId(q.id)}
                    disabled={actionLoading === q.id}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10,
                      background: 'rgba(231,76,60,0.05)',
                      border: '1px solid rgba(231,76,60,0.3)',
                      color: C.red, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {'\u2717'} Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
