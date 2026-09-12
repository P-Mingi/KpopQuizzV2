'use client';

import { useEffect, useReducer, useRef, useState, useCallback } from 'react';

import { ADDABLE_TIER_COLORS, UNRANKED, defaultTiers } from '@/lib/tier-list/defaults';
import { buildInitialPlacements, normalizePlacements } from '@/lib/tier-list/serialization';
import { encodeBoard } from '@/lib/tier-list/share-state';

import type { Placements, Tier, TierListItem } from '@/lib/tier-list/types';

// The maker. Board state (tiers + placements) always flows through the
// src/lib/tier-list serialization so the exactly-once invariant holds through
// every move, tier edit, undo and autosave. Desktop = HTML5 drag-and-drop;
// mobile/touch = tap a card then tap a tier. Autosaves to localStorage. No DB.

interface BoardState { tiers: Tier[]; placements: Placements }
interface HistoryState { past: BoardState[]; present: BoardState; future: BoardState[] }

type Action =
  | { type: 'load'; state: BoardState }
  | { type: 'place'; itemId: string; bucket: string }
  | { type: 'addTier' }
  | { type: 'removeTier'; label: string }
  | { type: 'renameTier'; label: string; next: string }
  | { type: 'recolorTier'; label: string; color: string }
  | { type: 'reset'; items: TierListItem[] }
  | { type: 'undo' }
  | { type: 'redo' };

function place(state: BoardState, itemId: string, bucket: string): BoardState {
  const placements: Placements = {};
  for (const [k, ids] of Object.entries(state.placements)) placements[k] = ids.filter((id) => id !== itemId);
  if (!placements[bucket]) placements[bucket] = [];
  placements[bucket] = [...placements[bucket]!, itemId];
  return { ...state, placements };
}

function reduceBoard(state: BoardState, action: Action, items: TierListItem[]): BoardState {
  switch (action.type) {
    case 'place':
      return place(state, action.itemId, action.bucket);
    case 'addTier': {
      const used = new Set(state.tiers.map((t) => t.label));
      const nextLabel = ['F', 'E', 'G', 'H'].find((l) => !used.has(l)) ?? `T${state.tiers.length + 1}`;
      const color = ADDABLE_TIER_COLORS[state.tiers.length % ADDABLE_TIER_COLORS.length]!;
      const tiers = [...state.tiers, { label: nextLabel, color, ord: state.tiers.length }];
      return { tiers, placements: { ...state.placements, [nextLabel]: [] } };
    }
    case 'removeTier': {
      const tiers = state.tiers.filter((t) => t.label !== action.label).map((t, i) => ({ ...t, ord: i }));
      return { tiers, placements: normalizePlacements(state.placements, tiers, items) };
    }
    case 'renameTier': {
      if (!action.next || state.tiers.some((t) => t.label === action.next)) return state;
      const tiers = state.tiers.map((t) => (t.label === action.label ? { ...t, label: action.next } : t));
      const placements: Placements = {};
      for (const [k, ids] of Object.entries(state.placements)) placements[k === action.label ? action.next : k] = ids;
      return { tiers, placements };
    }
    case 'recolorTier':
      return { ...state, tiers: state.tiers.map((t) => (t.label === action.label ? { ...t, color: action.color } : t)) };
    case 'reset': {
      const tiers = defaultTiers();
      return { tiers, placements: buildInitialPlacements(action.items, tiers) };
    }
    default:
      return state;
  }
}

function historyReducer(items: TierListItem[]) {
  return (h: HistoryState, action: Action): HistoryState => {
    if (action.type === 'load') return { past: [], present: action.state, future: [] };
    if (action.type === 'undo') {
      if (h.past.length === 0) return h;
      const prev = h.past[h.past.length - 1]!;
      return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
    }
    if (action.type === 'redo') {
      if (h.future.length === 0) return h;
      const next = h.future[0]!;
      return { past: [...h.past, h.present], present: next, future: h.future.slice(1) };
    }
    const present = reduceBoard(h.present, action, items);
    if (present === h.present) return h;
    return { past: [...h.past, h.present], present, future: [] };
  };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name.slice(0, 2).toUpperCase();
}

