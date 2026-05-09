'use client';

import { useEffect, useState, useCallback } from 'react';
import type { BattleQuestion, BattleDifficulty } from '@/lib/db/types';
import { BATTLE_GROUPS } from '@/lib/battle/battle-constants';

const C = {
  bg: '#FAF9F6', card: '#fff', cardBorder: '#e8e6e0',
  pink: '#D4537E', pinkLight: 'rgba(212,83,126,0.08)', pinkBorder: 'rgba(212,83,126,0.15)',
  textDark: '#2c2c2a', textMuted: '#888780', textLight: '#b4b2a9',
  amber: '#e8a060', green: '#27ae60', red: '#e74c3c', purple: '#9a7acc',
  borderLight: '#f0ede8',
};

const STATUS_COLORS: Record<string, string> = {
  draft: C.textLight, pending: C.amber, approved: C.green, rejected: C.red,
};

const DIFFICULTIES: BattleDifficulty[] = ['Easy', 'Medium', 'Hard', 'Insane'];
const DIFF_COLORS: Record<string, string> = {
  Easy: C.green, Medium: C.amber, Hard: C.red, Insane: C.purple,
};

type Tab = 'moderation' | 'all';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'draft';

export default function AdminBattlePage(): React.ReactElement {
  const [tab, setTab] = useState<Tab>('moderation');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [questions, setQuestions] = useState<BattleQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadQuestions = useCallback(() => {
    setLoading(true);
    const filter = tab === 'moderation' ? 'pending' : statusFilter;
    fetch(`/api/battle/questions?filter=${filter}`)
      .then(r => r.json())
      .then(data => { setQuestions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab, statusFilter]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const handleModerate = async (id: string, action: 'approve' | 'reject', reason?: string) => {
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

  const handleSave = async (id: string, updates: Partial<BattleQuestion>) => {
    setActionLoading(id);
    await fetch(`/api/battle/questions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    setActionLoading(null);
    setEditId(null);
    loadQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question permanently?')) return;
    setActionLoading(id);
    await fetch(`/api/battle/questions/${id}`, { method: 'DELETE' });
    setActionLoading(null);
    loadQuestions();
  };

  return (
    <div>
      {/* Page title */}
      <h1 style={{ fontSize: 20, fontWeight: 800, color: C.textDark, margin: '0 0 4px' }}>
        Battle Questions
      </h1>
      <p style={{ fontSize: 12, color: C.textMuted, margin: '0 0 16px' }}>
        Moderate pending submissions and manage the full question pool.
      </p>

      {/* Tab nav */}
      <div style={{
        display: 'flex', gap: 0, borderBottom: `1px solid ${C.cardBorder}`,
        marginBottom: 16,
      }}>
        {([
          { id: 'moderation' as Tab, label: 'Moderation', count: null },
          { id: 'all' as Tab, label: 'All Questions', count: null },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setEditId(null); }}
            style={{
              padding: '10px 18px', background: 'transparent',
              border: 'none', borderBottom: `2px solid ${tab === t.id ? C.pink : 'transparent'}`,
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? C.pink : C.textMuted,
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* All Questions: status filter */}
      {tab === 'all' && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {(['all', 'approved', 'pending', 'rejected', 'draft'] as StatusFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '6px 12px', borderRadius: 6,
                background: statusFilter === f ? C.pink : '#fff',
                color: statusFilter === f ? '#fff' : C.textMuted,
                border: `1px solid ${statusFilter === f ? C.pink : C.cardBorder}`,
                fontSize: 11, fontWeight: statusFilter === f ? 600 : 500,
                cursor: 'pointer', textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={loadQuestions} style={{
            padding: '6px 12px', borderRadius: 6,
            background: '#fff', border: `1px solid ${C.cardBorder}`,
            color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Refresh
          </button>
        </div>
      )}

      {/* Moderation tab: refresh */}
      {tab === 'moderation' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: C.textMuted, margin: 0 }}>
            {questions.length} pending question{questions.length !== 1 ? 's' : ''}
          </p>
          <button onClick={loadQuestions} style={{
            padding: '6px 12px', borderRadius: 6,
            background: '#fff', border: `1px solid ${C.cardBorder}`,
            color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Refresh
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <p style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', padding: 40 }}>Loading...</p>
      ) : questions.length === 0 ? (
        <div style={{
          padding: '60px 20px', borderRadius: 14,
          background: '#fff', border: `1px dashed ${C.cardBorder}`,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, opacity: 0.4, marginBottom: 8 }}>
            {tab === 'moderation' ? '\u2705' : '\u{1F4DD}'}
          </div>
          <p style={{ fontSize: 13, color: C.textMuted }}>
            {tab === 'moderation' ? 'All caught up! No pending questions.' : 'No questions found.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map(q => (
            editId === q.id ? (
              <EditQuestionCard
                key={q.id}
                question={q}
                saving={actionLoading === q.id}
                onSave={(updates) => handleSave(q.id, updates)}
                onCancel={() => setEditId(null)}
              />
            ) : (
              <QuestionCard
                key={q.id}
                question={q}
                isModeration={tab === 'moderation'}
                actionLoading={actionLoading === q.id}
                isRejecting={rejectId === q.id}
                rejectReason={rejectReason}
                onApprove={() => handleModerate(q.id, 'approve')}
                onRejectStart={() => setRejectId(q.id)}
                onRejectConfirm={() => handleModerate(q.id, 'reject', rejectReason)}
                onRejectCancel={() => { setRejectId(null); setRejectReason(''); }}
                onRejectReasonChange={setRejectReason}
                onEdit={() => setEditId(q.id)}
                onDelete={() => handleDelete(q.id)}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ── Question card (read-only view) ──
function QuestionCard({ question: q, isModeration, actionLoading, isRejecting, rejectReason,
  onApprove, onRejectStart, onRejectConfirm, onRejectCancel, onRejectReasonChange, onEdit, onDelete,
}: {
  question: BattleQuestion;
  isModeration: boolean;
  actionLoading: boolean;
  isRejecting: boolean;
  rejectReason: string;
  onApprove: () => void;
  onRejectStart: () => void;
  onRejectConfirm: () => void;
  onRejectCancel: () => void;
  onRejectReasonChange: (v: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}): React.ReactElement {
  const statusColor = STATUS_COLORS[q.status] ?? C.textLight;

  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12,
      background: '#fff', border: `1px solid ${C.cardBorder}`,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: `${statusColor}18`, color: statusColor,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>
          {q.status}
        </span>
        <span style={{ fontSize: 10, color: C.textLight }}>
          {q.group_name}
        </span>
        <span style={{ fontSize: 10, fontWeight: 600, color: DIFF_COLORS[q.difficulty] ?? C.textMuted }}>
          {q.difficulty}
        </span>
        <div style={{ flex: 1 }} />
        {q.status === 'approved' && (
          <span style={{ fontSize: 10, color: C.textLight }}>
            {q.plays} plays &middot; {q.plays > 0 ? Math.round((q.correct_count / q.plays) * 100) : 0}% solve
          </span>
        )}
      </div>

      {/* Content */}
      <p style={{ fontSize: 11, color: C.textMuted, fontStyle: 'italic', margin: '0 0 2px' }}>
        {q.prompt}
      </p>
      <p style={{ fontSize: 13, fontWeight: 600, color: C.textDark, margin: '0 0 2px' }}>
        {q.text_content ? `"${q.text_content.length > 80 ? q.text_content.slice(0, 80) + '...' : q.text_content}"` : '[image]'}
        {' \u2192 '}
        <span style={{ color: C.pink }}>{q.answer}</span>
      </p>
      {q.variants.length > 0 && (
        <p style={{ fontSize: 10, color: C.textLight, fontFamily: 'monospace', margin: '2px 0 0' }}>
          variants: {q.variants.join(', ')}
        </p>
      )}

      {/* Moderation actions */}
      {isModeration && !isRejecting && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button onClick={onApprove} disabled={actionLoading} style={{
            flex: 2, padding: '8px 0', borderRadius: 8,
            background: C.green, color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            opacity: actionLoading ? 0.6 : 1,
          }}>
            {'\u2713'} Approve
          </button>
          <button onClick={onEdit} style={{
            flex: 1, padding: '8px 0', borderRadius: 8,
            background: '#fff', border: `1px solid ${C.cardBorder}`,
            color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Edit
          </button>
          <button onClick={onRejectStart} disabled={actionLoading} style={{
            flex: 1, padding: '8px 0', borderRadius: 8,
            background: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.3)',
            color: C.red, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Reject
          </button>
        </div>
      )}

      {/* Reject reason input */}
      {isModeration && isRejecting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          <textarea rows={2} value={rejectReason} onChange={e => onRejectReasonChange(e.target.value)}
            placeholder="Rejection reason (visible to submitter)..."
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              background: C.bg, border: `1px solid ${C.cardBorder}`,
              fontSize: 12, fontFamily: 'inherit', color: C.textDark,
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onRejectCancel} style={{
              flex: 1, padding: '7px 0', borderRadius: 8,
              background: '#fff', border: `1px solid ${C.cardBorder}`,
              color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={onRejectConfirm} disabled={actionLoading} style={{
              flex: 1, padding: '7px 0', borderRadius: 8,
              background: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.3)',
              color: C.red, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>Confirm reject</button>
          </div>
        </div>
      )}

      {/* All Questions tab: edit/delete actions */}
      {!isModeration && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button onClick={onEdit} style={{
            padding: '6px 14px', borderRadius: 8,
            background: '#fff', border: `1px solid ${C.cardBorder}`,
            color: C.textMuted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Edit
          </button>
          <button onClick={onDelete} style={{
            padding: '6px 14px', borderRadius: 8,
            background: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.2)',
            color: C.red, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Inline edit card ──
function EditQuestionCard({ question: q, saving, onSave, onCancel }: {
  question: BattleQuestion;
  saving: boolean;
  onSave: (updates: Partial<BattleQuestion>) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [prompt, setPrompt] = useState(q.prompt);
  const [textContent, setTextContent] = useState(q.text_content ?? '');
  const [imageUrl, setImageUrl] = useState(q.image_url ?? '');
  const [answer, setAnswer] = useState(q.answer);
  const [variants, setVariants] = useState(q.variants.join(', '));
  const [group, setGroup] = useState(q.group_name);
  const [difficulty, setDifficulty] = useState<BattleDifficulty>(q.difficulty);
  const [status, setStatus] = useState(q.status);

  const handleSave = () => {
    onSave({
      prompt,
      text_content: textContent || null,
      image_url: imageUrl || null,
      answer,
      variants: variants.split(',').map(v => v.trim()).filter(Boolean),
      group_name: group,
      difficulty,
      status,
    });
  };

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 12,
      background: '#fff', border: `2px solid ${C.pink}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>Editing question</span>
        <span style={{ fontSize: 10, color: C.textLight, fontFamily: 'monospace' }}>{q.id.slice(0, 8)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Prompt */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Label text="Prompt" />
          <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} style={inputStyle} />
        </div>

        {/* Text content */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Label text="Text content" />
          <textarea rows={3} value={textContent} onChange={e => setTextContent(e.target.value)}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
        </div>

        {/* Image URL */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Label text="Image URL" />
          <input type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
            placeholder="https://..." style={inputStyle} />
        </div>

        {/* Answer */}
        <div>
          <Label text="Correct answer" />
          <input type="text" value={answer} onChange={e => setAnswer(e.target.value)} style={inputStyle} />
        </div>

        {/* Variants */}
        <div>
          <Label text="Variants (comma-separated)" />
          <input type="text" value={variants} onChange={e => setVariants(e.target.value)}
            placeholder="pink venom, pinkvenom" style={inputStyle} />
        </div>

        {/* Group */}
        <div>
          <Label text="Group" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {BATTLE_GROUPS.map(g => (
              <button key={g} onClick={() => setGroup(g)} style={{
                padding: '4px 8px', borderRadius: 4, fontSize: 9, fontWeight: group === g ? 700 : 500,
                background: group === g ? C.pink : '#fff', color: group === g ? '#fff' : C.textMuted,
                border: `1px solid ${group === g ? C.pink : C.cardBorder}`, cursor: 'pointer',
              }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <Label text="Difficulty" />
          <div style={{ display: 'flex', gap: 4 }}>
            {DIFFICULTIES.map(d => (
              <button key={d} onClick={() => setDifficulty(d)} style={{
                flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 10, fontWeight: difficulty === d ? 700 : 500,
                background: difficulty === d ? (DIFF_COLORS[d] ?? C.pink) : '#fff',
                color: difficulty === d ? '#fff' : C.textMuted,
                border: `1px solid ${difficulty === d ? (DIFF_COLORS[d] ?? C.pink) : C.cardBorder}`,
                cursor: 'pointer',
              }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <Label text="Status" />
          <div style={{ display: 'flex', gap: 4 }}>
            {(['draft', 'pending', 'approved', 'rejected'] as const).map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{
                flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 10, fontWeight: status === s ? 700 : 500,
                background: status === s ? (STATUS_COLORS[s] ?? C.textLight) : '#fff',
                color: status === s ? '#fff' : C.textMuted,
                border: `1px solid ${status === s ? (STATUS_COLORS[s] ?? C.textLight) : C.cardBorder}`,
                cursor: 'pointer', textTransform: 'capitalize',
              }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save / Cancel */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px 0', borderRadius: 8,
          background: '#fff', border: `1px solid ${C.cardBorder}`,
          color: C.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} style={{
          flex: 2, padding: '10px 0', borderRadius: 8,
          background: C.pink, color: '#fff', border: 'none',
          fontSize: 12, fontWeight: 700, cursor: 'pointer',
          opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function Label({ text }: { text: string }): React.ReactElement {
  return (
    <label style={{
      display: 'block', fontSize: 10, fontWeight: 700, color: C.textLight,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
    }}>
      {text}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  background: '#FAF9F6', border: '1px solid #e8e6e0',
  fontSize: 12, color: '#2c2c2a', outline: 'none',
  boxSizing: 'border-box',
};
