'use client';

import { useState } from 'react';

// ---- Data ----

interface EarnItem {
  action: string;
  amount: string;
  note: string | null;
}

interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  colorMuted: string;
  items: EarnItem[];
}

const CATEGORIES: Category[] = [
  {
    id: 'play',
    label: 'Play',
    icon: '\u25B6',
    color: '#D4537E',
    colorBg: 'rgba(212,83,126,0.06)',
    colorBorder: 'rgba(212,83,126,0.12)',
    colorMuted: 'rgba(212,83,126,0.4)',
    items: [
      { action: 'Complete a quiz', amount: '20-50', note: 'based on score' },
      { action: 'Daily quiz', amount: '35-80', note: 'perfect = 80' },
      { action: 'Blindtest match', amount: '30', note: null },
      { action: 'Blindtest win', amount: '50', note: null },
      { action: 'Name All perfect', amount: '50', note: null },
      { action: 'This or That', amount: '20', note: null },
      { action: 'Tier list', amount: '30', note: null },
    ],
  },
  {
    id: 'create',
    label: 'Create',
    icon: '\u2726',
    color: '#9a7acc',
    colorBg: 'rgba(154,122,204,0.06)',
    colorBorder: 'rgba(154,122,204,0.12)',
    colorMuted: 'rgba(154,122,204,0.4)',
    items: [
      { action: 'Create a quiz', amount: '80', note: null },
      { action: 'Quiz with 10+ questions', amount: '100', note: null },
      { action: 'Quiz with 20+ questions', amount: '130', note: null },
      { action: 'Someone plays your quiz', amount: '+3', note: 'per play, max 150/day' },
    ],
  },
  {
    id: 'milestones',
    label: 'Creator milestones',
    icon: '\u25C6',
    color: '#e8a060',
    colorBg: 'rgba(232,160,96,0.06)',
    colorBorder: 'rgba(232,160,96,0.12)',
    colorMuted: 'rgba(232,160,96,0.4)',
    items: [
      { action: 'Quiz reaches 50 plays', amount: '+50', note: 'one-time' },
      { action: 'Quiz reaches 100 plays', amount: '+100', note: 'one-time' },
      { action: 'Quiz reaches 500 plays', amount: '+250', note: 'one-time' },
      { action: 'Quiz reaches 1,000 plays', amount: '+500', note: 'one-time' },
    ],
  },
  {
    id: 'share',
    label: 'Share',
    icon: '\u2197',
    color: '#4a90d0',
    colorBg: 'rgba(74,144,208,0.06)',
    colorBorder: 'rgba(74,144,208,0.12)',
    colorMuted: 'rgba(74,144,208,0.4)',
    items: [
      { action: 'Share to Reddit (3+ clicks)', amount: '+60', note: null },
      { action: 'Share to Twitter (3+ clicks)', amount: '+40', note: null },
      { action: 'Share link (10+ clicks)', amount: '+30', note: null },
    ],
  },
  {
    id: 'daily',
    label: 'Daily & Streaks',
    icon: '\u2661',
    color: '#d06080',
    colorBg: 'rgba(208,96,128,0.06)',
    colorBorder: 'rgba(208,96,128,0.12)',
    colorMuted: 'rgba(208,96,128,0.4)',
    items: [
      { action: 'Daily login', amount: '20', note: null },
      { action: '3-day streak', amount: '+30', note: null },
      { action: '7-day streak', amount: '+100', note: null },
      { action: '14-day streak', amount: '+200', note: null },
      { action: '30-day streak', amount: '+500', note: null },
    ],
  },
];

// ---- Sub-components ----

function EarningRow({ item, color, colorMuted, isLast }: {
  item: EarnItem;
  color: string;
  colorMuted: string;
  isLast: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.03)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: '#2c2c2a' }}>{item.action}</span>
        {item.note && (
          <span style={{ fontSize: 9, color: '#b4b2a9', marginLeft: 4 }}>({item.note})</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{item.amount}</span>
        <span style={{ fontSize: 8, color: colorMuted, fontWeight: 600 }}>{'\uBCC4'}</span>
      </div>
    </div>
  );
}

