'use client';
import { useState, useRef } from 'react';

const C = {
  pink: '#D4537E',
  pinkLight: 'rgba(212,83,126,0.08)',
  pinkBorder: 'rgba(212,83,126,0.15)',
  bg: '#FAF9F6',
  textDark: '#2c2c2a',
  textMuted: '#888780',
  textLight: '#b4b2a9',
  border: '#e8e6e0',
  borderLight: '#f0ede8',
  green: '#27ae60',
  amber: '#e8a060',
  red: '#e74c3c',
};

const VARIANTS = [
  { id: 'editorial', label: 'Editorial', icon: 'ED' },
  { id: 'neon', label: 'Neon Stage', icon: 'NS' },
  { id: 'y2k', label: 'Y2K', icon: 'Y2' },
] as const;

interface Card {
  id: string;
  variant: string;
  card_image_url: string | null;
  generation_status: string;
  pinterest_status: string;
  generated_at: string | null;
}

interface QuizData {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  question_count: number;
  group_name: string;
  pinterest_background_image_url: string | null;
  created_at: string;
  cards: Card[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function QuizCardManager({ quiz, onRefresh }: { quiz: QuizData; onRefresh: () => void }) {
  const [generatingVariant, setGeneratingVariant] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const generateOne = async (variant: string) => {
    setGeneratingVariant(variant);
    try {
      const res = await fetch('/api/admin/pinterest/generate-card', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, variant }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Generation failed: ${err.error}`);
      }
      onRefresh();
    } finally {
      setGeneratingVariant(null);
    }
  };

  const generateAll = async () => {
    for (const v of VARIANTS) {
      setGeneratingVariant(v.id);
      try {
        await fetch('/api/admin/pinterest/generate-card', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.id, variant: v.id }),
        });
      } catch {
        // continue generating others
      }
    }
    setGeneratingVariant(null);
    onRefresh();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('quizId', quiz.id);
      fd.append('file', file);
      const res = await fetch('/api/admin/pinterest/upload-background', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json();
        alert(`Upload failed: ${err.error}`);
      } else {
        onRefresh();
        if (confirm('Background uploaded. Regenerate all 3 cards now?')) {
          await generateAll();
        }
      }
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const cards: Record<string, Card> = {};
  (quiz.cards ?? []).forEach(c => { cards[c.variant] = c; });

  const readyCount = VARIANTS.filter(v => cards[v.id]?.generation_status === 'ready').length;
  const allReady = readyCount >= 3;

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 12,
      background: '#fff', border: `1px solid ${C.border}`,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 700, color: C.textDark, margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {quiz.title}
          </p>
          <p style={{ fontSize: 10, color: C.textMuted, margin: '2px 0 0' }}>
            {quiz.group_name} · {quiz.difficulty} · {quiz.question_count} questions · {timeAgo(quiz.created_at)}
          </p>
        </div>

        {/* Status pill */}
        <span style={{
          padding: '3px 8px', borderRadius: 4,
          background: allReady ? 'rgba(39,174,96,0.1)' : readyCount > 0 ? 'rgba(232,160,96,0.12)' : 'rgba(180,178,169,0.12)',
          color: allReady ? C.green : readyCount > 0 ? C.amber : C.textLight,
          fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
        }}>
          {readyCount}/3 ready
        </span>

        <button
          onClick={generateAll}
          disabled={!!generatingVariant}
          style={{
            padding: '7px 14px', borderRadius: 8,
            background: C.pink, color: '#fff', border: 'none',
            fontSize: 11, fontWeight: 600,
            cursor: generatingVariant ? 'wait' : 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {generatingVariant ? 'Generating...' : allReady ? 'Regenerate all' : 'Generate all 3'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
        {/* Background image section */}
        <div>
          <p style={{
            fontSize: 9, fontWeight: 700, color: C.textLight,
            textTransform: 'uppercase', letterSpacing: 1, margin: 0, marginBottom: 6,
          }}>
            Background image
          </p>
          <div style={{
            width: 200, height: 200, borderRadius: 10, overflow: 'hidden',
            background: quiz.pinterest_background_image_url
              ? undefined
              : `linear-gradient(135deg, ${C.bg}, ${C.borderLight})`,
            border: `1px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {quiz.pinterest_background_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quiz.pinterest_background_image_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center', color: C.textLight }}>
                <p style={{ fontSize: 28, margin: 0, opacity: 0.5 }}>&#128444;</p>
                <p style={{ fontSize: 10, margin: '4px 0 0' }}>Using gradient<br />(no image)</p>
              </div>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            style={{
              width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 8,
              background: C.pinkLight, color: C.pink,
              border: `1px solid ${C.pinkBorder}`,
              fontSize: 11, fontWeight: 600,
              cursor: uploading ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {uploading
              ? 'Uploading...'
              : quiz.pinterest_background_image_url
                ? 'Replace image'
                : '+ Upload image'}
          </button>
        </div>

        {/* 3 variant previews */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {VARIANTS.map(v => {
            const card = cards[v.id];
            const status = card?.generation_status ?? 'pending';

            return (
              <div key={v.id} style={{
                padding: 10, borderRadius: 10,
                background: C.bg, border: `1px solid ${C.borderLight}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark }}>
                    {v.icon} {v.label}
                  </span>
                  <span style={{
                    fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700,
                    background: status === 'ready' ? 'rgba(39,174,96,0.1)'
                      : status === 'generating' ? 'rgba(232,160,96,0.12)'
                      : status === 'failed' ? 'rgba(231,76,60,0.1)'
                      : 'rgba(180,178,169,0.1)',
                    color: status === 'ready' ? C.green
                      : status === 'generating' ? C.amber
                      : status === 'failed' ? C.red
                      : C.textLight,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{status}</span>
                </div>

                {/* Preview */}
                <div style={{
                  width: '100%', aspectRatio: '2/3', borderRadius: 6, overflow: 'hidden',
                  background: '#fff',
                  border: `1px solid ${C.borderLight}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  {card?.card_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.card_image_url}
                      alt={`${v.label} card`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <p style={{ fontSize: 10, color: C.textLight, margin: 0 }}>Not generated yet</p>
                  )}
                  {status === 'generating' && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      background: 'rgba(255,255,255,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14,
                    }}>Generating...</div>
                  )}
                </div>

                <button
                  onClick={() => generateOne(v.id)}
                  disabled={generatingVariant === v.id}
                  style={{
                    width: '100%', marginTop: 6, padding: '5px 0', borderRadius: 6,
                    background: '#fff', color: C.textMuted,
                    border: `1px solid ${C.border}`,
                    fontSize: 9, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {generatingVariant === v.id
                    ? 'Generating...'
                    : status === 'ready'
                      ? 'Regenerate'
                      : 'Generate'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
