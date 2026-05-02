/* global React */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ─── Icons (tiny inline SVGs — kept simple) ──────────────────────────────────
const Icon = {
  Search: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||16} height={p.size||16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
    </svg>
  ),
  Heart: ({ filled, size, ...p }) => (
    <svg viewBox="0 0 24 24" width={size||16} height={size||16} fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
    </svg>
  ),
  Play: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="currentColor" {...p}>
      <path d="M8 5v14l11-7z"/>
    </svg>
  ),
  Users: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/>
      <path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  Clock: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
    </svg>
  ),
  Star: ({ filled, size, ...p }) => (
    <svg viewBox="0 0 24 24" width={size||14} height={size||14} fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>
    </svg>
  ),
  Sparkle: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="currentColor" {...p}>
      <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/>
    </svg>
  ),
  Bolt: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="currentColor" {...p}>
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  X: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Home: ({ filled, size, ...p }) => (
    <svg viewBox="0 0 24 24" width={size||18} height={size||18} fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Trophy: ({ filled, size, ...p }) => (
    <svg viewBox="0 0 24 24" width={size||18} height={size||18} fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z"/>
      <path d="M17 4h3v3a3 3 0 01-3 3M7 4H4v3a3 3 0 003 3"/>
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||18} height={p.size||18} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  User: ({ filled, size, ...p }) => (
    <svg viewBox="0 0 24 24" width={size||18} height={size||18} fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  ArrowRight: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  ArrowLeft: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  Share: (p) => (
    <svg viewBox="0 0 24 24" width={p.size||14} height={p.size||14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="18" cy="5" r="3"/>
      <circle cx="6" cy="12" r="3"/>
      <circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
};

// ─── Atoms ───────────────────────────────────────────────────────────────────
function fmtCount(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1).replace(/\.0$/,'') + 'M';
  if (n >= 1000) return (n/1000).toFixed(1).replace(/\.0$/,'') + 'k';
  return String(n);
}

function TypePill({ type }) {
  const t = window.QUIZ_TYPES[type];
  return (
    <span className={`type-pill type-${type}`}>
      <span className={`dot type-dot-${type}`}></span>
      {t.label}
    </span>
  );
}

function DifficultyPill({ difficulty }) {
  return <span className={`diff-pill diff-${difficulty}`}>{window.DIFFICULTIES[difficulty].label}</span>;
}

function GroupLogo({ slug, size=28, ring=false }) {
  const g = window.GROUPS.find(x => x.slug === slug);
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', display: 'inline-block',
      background: g?.color || 'var(--bg-elevated)',
      border: ring ? '2px solid var(--bg-surface)' : '1px solid var(--border)',
      flexShrink: 0,
      boxShadow: ring ? 'var(--shadow-card)' : 'none',
    }}>
      <img src={g.logo} alt={g.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </span>
  );
}

function GroupPill({ slug, onClick }) {
  const g = window.GROUPS.find(x => x.slug === slug);
  return (
    <button onClick={onClick} className="btn-ghost" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px 4px 4px', borderRadius: 9999,
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      fontSize: 12, fontWeight: 600, color: 'var(--text-primary)',
    }}>
      <GroupLogo slug={slug} size={20} />
      {g.name}
    </button>
  );
}

function Avatar({ creator, size=28 }) {
  const initial = (creator.name || '?').charAt(0).toUpperCase();
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: creator.bg, color: creator.text,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size*0.45, fontWeight: 700, flexShrink: 0,
    }}>{initial}</span>
  );
}

// Expose
Object.assign(window, { Icon, fmtCount, TypePill, DifficultyPill, GroupLogo, GroupPill, Avatar });