function Face({ item, picked, onPick, onDragStart, onDragEnd, dragging }: {
  item: TierListItem; picked: boolean; onPick: () => void;
  onDragStart: () => void; onDragEnd: () => void; dragging: boolean;
}) {
  return (
    <div
      className={`tl-face${picked ? ' picked' : ''}${dragging ? ' dragging' : ''}`}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragEnd={onDragEnd}
      onClick={onPick}
      role="button"
      tabIndex={0}
      aria-label={item.name}
      aria-pressed={picked}
      data-item-id={item.id}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } }}
    >
      {item.image_url ? <img src={item.image_url} alt="" /> : <span className="tl-ini">{initials(item.name)}</span>}
      <span className="tl-nm">{item.name}</span>
    </div>
  );
}

export function TierMaker({ items, boardId, title }: { items: TierListItem[]; boardId: string; title: string }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const [history, dispatch] = useReducer(
    historyReducer(items),
    undefined,
    (): HistoryState => {
      const tiers = defaultTiers();
      return { past: [], present: { tiers, placements: buildInitialPlacements(items, tiers) }, future: [] };
    },
  );
  const { tiers, placements } = history.present;

  const [picked, setPicked] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropBucket, setDropBucket] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Load a saved board once, on mount (client only).
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const raw = localStorage.getItem(`tl:${boardId}`);
      if (raw) {
        const saved = JSON.parse(raw) as BoardState;
        const tiersSafe = Array.isArray(saved.tiers) && saved.tiers.length ? saved.tiers : defaultTiers();
        dispatch({ type: 'load', state: { tiers: tiersSafe, placements: normalizePlacements(saved.placements, tiersSafe, items) } });
      }
    } catch { /* ignore corrupt state */ }
  }, [boardId, items]);

  // Autosave.
  useEffect(() => {
    if (!loadedRef.current) return;
    try { localStorage.setItem(`tl:${boardId}`, JSON.stringify(history.present)); } catch { /* quota */ }
  }, [history.present, boardId]);

  const onTap = useCallback((bucket: string) => {
    if (!picked) return;
    dispatch({ type: 'place', itemId: picked, bucket });
    setPicked(null);
  }, [picked]);

  const unranked = (placements[UNRANKED] ?? []).map((id) => byId.get(id)).filter(Boolean) as TierListItem[];

  function share() {
    const d = encodeBoard({ title, tiers, placements, items });
    window.location.assign(`/tier-list/share?d=${d}`);
  }

  return (
    <div className="tl">
      <div className="tl-toolbar" role="toolbar" aria-label="Maker toolbar">
        <button type="button" className="tl-iconbtn" aria-label="Undo" disabled={history.past.length === 0} onClick={() => dispatch({ type: 'undo' })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" /></svg>
        </button>
        <button type="button" className="tl-iconbtn" aria-label="Redo" disabled={history.future.length === 0} onClick={() => dispatch({ type: 'redo' })}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14l5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h1" /></svg>
        </button>
        <button type="button" className="tl-chip sm" onClick={() => dispatch({ type: 'addTier' })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add tier
        </button>
        <button type="button" className="tl-chip sm" onClick={() => dispatch({ type: 'reset', items })}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
          Reset
        </button>
        <div style={{ flex: 1 }} />
        <button type="button" className="tl-btn grad sm" onClick={share} data-testid="share-btn">
          Share
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
        </button>
      </div>

      <div className="tl-maker">
        {/* Board */}
        <div className="tl-board" data-testid="tl-board">
          {tiers.map((t) => {
            const rowItems = (placements[t.label] ?? []).map((id) => byId.get(id)).filter(Boolean) as TierListItem[];
            return (
              <div className="tl-tier" key={t.label}>
                <div
                  className="tl-tlabel"
                  style={{ background: t.color }}
                  onClick={() => setEditing(editing === t.label ? null : t.label)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Tier ${t.label} settings`}
                  onKeyDown={(e) => { if (e.key === 'Enter') setEditing(editing === t.label ? null : t.label); }}
                >
                  {t.label}
                </div>
                <div
                  className={`tl-tstrip${rowItems.length === 0 ? ' empty' : ''}${dropBucket === t.label ? ' drop' : ''}${picked ? ' placeable' : ''}`}
                  data-testid={`tier-${t.label}`}
                  onDragOver={(e) => { e.preventDefault(); setDropBucket(t.label); }}
                  onDragLeave={() => setDropBucket((b) => (b === t.label ? null : b))}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) dispatch({ type: 'place', itemId: id, bucket: t.label }); setDropBucket(null); setDragId(null); }}
                  onClick={() => onTap(t.label)}
                >
                  {rowItems.length === 0 ? (picked ? 'Tap here to place' : 'Drag or tap items here') : rowItems.map((it) => (
                    <Face key={it.id} item={it} picked={picked === it.id} dragging={dragId === it.id}
                      onPick={() => setPicked(picked === it.id ? null : it.id)}
                      onDragStart={() => setDragId(it.id)} onDragEnd={() => setDragId(null)} />
                  ))}
                </div>
                {editing === t.label && (
                  <TierEditor tier={t} canRemove={tiers.length > 1}
                    onRename={(next) => { dispatch({ type: 'renameTier', label: t.label, next }); setEditing(null); }}
                    onRecolor={(color) => dispatch({ type: 'recolorTier', label: t.label, color })}
                    onRemove={() => { dispatch({ type: 'removeTier', label: t.label }); setEditing(null); }}
                    onClose={() => setEditing(null)} />
                )}
              </div>
            );
          })}
        </div>

        {/* Unranked tray */}
        <div className="tl-tray tl-maker-tray">
          <div className="tl-betw" style={{ marginBottom: 10 }}>
            <div className="tl-h3" style={{ margin: 0 }}>Unranked</div>
            <span className="tl-pill-count">{unranked.length} left</span>
          </div>
          <div
            className={`tl-tray-grid${dropBucket === UNRANKED ? ' drop' : ''}`}
            data-testid="tray"
            onDragOver={(e) => { e.preventDefault(); setDropBucket(UNRANKED); }}
            onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) dispatch({ type: 'place', itemId: id, bucket: UNRANKED }); setDropBucket(null); setDragId(null); }}
            onClick={() => onTap(UNRANKED)}
          >
            {unranked.length === 0 ? <span className="tl-mut">Everything is ranked.</span> : unranked.map((it) => (
              <Face key={it.id} item={it} picked={picked === it.id} dragging={dragId === it.id}
                onPick={() => setPicked(picked === it.id ? null : it.id)}
                onDragStart={() => setDragId(it.id)} onDragEnd={() => setDragId(null)} />
            ))}
          </div>
          <p className="tl-mut" style={{ marginTop: 10 }}>Drag a card onto a tier. On phone, tap a card then tap a tier.</p>
        </div>
      </div>
    </div>
  );
}

function TierEditor({ tier, canRemove, onRename, onRecolor, onRemove, onClose }: {
  tier: Tier; canRemove: boolean;
  onRename: (next: string) => void; onRecolor: (color: string) => void; onRemove: () => void; onClose: () => void;
}) {
  const [label, setLabel] = useState(tier.label);
  const swatches = ['#E8457A', '#F5894D', '#EBB33E', '#5FA65A', '#4F9BD9', '#9E998F', '#A83A8F', '#7B3FA8'];
  return (
    <div className="tl-card" style={{ position: 'absolute', zIndex: 30, marginTop: 4, padding: 12, boxShadow: 'var(--tl-lift)', minWidth: 220 }} data-testid={`tier-editor-${tier.label}`}>
      <label className="tl-mut" style={{ display: 'block', marginBottom: 4 }}>Label</label>
      <input value={label} maxLength={6} onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onRename(label.trim()); }}
        style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border-h)', padding: '0 10px', fontSize: 14, marginBottom: 10 }}
        aria-label="Tier label" />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
        {swatches.map((c) => (
          <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => onRecolor(c)}
            style={{ width: 22, height: 22, borderRadius: 6, background: c, border: c === tier.color ? '2px solid var(--txt1)' : '1px solid var(--border)', cursor: 'pointer' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="tl-btn sm pri" onClick={() => onRename(label.trim())}>Save</button>
        {canRemove && <button type="button" className="tl-btn sm out" onClick={onRemove}>Remove</button>}
        <button type="button" className="tl-btn sm out" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