function CategoryCard({ cat, isOpen, onToggle }: {
  cat: Category;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      background: '#fff',
      border: `1px solid ${isOpen ? cat.colorBorder : 'rgba(0,0,0,0.04)'}`,
      boxShadow: isOpen ? `0 2px 12px ${cat.colorBg}` : 'none',
      transition: 'all 0.2s',
    }}>
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 12px',
          cursor: 'pointer',
          background: isOpen ? cat.colorBg : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: isOpen ? cat.color : cat.colorBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: isOpen ? '#fff' : cat.color,
          fontWeight: 700,
          transition: 'all 0.2s',
          flexShrink: 0,
        }}>
          {cat.icon}
        </div>

        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#2c2c2a' }}>{cat.label}</span>

        {!isOpen && (
          <span style={{
            fontSize: 9, fontWeight: 600, color: cat.color,
            padding: '2px 8px', borderRadius: 8,
            background: cat.colorBg, border: `0.5px solid ${cat.colorBorder}`,
          }}>
            {cat.items.length} ways
          </span>
        )}

        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={isOpen ? cat.color : '#d3d1c7'} strokeWidth="1.5" strokeLinecap="round" style={{
          flexShrink: 0, transition: 'transform 0.2s, stroke 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          <path d="M3 4.5L6 7.5 9 4.5" />
        </svg>
      </div>

      {isOpen && (
        <div style={{ padding: '0 12px 8px' }}>
          {cat.items.map((item, i) => (
            <EarningRow
              key={i}
              item={item}
              color={cat.color}
              colorMuted={cat.colorMuted}
              isLast={i === cat.items.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Main ----

interface EarnByeolSectionProps {
  balance: number;
}

export function EarnByeolSection({ balance }: EarnByeolSectionProps) {
  const [openCats, setOpenCats] = useState<string[]>([]);

  const toggle = (id: string) => {
    setOpenCats(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };

  return (
    <div className="mb-6">
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(232,160,96,0.08)',
          border: '1px solid rgba(232,160,96,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16,
        }}>&#11088;</div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#2c2c2a', margin: 0 }}>Earn Byeol</p>
          <p style={{ fontSize: 9, color: '#b4b2a9', margin: 0, marginTop: 1 }}>Play, create, share - collect cards faster</p>
        </div>
      </div>

      {/* Quick stats bar */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 12, padding: '8px 10px',
        borderRadius: 10, background: 'rgba(232,160,96,0.04)',
        border: '1px solid rgba(232,160,96,0.08)',
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#e8a060', margin: 0 }}>{balance.toLocaleString()}</p>
          <p style={{ fontSize: 7, color: '#b4b2a9', margin: 0, marginTop: 1 }}>Your balance</p>
        </div>
        <div style={{ width: 1, background: 'rgba(232,160,96,0.1)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#D4537E', margin: 0 }}>100</p>
          <p style={{ fontSize: 7, color: '#b4b2a9', margin: 0, marginTop: 1 }}>Pack cost</p>
        </div>
        <div style={{ width: 1, background: 'rgba(232,160,96,0.1)' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#408070', margin: 0 }}>~2-3</p>
          <p style={{ fontSize: 7, color: '#b4b2a9', margin: 0, marginTop: 1 }}>Games per pack</p>
        </div>
      </div>

      {/* Category cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {CATEGORIES.map(cat => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            isOpen={openCats.includes(cat.id)}
            onToggle={() => toggle(cat.id)}
          />
        ))}
      </div>

      {/* Pro tip */}
      <div style={{
        marginTop: 12, padding: '8px 12px', borderRadius: 10,
        background: 'rgba(154,122,204,0.04)',
        border: '1px solid rgba(154,122,204,0.08)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 12 }}>&#128161;</span>
        <p style={{ fontSize: 9, color: '#888780', margin: 0, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600, color: '#9a7acc' }}>Pro tip:</span> Creating quizzes earns 2-3x more than playing. A popular quiz with 100+ plays can earn you 500+ {'\uBCC4'} passively.
        </p>
      </div>
    </div>
  );
}
