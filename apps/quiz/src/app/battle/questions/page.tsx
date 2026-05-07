'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';
import type { BattleQuestion } from '@/lib/db/types';

const TABS = ['all', 'draft', 'pending', 'approved', 'rejected'] as const;
type Tab = typeof TABS[number];

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  draft: { bg: 'rgba(180,178,169,0.15)', color: C.textLight },
  pending: { bg: 'rgba(232,160,96,0.12)', color: C.amber },
  approved: { bg: 'rgba(39,174,96,0.1)', color: C.green },
  rejected: { bg: 'rgba(231,76,60,0.1)', color: C.red },
};

export default function MyQuestionsPage(): React.ReactElement {
  const [questions, setQuestions] = useState<BattleQuestion[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/battle/questions?filter=${tab}`)
      .then(r => r.json())
      .then(data => { setQuestions(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);

  const counts = {
    all: questions.length,
    draft: questions.filter(q => q.status === 'draft').length,
    pending: questions.filter(q => q.status === 'pending').length,
    approved: questions.filter(q => q.status === 'approved').length,
    rejected: questions.filter(q => q.status === 'rejected').length,
  };

  const filtered = tab === 'all' ? questions : questions.filter(q => q.status === tab);

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, color: C.textMuted, margin: '0 0 4px' }}>
              <Link href="/battle" style={{ color: C.textMuted, textDecoration: 'none' }}>Battle</Link> / My questions
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: C.textDark, margin: 0 }}>My Questions</h1>
            <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0' }}>
              Submit K-pop trivia questions. Approved ones appear in battle rooms and earn you Byeol.
            </p>
          </div>
          <Link href="/battle/questions/new" style={{
            padding: '10px 20px', borderRadius: 12,
            background: C.pink, color: '#fff',
            fontSize: 13, fontWeight: 700, textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(212,83,126,0.3)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            + New question
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Submitted', value: counts.all, color: C.textDark },
            { label: 'Approved', value: counts.approved, color: C.green },
            { label: 'Pending', value: counts.pending, color: C.amber },
            { label: 'Rejected', value: counts.rejected, color: C.red },
          ].map(s => (
            <div key={s.label} style={{
              padding: '14px 16px', borderRadius: 12,
              background: '#fff', border: `1px solid ${C.cardBorder}`,
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.textMuted }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{
          display: 'flex', gap: 4, borderBottom: `1px solid ${C.cardBorder}`,
          marginBottom: 14,
        }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 14px', background: 'transparent',
                borderBottom: `2px solid ${tab === t ? C.pink : 'transparent'}`,
                border: 'none', borderBottomWidth: 2, borderBottomStyle: 'solid',
                borderBottomColor: tab === t ? C.pink : 'transparent',
                fontSize: 12, fontWeight: tab === t ? 600 : 500,
                color: tab === t ? C.pink : C.textMuted,
                cursor: 'pointer', marginBottom: -1,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {counts[t] > 0 && (
                <span style={{
                  fontSize: 9, padding: '1px 6px', borderRadius: 999,
                  background: tab === t ? C.pink : C.borderLight,
                  color: tab === t ? '#fff' : C.textMuted,
                  fontWeight: 700,
                }}>
                  {counts[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Question list */}
        {loading ? (
          <p style={{ fontSize: 12, color: C.textMuted, textAlign: 'center', padding: 40 }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '60px 20px', borderRadius: 14,
            background: '#fff', border: `1px dashed ${C.cardBorder}`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, opacity: 0.4, marginBottom: 8 }}>{'\u{1F4DD}'}</div>
            <p style={{ fontSize: 13, color: C.textMuted }}>
              No {tab === 'all' ? '' : tab} questions yet.{' '}
              <Link href="/battle/questions/new" style={{ color: C.pink, fontWeight: 600, textDecoration: 'none' }}>
                Create one!
              </Link>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(q => (
              <QuestionRow key={q.id} question={q} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionRow({ question: q }: { question: BattleQuestion }): React.ReactElement {
  const badge = STATUS_BADGE[q.status] ?? { bg: 'rgba(180,178,169,0.15)', color: C.textLight };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 12,
      background: '#fff', border: `1px solid ${C.cardBorder}`,
    }}>
      {/* Thumbnail */}
      <div style={{
        width: 48, height: 48, borderRadius: 10, flexShrink: 0,
        background: q.image_url ? 'linear-gradient(135deg, #f0e8f8, #d0c0e8)' : C.pinkLight,
        border: `1px solid ${C.pinkBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: q.image_url ? 18 : 16,
      }}>
        {q.image_url ? '\u{1F4F8}' : '\u{1F4AC}'}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
            background: badge.bg, color: badge.color,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {q.status}
          </span>
        </div>
        <p style={{
          fontSize: 11, color: C.textMuted, fontStyle: 'italic',
          margin: '0 0 1px',
        }}>
          {q.prompt}
        </p>
        <p style={{
          fontSize: 13, fontWeight: 600, color: C.textDark, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {q.text_content ?? '[image]'} {'\u2192'}{' '}
          <span style={{ color: C.pink }}>{q.answer}</span>
        </p>
        <p style={{ fontSize: 10, color: C.textLight, margin: '2px 0 0' }}>
          {q.group_name} &middot; {q.difficulty}
        </p>
        {q.status === 'rejected' && q.rejection_reason && (
          <p style={{
            fontSize: 10, color: C.red, padding: '5px 10px', marginTop: 6,
            borderRadius: 6, background: 'rgba(231,76,60,0.06)',
            border: '1px solid rgba(231,76,60,0.15)',
          }}>
            {'\u26A0'} {q.rejection_reason}
          </p>
        )}
      </div>

      {/* Stats (approved only) */}
      {q.status === 'approved' && (
        <div style={{ display: 'flex', gap: 14, flexShrink: 0, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.textDark }}>{q.plays}</div>
            <div style={{ fontSize: 8, color: C.textLight }}>plays</div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>
              {q.plays > 0 ? Math.round((q.correct_count / q.plays) * 100) : 0}%
            </div>
            <div style={{ fontSize: 8, color: C.textLight }}>solve rate</div>
          </div>
        </div>
      )}
    </div>
  );
}
