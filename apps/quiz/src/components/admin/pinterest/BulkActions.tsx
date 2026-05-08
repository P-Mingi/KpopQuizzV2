'use client';
import { useState } from 'react';

const C = {
  pink: '#D4537E',
  textDark: '#2c2c2a',
  textMuted: '#888780',
  border: '#e8e6e0',
  amber: '#e8a060',
  green: '#27ae60',
};

interface Stats {
  total_quizzes: number;
  with_all_cards: number;
  missing_cards: number;
  missing_jobs: number;
  total_cards_ready: number;
  total_posted: number;
}

export function BulkActions({ stats, onRefresh }: { stats: Stats; onRefresh: () => void }) {
  const [bulking, setBulking] = useState<string | null>(null);

  const runBulk = async (mode: 'all_missing' | 'recent_only' | 'all') => {
    if (mode === 'all' && !confirm('This will regenerate ALL cards for ALL quizzes. Continue?')) return;
    setBulking(mode);
    try {
      const res = await fetch('/api/admin/pinterest/generate-bulk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      alert(`Generated ${data.generated}/${data.total_jobs} cards. ${data.failed} failed.`);
      onRefresh();
    } finally {
      setBulking(null);
    }
  };

  const exportCsv = () => {
    window.location.href = '/api/admin/pinterest/export-csv?type=cards_v2';
  };

  return (
    <div style={{
      padding: '16px 20px', borderRadius: 12,
      background: '#fff', border: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      {/* Stats summary */}
      <div style={{ display: 'flex', gap: 16, flex: 1 }}>
        <Stat label="Total quizzes" value={stats.total_quizzes} />
        <Stat label="Fully covered" value={stats.with_all_cards} color={C.green} />
        <Stat label="Missing cards" value={stats.missing_cards} color={C.amber} />
        <Stat label="Cards generated" value={stats.total_cards_ready} />
        <Stat label="Posted to Pinterest" value={stats.total_posted} color={C.pink} />
      </div>

      {/* Bulk buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          disabled={!!bulking || stats.missing_cards === 0}
          onClick={() => runBulk('all_missing')}
          style={{
            padding: '10px 16px', borderRadius: 10,
            background: bulking === 'all_missing' ? '#b4b2a9' : C.pink,
            color: '#fff', border: 'none',
            fontSize: 12, fontWeight: 700,
            cursor: bulking ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(212,83,126,0.25)',
            fontFamily: 'inherit',
            opacity: stats.missing_cards === 0 ? 0.5 : 1,
          }}
        >
          {bulking === 'all_missing' ? 'Generating...' : `Generate all missing (${stats.missing_jobs} cards)`}
        </button>

        <button
          disabled={!!bulking}
          onClick={() => runBulk('recent_only')}
          style={{
            padding: '10px 16px', borderRadius: 10,
            background: '#fff', color: C.textDark,
            border: `1px solid ${C.border}`,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {bulking === 'recent_only' ? 'Generating...' : 'Generate for new quizzes only'}
        </button>

        <button
          onClick={exportCsv}
          style={{
            padding: '10px 16px', borderRadius: 10,
            background: 'rgba(232,160,96,0.08)', color: C.amber,
            border: '1px solid rgba(232,160,96,0.3)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: 18, fontWeight: 800, color: color || C.textDark, margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 9, color: C.textMuted, margin: '3px 0 0' }}>{label}</p>
    </div>
  );
}
