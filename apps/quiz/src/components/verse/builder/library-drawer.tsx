'use client';

// V-BUILDER-2 step 4 - THE LIBRARY DRAWER (locked co-designs 2 + 5). A floating LEFT
// drawer over the canvas: Esc closes, focus-trapped while open, never docks. Blocks tab
// = search + a local FREQUENT row + the registry's categories as 2-up cards (icon +
// name + one-line description), with HONEST-HINT cards for blocks whose data source is
// empty for this space (the min-gate sentence, never a ghost insert). Patterns tab =
// schematic gray previews of the v1 pattern set; inserting drops each block fresh so the
// group dissolves. All cards read from the REGISTRY / PATTERNS - no hardcoded list.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { allBlockSpecs } from '@/lib/verse/composition/registry';
import { PATTERNS } from '@/lib/verse/composition/patterns';

import type { BlockSpec, BlockCategory } from '@/lib/verse/composition/registry';
import type { PatternSpec } from '@/lib/verse/composition/patterns';

const FREQ_KEY = 'vb-frequent-blocks';
const FREQ_MAX = 6;
// Order the categories; empty ones (layout/fan today) drop out automatically.
const CATEGORY_ORDER: BlockCategory[] = ['text', 'media', 'live', 'doorway', 'layout', 'fan'];
const CATEGORY_LABEL: Record<BlockCategory, string> = { text: 'Text', media: 'Media', live: 'Live', doorway: 'Doorways', layout: 'Layout', fan: 'Fan' };

export function readFrequent(): string[] {
  try { return JSON.parse(localStorage.getItem(FREQ_KEY) ?? '[]').filter((x: unknown) => typeof x === 'string').slice(0, FREQ_MAX); } catch { return []; }
}
export function pushFrequent(type: string): void {
  try {
    const cur = readFrequent().filter((t) => t !== type);
    localStorage.setItem(FREQ_KEY, JSON.stringify([type, ...cur].slice(0, FREQ_MAX)));
  } catch { /* private mode: frequent is a nicety, never a hard fail */ }
}

// curator/none blocks are always insertable (they START empty and get filled); a block
// is unavailable only when its real data source is empty for this space.
function ready(spec: BlockSpec, sourceReady: Record<string, boolean>): boolean {
  if (spec.dataSource === 'curator' || spec.dataSource === 'none') return true;
  return sourceReady[spec.type] !== false;
}

