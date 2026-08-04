'use client';

// V-BUILDER-2 step 2 - THE BUILDER SHELL + SELECTION OVERLAY (locked co-design 1).
// A full-screen fixed takeover: a slim top bar + a same-origin iframe of the step-1
// draft render (/build/{slug}). A client overlay reads the iframe geometry to draw
// the selection (accent outline + name tag + grip/duplicate handles + "+ add block"
// seams). The overlay lives in THIS document and NEVER mutates the iframe document -
// it only reads getBoundingClientRect and attaches listeners, so it injects zero
// layout shift into the canvas. Structural editing + publish land in step 3; here
// undo/redo/publish are present but inert (honest), selection + device switch work.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { blockSpec } from '@/lib/verse/composition/registry';

interface BlockRect { id: string; type: string; top: number; left: number; width: number; height: number }
type Device = 'desktop' | 'tablet' | 'phone';

// Real device widths (the canvas reflows to these; the render is responsive).
const DEVICE_W: Record<Device, number | null> = { desktop: null, tablet: 834, phone: 390 };
const TOP_BAR_H = 52;

export function BuilderShell({ spaceName, draftPath, previewPath, hasDraft, updatedAt, scopeStyle }: {
  spaceName: string; draftPath: string; previewPath: string;
  hasDraft: boolean; updatedAt: string | null; scopeStyle: Record<string, string>;
}): React.ReactElement {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [blocks, setBlocks] = useState<BlockRect[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  // --- measure: read every block's geometry from the iframe (same-origin). Rects are
  // relative to the iframe viewport, which is exactly the overlay's coordinate space
  // (the overlay sits at the iframe's top-left), so scrolling the iframe just changes
  // these numbers and the overlay follows. READ-ONLY: never writes to the iframe DOM.
  const measure = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const next: BlockRect[] = [];
    doc.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) => {
      const id = el.getAttribute('data-block-id');
      if (!id) return;
      const r = el.getBoundingClientRect();
      next.push({ id, type: el.getAttribute('data-block-type') ?? '', top: r.top, left: r.left, width: r.width, height: r.height });
    });
    setBlocks(next);
  }, []);

  // --- wire the iframe on load: click-to-select (a listener, not a mutation),
  // scroll + content-resize -> re-measure. Returns cleanup for the effect.
  const onLoad = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const blockEl = target?.closest<HTMLElement>('[data-block-id]');
      if (!blockEl) return;
      // In the builder the canvas is for editing, not browsing: swallow the click so
      // links inside a module do not navigate, and select the block instead.
      e.preventDefault();
      e.stopPropagation();
      const id = blockEl.getAttribute('data-block-id');
      setSelectedId(id);
      setFocusId(id);
    };
    doc.addEventListener('click', onClick, true);

    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    win.addEventListener('scroll', schedule, { passive: true });
    win.addEventListener('resize', schedule);
    // Late reflow (images/fonts inside the canvas) -> keep rects honest.
    const ro = new ResizeObserver(schedule);
    if (doc.body) ro.observe(doc.body);

    measure();
    frame!.dataset.wired = '1';
    // cleanup handle stored on the element for the effect below
    (frame as unknown as { _vbCleanup?: () => void })._vbCleanup = () => {
      doc.removeEventListener('click', onClick, true);
      win.removeEventListener('scroll', schedule);
      win.removeEventListener('resize', schedule);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [measure]);

  useEffect(() => {
    const frame = iframeRef.current;
    return () => { (frame as unknown as { _vbCleanup?: () => void })?._vbCleanup?.(); };
  }, []);

  // Device switch: the iframe reflows to the new width; re-measure after the reflow.
  useEffect(() => {
    const t = setTimeout(measure, 80);
    return () => clearTimeout(t);
  }, [device, measure]);

  // Keyboard: Tab / Shift+Tab walk the blocks in reading (DOM) order, Enter selects,
  // Esc clears. Handled on the shell so we never fight the iframe's own tab order.
  const orderedIds = useMemo(() => blocks.map((b) => b.id), [blocks]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedId(null); setFocusId(null); return; }
      if (e.key === 'Tab' && orderedIds.length) {
        e.preventDefault();
        const cur = focusId ?? selectedId;
        const idx = cur ? orderedIds.indexOf(cur) : -1;
        const nextIdx = e.shiftKey ? (idx <= 0 ? orderedIds.length - 1 : idx - 1) : (idx + 1) % orderedIds.length;
        const nextId = orderedIds[nextIdx] ?? null;
        setFocusId(nextId);
        scrollBlockIntoView(nextId);
        return;
      }
      if (e.key === 'Enter' && focusId) { e.preventDefault(); setSelectedId(focusId); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [orderedIds, focusId, selectedId]);

  const scrollBlockIntoView = useCallback((id: string | null) => {
    if (!id) return;
    const doc = iframeRef.current?.contentDocument;
    doc?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
    requestAnimationFrame(measure);
  }, [measure]);

  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const focused = focusId && focusId !== selectedId ? blocks.find((b) => b.id === focusId) ?? null : null;
  const width = DEVICE_W[device];
  const savedLabel = hasDraft ? `Draft saved ${relTime(updatedAt)}` : 'No unpublished changes';

  return (
    <div
      className="vb-shell"
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column',
        background: 'var(--bg-primary)', color: 'var(--text-primary)',
        // space accent -> selection colour, with a guaranteed fallback to the brand.
        ...scopeStyle,
        ['--vb-accent' as string]: 'var(--verse-accent, var(--brand))',
        ['--vb-accent-text' as string]: 'var(--verse-accent-text, var(--accent-fg))',
      }}
    >
      {/* ---- slim top bar ---- */}
      <div style={{
        height: TOP_BAR_H, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)',
      }}>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          {spaceName} <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>· Builder</span>
        </span>

        <div style={{ width: 1, height: 22, background: 'var(--border)' }} aria-hidden />

        {/* device switcher */}
        <div role="group" aria-label="Preview device" style={{ display: 'inline-flex', gap: 2 }}>
          {(['desktop', 'tablet', 'phone'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} aria-label={d}
              title={d[0]!.toUpperCase() + d.slice(1)} style={iconBtn(device === d)}>
              <DeviceIcon device={d} />
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 22, background: 'var(--border)' }} aria-hidden />

        {/* undo / redo - inert until structural editing (step 3) */}
        <div role="group" aria-label="History" style={{ display: 'inline-flex', gap: 2 }}>
          <button type="button" disabled aria-label="Undo" title="Undo (arrives with editing)" style={iconBtn(false, true)}><UndoIcon flip={false} /></button>
          <button type="button" disabled aria-label="Redo" title="Redo (arrives with editing)" style={iconBtn(false, true)}><UndoIcon flip /></button>
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{savedLabel}</span>

        <div style={{ flex: 1 }} />

        <a href={previewPath} target="_blank" rel="noreferrer" style={textBtn(false)}>Preview</a>
        <button type="button" disabled title="Publishing arrives with editing (step 3)" style={textBtn(true)}>Publish</button>
      </div>

      {/* ---- canvas stage ---- */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', background: 'var(--surface-alt)' }}>
        <div style={{ position: 'relative', width: width ? `${width}px` : '100%', maxWidth: '100%', height: '100%', boxShadow: width ? '0 0 0 1px var(--border)' : 'none', background: 'var(--bg-primary)' }}>
          <iframe
            ref={iframeRef}
            src={draftPath}
            title={`${spaceName} builder canvas`}
            onLoad={onLoad}
            style={{ width: '100%', height: '100%', border: 0, display: 'block', background: 'var(--bg-primary)' }}
          />

          {/* selection overlay - pointer-events:none so clicks fall through to the
              iframe; clips to the canvas so outlines scroll with the content. */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden>
            {focused ? <FocusRing rect={focused} /> : null}
            {selected ? <Selection rect={selected} /> : null}
          </div>

          {/* status line: what is selected (accessible, out of the way) */}
          <div role="status" aria-live="polite" style={{ position: 'absolute', left: 10, bottom: 10, pointerEvents: 'none', fontSize: 11, color: 'var(--text-tertiary)' }}>
            {selected ? `Selected: ${labelFor(selected.type)}` : blocks.length ? `${blocks.length} blocks · click one to select` : 'Loading canvas…'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- overlay pieces (all positioned in iframe-viewport coordinates) ----

function Selection({ rect }: { rect: BlockRect }): React.ReactElement {
  const label = labelFor(rect.type);
  return (
    <>
      {/* "+ add block" seams above and below the block */}
      <Seam y={rect.top} left={rect.left} width={rect.width} />
      <Seam y={rect.top + rect.height} left={rect.left} width={rect.width} />

      {/* accent outline */}
      <div style={{
        position: 'absolute', top: rect.top, left: rect.left, width: rect.width, height: rect.height,
        border: '2px solid var(--vb-accent)', borderRadius: 8, boxSizing: 'border-box',
        boxShadow: '0 0 0 4px color-mix(in srgb, var(--vb-accent) 16%, transparent)',
      }} />

      {/* name tag - top-left, inset so it never clips */}
      <div style={{
        position: 'absolute', top: Math.max(rect.top + 4, 4), left: rect.left + 4,
        display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: rect.width - 8,
        padding: '2px 8px', borderRadius: 6, background: 'var(--vb-accent)', color: 'var(--vb-accent-text)',
        fontSize: 11, fontWeight: 700, lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</div>

      {/* grip + duplicate handles - top-right (visual in step 2, wired in step 3) */}
      <div style={{ position: 'absolute', top: Math.max(rect.top + 4, 4), left: rect.left + rect.width - 52, display: 'inline-flex', gap: 4 }}>
        <Handle title="Drag to reorder (arrives with editing)"><GripIcon /></Handle>
        <Handle title="Duplicate (arrives with editing)"><DupeIcon /></Handle>
      </div>
    </>
  );
}

function FocusRing({ rect }: { rect: BlockRect }): React.ReactElement {
  return (
    <div style={{
      position: 'absolute', top: rect.top, left: rect.left, width: rect.width, height: rect.height,
      border: '2px dashed color-mix(in srgb, var(--vb-accent) 60%, transparent)', borderRadius: 8, boxSizing: 'border-box',
    }} />
  );
}

function Seam({ y, left, width }: { y: number; left: number; width: number }): React.ReactElement {
  return (
    <div style={{ position: 'absolute', top: y - 9, left, width, height: 18, display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 2, background: 'color-mix(in srgb, var(--vb-accent) 45%, transparent)', borderRadius: 2 }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999, background: 'var(--vb-accent)', color: 'var(--vb-accent-text)', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' }}>
        <PlusIcon /> add block
      </span>
      <div style={{ flex: 1, height: 2, background: 'color-mix(in srgb, var(--vb-accent) 45%, transparent)', borderRadius: 2 }} />
    </div>
  );
}

function Handle({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <span title={title} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
      borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--vb-accent)', color: 'var(--vb-accent)',
    }}>{children}</span>
  );
}

// ---- small style helpers + icons (SVG, never emoji) ----

function iconBtn(active: boolean, disabled = false): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7,
    border: '1px solid ' + (active ? 'var(--vb-accent)' : 'transparent'),
    background: active ? 'color-mix(in srgb, var(--vb-accent) 14%, transparent)' : 'transparent',
    color: active ? 'var(--vb-accent)' : 'var(--text-secondary)',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, padding: 0,
  };
}
function textBtn(primaryDisabled: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 14px', borderRadius: 8,
    fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: primaryDisabled ? 'not-allowed' : 'pointer',
    border: '1px solid ' + (primaryDisabled ? 'var(--border)' : 'var(--border)'),
    background: primaryDisabled ? 'var(--surface-alt)' : 'transparent',
    color: primaryDisabled ? 'var(--text-tertiary)' : 'var(--text-primary)', opacity: primaryDisabled ? 0.7 : 1,
  };
}
function labelFor(type: string): string { return blockSpec(type)?.name ?? type; }

function relTime(iso: string | null): string {
  if (!iso) return 'recently';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'recently';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
function DeviceIcon({ device }: { device: Device }): React.ReactElement {
  if (device === 'desktop') return (<svg width={16} height={16} viewBox="0 0 24 24" {...S}><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>);
  if (device === 'tablet') return (<svg width={16} height={16} viewBox="0 0 24 24" {...S}><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M11 18h2" /></svg>);
  return (<svg width={16} height={16} viewBox="0 0 24 24" {...S}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>);
}
function UndoIcon({ flip }: { flip: boolean }): React.ReactElement {
  return (<svg width={16} height={16} viewBox="0 0 24 24" {...S} style={flip ? { transform: 'scaleX(-1)' } : undefined}><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" /></svg>);
}
function GripIcon(): React.ReactElement {
  return (<svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>);
}
function DupeIcon(): React.ReactElement {
  return (<svg width={14} height={14} viewBox="0 0 24 24" {...S}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>);
}
function PlusIcon(): React.ReactElement {
  return (<svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>);
}
