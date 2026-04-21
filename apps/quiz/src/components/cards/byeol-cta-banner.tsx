'use client';

import { useState } from 'react';
import Link from 'next/link';

export function ByeolCTABanner() {
  const [h, setH] = useState(false);

  return (
    <Link
      href="/cards"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit",
        padding: "10px 14px", borderRadius: 12,
        background: h ? "rgba(212,83,126,0.06)" : "rgba(212,83,126,0.03)",
        border: "1px solid", borderColor: h ? "rgba(212,83,126,0.2)" : "rgba(212,83,126,0.1)",
        transition: "all 0.2s",
      }}
    >
      {/* Mini card stack */}
      <div style={{ position: "relative", width: 42, height: 36, flexShrink: 0 }}>
        {[
          { r: "R", c: "#4a4a6a", bg: "#1a3a5a", rot: -8, x: 0 },
          { r: "S", c: "#9a7acc", bg: "#2a2a4a", rot: 0, x: 10 },
          { r: "SS", c: "#c0a0e8", bg: "#5a2a3a", rot: 8, x: 20 },
        ].map((card, i) => (
          <div key={i} style={{
            position: "absolute", left: card.x, top: i * 2,
            width: 22, height: 32, borderRadius: 4,
            background: card.bg, border: `1px solid ${card.c}`,
            transform: `rotate(${card.rot}deg)`, zIndex: i,
            boxShadow: i === 2 ? `0 0 6px ${card.c}30` : "none",
          }}>
            <span style={{ position: "absolute", top: 1, right: 1, fontSize: 4, fontWeight: 800, color: "#fff", padding: "0 2px", borderRadius: 2, background: `${card.c}aa` }}>{card.r}</span>
          </div>
        ))}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#2c2c2a" }}>Collect K-pop fancards</span>
          <span style={{ fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "rgba(232,160,96,0.12)", color: "#e8a060", border: "1px solid rgba(232,160,96,0.15)" }}>NEW</span>
        </div>
        <p style={{ fontSize: 10, color: "#b4b2a9", margin: 0, marginTop: 1 }}>
          Earn <span style={{ color: "#e8a060", fontWeight: 600 }}>Byeol</span> playing quizzes, open packs, collect idols
        </p>
      </div>

      {/* Arrow */}
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke={h ? "#D4537E" : "#d3d1c7"} strokeWidth="1.5" strokeLinecap="round" style={{ flexShrink: 0, transition: "all 0.2s" }}>
        <path d="M5 2.5L9.5 7 5 11.5" />
      </svg>
    </Link>
  );
}