export function LibraryDrawer({ open, onClose, sourceReady, sheet, onInsertBlock, onInsertPattern }: {
  open: boolean; onClose: () => void; sourceReady: Record<string, boolean>; sheet?: boolean;
  onInsertBlock: (type: string) => void; onInsertPattern: (pattern: PatternSpec) => void;
}): React.ReactElement | null {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const [tab, setTab] = useState<'blocks' | 'patterns'>('blocks');
  const [query, setQuery] = useState('');
  const [frequent, setFrequent] = useState<string[]>([]);

  const specs = useMemo(() => allBlockSpecs(), []);
  const specByType = useMemo(() => Object.fromEntries(specs.map((s) => [s.type, s])), [specs]);

  useEffect(() => { if (open) setFrequent(readFrequent()); }, [open]);

  // focus trap: focus the panel on open, restore on close, keep Tab inside, Esc closes.
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? []).filter((e) => !e.hasAttribute('disabled'));
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0]!, last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    panel?.addEventListener('keydown', onKey);
    return () => { panel?.removeEventListener('keydown', onKey); restoreRef.current?.focus?.(); };
  }, [open, onClose]);

  const doInsertBlock = useCallback((type: string) => { pushFrequent(type); setFrequent(readFrequent()); onInsertBlock(type); }, [onInsertBlock]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matches = (s: BlockSpec) => !q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.type.includes(q);
  const categories = CATEGORY_ORDER.map((cat) => ({ cat, items: specs.filter((s) => s.category === cat && matches(s)) })).filter((g) => g.items.length);
  const freqSpecs = frequent.map((t) => specByType[t]).filter(Boolean) as BlockSpec[];

  return (
    <div role="dialog" aria-modal="true" aria-label="Add a block" ref={panelRef}
      style={{
        position: 'absolute', zIndex: 65, display: 'flex', flexDirection: 'column', pointerEvents: 'auto',
        background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)',
        boxShadow: '0 18px 60px color-mix(in srgb, black 28%, transparent)',
        ...(sheet
          ? { left: 0, right: 0, bottom: 0, top: 'auto', maxHeight: '76vh', borderRadius: '16px 16px 0 0' }
          : { top: 12, left: 12, bottom: 12, width: 340, maxWidth: 'calc(100% - 24px)', borderRadius: 14 }),
      }}>
      {/* header + tabs */}
      <div style={{ padding: '12px 12px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <strong style={{ fontSize: 14, fontWeight: 800 }}>Add a block</strong>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={onClose} aria-label="Close library" style={iconBtn()}>×</button>
        </div>
        <div role="tablist" aria-label="Library" style={{ display: 'inline-flex', gap: 4, marginTop: 10 }}>
          {(['blocks', 'patterns'] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} style={tabBtn(tab === t)}>
              {t === 'blocks' ? 'Blocks' : 'Patterns'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12 }}>
        {tab === 'blocks' ? (
          <>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search blocks…" aria-label="Search blocks"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13, marginBottom: 12 }} />

            {freqSpecs.length && !q ? (
              <section style={{ marginBottom: 14 }}>
                <h3 style={sectionH}>Frequent</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {freqSpecs.map((s) => (
                    <button key={s.type} type="button" onClick={() => doInsertBlock(s.type)} disabled={!ready(s, sourceReady)} style={chip(ready(s, sourceReady))}>
                      <CatIcon name={s.icon} /> {s.name}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {categories.map(({ cat, items }) => (
              <section key={cat} style={{ marginBottom: 14 }}>
                <h3 style={sectionH}>{CATEGORY_LABEL[cat]}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {items.map((s) => <BlockCard key={s.type} spec={s} isReady={ready(s, sourceReady)} onInsert={() => doInsertBlock(s.type)} />)}
                </div>
              </section>
            ))}
            {!categories.length ? <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>No blocks match “{query}”.</p> : null}
          </>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {PATTERNS.map((p) => <PatternCard key={p.id} pattern={p} sourceReady={sourceReady} specByType={specByType} onInsert={() => onInsertPattern(p)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockCard({ spec, isReady, onInsert }: { spec: BlockSpec; isReady: boolean; onInsert: () => void }): React.ReactElement {
  return (
    <button type="button" onClick={isReady ? onInsert : undefined} disabled={!isReady} aria-disabled={!isReady}
      data-block-card={spec.type} data-ready={isReady ? '1' : '0'}
      title={isReady ? `Insert ${spec.name}` : spec.minGateRule}
      style={{
        textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, padding: 10, borderRadius: 10, minHeight: 74,
        border: '1px solid var(--border)', background: isReady ? 'var(--bg-primary)' : 'var(--surface-alt)',
        color: 'var(--text-primary)', cursor: isReady ? 'pointer' : 'not-allowed', opacity: isReady ? 1 : 0.92,
      }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: isReady ? 'var(--vb-accent)' : 'var(--text-tertiary)' }}>
        <CatIcon name={spec.icon} /> {spec.name}
      </span>
      <span style={{ fontSize: 11, lineHeight: 1.35, color: 'var(--text-secondary)' }}>
        {isReady ? spec.description : spec.minGateRule}
      </span>
    </button>
  );
}

function PatternCard({ pattern, sourceReady, specByType, onInsert }: { pattern: PatternSpec; sourceReady: Record<string, boolean>; specByType: Record<string, BlockSpec>; onInsert: () => void }): React.ReactElement {
  const emptyCount = pattern.blocks.filter((b) => { const s = specByType[b.type]; return s && !ready(s, sourceReady); }).length;
  return (
    <button type="button" onClick={onInsert} data-pattern-card={pattern.id} title={`Insert the ${pattern.name} pattern`}
      style={{ textAlign: 'left', display: 'flex', gap: 12, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
      {/* schematic mini-preview: one gray bar per block, NEVER fabricated content */}
      <div aria-hidden style={{ width: 46, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3, justifyContent: 'center' }}>
        {pattern.blocks.map((_, i) => (
          <span key={i} style={{ height: 8, borderRadius: 2, background: `color-mix(in srgb, var(--vb-accent) ${i % 2 ? 22 : 40}%, var(--border))` }} />
        ))}
      </div>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <strong style={{ fontSize: 13, fontWeight: 700 }}>{pattern.name}</strong>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.35 }}>{pattern.description}</span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {pattern.blocks.length} block{pattern.blocks.length === 1 ? '' : 's'}{emptyCount ? ` · ${emptyCount} need data (shown as a hint)` : ''}
        </span>
      </span>
    </button>
  );
}

// ---- style helpers ----
const sectionH: React.CSSProperties = { margin: '0 0 8px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-tertiary)' };
function iconBtn(): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }; }
function tabBtn(active: boolean): React.CSSProperties { return { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--vb-accent)' : 'var(--border)'), background: active ? 'color-mix(in srgb, var(--vb-accent) 14%, transparent)' : 'transparent', color: active ? 'var(--vb-accent)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }; }
function chip(isReady: boolean): React.CSSProperties { return { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, border: '1px solid var(--border)', background: isReady ? 'var(--bg-primary)' : 'var(--surface-alt)', color: isReady ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: 12, fontWeight: 600, cursor: isReady ? 'pointer' : 'not-allowed' }; }

// ---- category / block icons (SVG, never emoji); many registry keys share a glyph ----
const IS = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
export function CatIcon({ name }: { name: string }): React.ReactElement {
  const p = (d: string) => <svg width={13} height={13} viewBox="0 0 24 24" {...IS} aria-hidden>{d.split('|').map((x, i) => <path key={i} d={x} />)}</svg>;
  switch (name) {
    case 'text': case 'book': case 'feather': return p('M4 6h16|M4 12h16|M4 18h10');
    case 'quote': return p('M7 7h4v4a4 4 0 0 1-4 4|M15 7h4v4a4 4 0 0 1-4 4');
    case 'info': case 'meter': case 'stats': case 'poll': return p('M6 20V10|M12 20V4|M18 20v-7');
    case 'people': return p('M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6|M3 20a6 6 0 0 1 12 0|M17 7a2.5 2.5 0 1 1 0 5|M16 13a5 5 0 0 1 5 5');
    case 'music': return p('M9 18V6l10-2v12|M9 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0|M19 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0');
    case 'timeline': case 'calendar': case 'clock': return p('M12 7v5l3 2|M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18');
    case 'map': return p('M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11|M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4');
    case 'grid': case 'game': return p('M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z');
    case 'chat': case 'signal': return p('M4 5h16v11H8l-4 4z');
    case 'link': return p('M9 15l6-6|M10 7l1-1a4 4 0 0 1 6 6l-1 1|M14 17l-1 1a4 4 0 0 1-6-6l1-1');
    case 'star': return p('M12 4l2.4 5 5.6.6-4 3.8 1 5.6-5-2.9-5 2.9 1-5.6-4-3.8 5.6-.6z');
    default: return p('M5 5h14v14H5z');
  }
}
