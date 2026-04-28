'use client';

import { useState } from 'react';

const TIERS = [
  { rarity: 'R', label: 'Rare', drop: '60%', desc: 'Common cards, easy to find', color: '#888780', bg: 'rgba(136,135,128,0.06)' },
  { rarity: 'S', label: 'Super Rare', drop: '28%', desc: 'Notable cards, good pulls', color: '#9a7acc', bg: 'rgba(154,122,204,0.06)' },
  { rarity: 'SS', label: 'Ultra Rare', drop: '10%', desc: 'Special edition, hard to get', color: '#c0a0e8', bg: 'rgba(192,160,232,0.06)' },
  { rarity: 'SSS', label: 'Legendary', drop: '2%', desc: 'The rarest - ultimate flex', color: '#e8a060', bg: 'rgba(232,160,96,0.06)' },
];

export function RarityInfoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          width: 14, height: 14, borderRadius: '50%',
          background: '#f0ede8',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 700, color: '#b4b2a9',
          cursor: 'pointer',
        }}
      >?</div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 340, width: '100%',
              padding: '16px',
              borderRadius: 14,
              background: '#fff', border: '1px solid #e8e6e0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2c2c2a' }}>Card rarity</span>
              <div
                onClick={() => setOpen(false)}
                style={{ fontSize: 12, color: '#b4b2a9', cursor: 'pointer' }}
              >{'\u2715'}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TIERS.map(r => (
                <div key={r.rarity} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: r.bg,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.6)',
                    border: `1.5px solid ${r.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: r.color,
                  }}>{r.rarity}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#2c2c2a' }}>{r.label}</span>
                      <span style={{ fontSize: 8, color: r.color, fontWeight: 600 }}>{r.drop}</span>
                    </div>
                    <p style={{ fontSize: 8, color: '#b4b2a9', margin: 0, marginTop: 1 }}>{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
