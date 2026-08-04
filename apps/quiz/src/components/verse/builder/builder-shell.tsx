'use client';

// V-BUILDER-2 step 3 - THE BUILDER SHELL + OPTIMISTIC STRUCTURAL EDITS.
// A full-screen fixed takeover: a slim top bar + a same-origin iframe of the draft
// render (/build/{slug}). The overlay reads iframe geometry to select blocks and
// hosts the edit affordances (grip drag, duplicate, delete, "+ add block" seams).
// Structural ops run through useBuilderComposition: optimistic iframe DOM patch +
// background validated save + reconcile-on-reload. undo/redo + "saved Xs ago" live;
// Publish enabled once a draft exists. The overlay only READS iframe geometry; the
// ONLY iframe-DOM writes are the intentional structural ops (co-design 1).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { blockSpec } from '@/lib/verse/composition/registry';
import { useBuilderComposition } from './use-builder-composition';

import type { Composition, Block } from '@/lib/verse/composition/types';

interface BlockRect { id: string; type: string; top: number; left: number; width: number; height: number }
type Device = 'desktop' | 'tablet' | 'phone';
type Zone = Block['zone'];

const DEVICE_W: Record<Device, number | null> = { desktop: null, tablet: 834, phone: 390 };
const TOP_BAR_H = 52;

export function BuilderShell({ groupId, spaceName, draftPath, previewPath, hasDraft, updatedAt, composition, scopeStyle }: {
  groupId: number; spaceName: string; draftPath: string; previewPath: string;
  hasDraft: boolean; updatedAt: string | null; composition: Composition; scopeStyle: Record<string, string>;
}): React.ReactElement {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  const [blocks, setBlocks] = useState<BlockRect[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [grab, setGrab] = useState<{ id: string; originBeforeId: string | null } | null>(null);
  const [deleted, setDeleted] = useState<{ id: string; label: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [, tick] = useState(0);

  const measure = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const next: BlockRect[] = [];
    doc.querySelectorAll<HTMLElement>('[data-block-id]').forEach((el) => {
      const id = el.getAttribute('data-block-id'); if (!id) return;
      const r = el.getBoundingClientRect();
      next.push({ id, type: el.getAttribute('data-block-type') ?? '', top: r.top, left: r.left, width: r.width, height: r.height });
    });
    setBlocks(next);
  }, []);

  const eng = useBuilderComposition({ groupId, initial: composition, iframeRef, onDom: measure });

  // ---- wire the iframe on load: click-to-select + scroll/resize re-measure ----
  const onLoad = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    const win = frame?.contentWindow;
    if (!doc || !win) return;
    const onClick = (e: MouseEvent) => {
      const blockEl = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-block-id]');
      if (!blockEl) return;
      e.preventDefault(); e.stopPropagation();
      const id = blockEl.getAttribute('data-block-id');
      setSelectedId(id); setFocusId(id);
    };
    doc.addEventListener('click', onClick, true);
    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    win.addEventListener('scroll', schedule, { passive: true });
    win.addEventListener('resize', schedule);
    const ro = new ResizeObserver(schedule);
    if (doc.body) ro.observe(doc.body);
    measure();
    frame!.dataset.wired = '1';
    (frame as unknown as { _vbCleanup?: () => void })._vbCleanup = () => {
      doc.removeEventListener('click', onClick, true);
      win.removeEventListener('scroll', schedule); win.removeEventListener('resize', schedule);
      ro.disconnect(); cancelAnimationFrame(raf);
    };
  }, [measure]);

  useEffect(() => () => { (iframeRef.current as unknown as { _vbCleanup?: () => void })?._vbCleanup?.(); }, []);
  useEffect(() => { const t = setTimeout(measure, 80); return () => clearTimeout(t); }, [device, measure]);
  // re-measure whenever the canvas reloads (reconcile) or the composition changes.
  useEffect(() => { const t = setTimeout(measure, 60); return () => clearTimeout(t); }, [eng.reloadKey, eng.composition, measure]);
  // tick the "saved Xs ago" label.
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(i); }, []);
  // auto-dismiss the delete undo toast after 6s.
  useEffect(() => { if (!deleted) return; const t = setTimeout(() => setDeleted(null), 6000); return () => clearTimeout(t); }, [deleted]);

  // ---- op handlers ----
  const zoneIds = useCallback((zone: Zone) => (eng.composition.sections[0]?.blocks ?? []).filter((b) => b.zone === zone).map((b) => b.id), [eng.composition]);
  const doDelete = useCallback((id: string) => {
    if (!eng.canDelete(id)) return;
    const label = labelFor(blocks.find((b) => b.id === id)?.type ?? '');
    eng.remove(id);
    setDeleted({ id, label });
    if (selectedId === id) setSelectedId(null);
  }, [eng, blocks, selectedId]);
  const doInsert = useCallback((zone: Zone, index: number) => {
    const id = eng.insertAt(zone, index);
    if (id) { setSelectedId(id); setFocusId(id); }
  }, [eng]);

  // ---- keyboard: Tab select, Enter select->grab->drop, arrows move in grab, Esc ----
  const orderedIds = useMemo(() => blocks.map((b) => b.id), [blocks]);
  const moveInGrab = useCallback((dir: -1 | 1) => {
    if (!grab) return;
    const ids = zoneIds(eng.zoneOf(grab.id) ?? 'main');
    const j = ids.indexOf(grab.id); if (j < 0) return;
    if (dir === -1 && j > 0) eng.reorderBefore(grab.id, ids[j - 1]!);
    else if (dir === 1 && j < ids.length - 1) eng.reorderBefore(grab.id, ids[j + 2] ?? null);
  }, [grab, eng, zoneIds]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (grab) { eng.reorderBefore(grab.id, grab.originBeforeId); setGrab(null); }
        else { setSelectedId(null); setFocusId(null); }
        return;
      }
      if (grab) {
        if (e.key === 'ArrowUp') { e.preventDefault(); moveInGrab(-1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); moveInGrab(1); }
        else if (e.key === 'Enter') { e.preventDefault(); setGrab(null); }
        return;
      }
      if (e.key === 'Tab' && orderedIds.length) {
        e.preventDefault();
        const cur = focusId ?? selectedId;
        const idx = cur ? orderedIds.indexOf(cur) : -1;
        const nextIdx = e.shiftKey ? (idx <= 0 ? orderedIds.length - 1 : idx - 1) : (idx + 1) % orderedIds.length;
        const nextId = orderedIds[nextIdx] ?? null;
        setFocusId(nextId); scrollIntoView(nextId); return;
      }
      if (e.key === 'Enter') {
        if (focusId && focusId !== selectedId) { e.preventDefault(); setSelectedId(focusId); }
        else if (selectedId) {
          // grab: pick up for reorder; record the origin to restore on cancel.
          e.preventDefault();
          const ids = zoneIds(eng.zoneOf(selectedId) ?? 'main');
          const j = ids.indexOf(selectedId);
          setGrab({ id: selectedId, originBeforeId: ids[j + 1] ?? null });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [orderedIds, focusId, selectedId, grab, eng, moveInGrab, zoneIds]);

  const scrollIntoView = useCallback((id: string | null) => {
    if (!id) return;
    iframeRef.current?.contentDocument?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
    requestAnimationFrame(measure);
  }, [measure]);

  // ---- publish ----
  const doPublish = useCallback(async () => {
    if (!window.confirm('Publish your draft? This replaces the live space page for everyone.')) return;
    setPublishing(true); setPublishMsg(null);
    try {
      const r = await fetch('/api/verse/presentation/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId }),
      });
      const body = (await r.json().catch(() => ({}))) as { errors?: string[] };
      setPublishMsg(r.ok ? 'Published. The live page now matches your draft.' : (body.errors?.[0] ?? `Publish failed (${r.status}).`));
    } catch { setPublishMsg('Could not reach the server.'); }
    finally { setPublishing(false); }
  }, [groupId]);

  // ---- derived ----
  const selected = blocks.find((b) => b.id === selectedId) ?? null;
  const focused = focusId && focusId !== selectedId ? blocks.find((b) => b.id === focusId) ?? null : null;
  const width = DEVICE_W[device];
  const hasDraftNow = hasDraft || eng.savedAt !== null;
  const savedLabel = eng.saving ? 'Saving…'
    : eng.savedAt ? `Saved ${relTime(new Date(eng.savedAt).toISOString())}`
    : hasDraft ? `Draft saved ${relTime(updatedAt)}` : 'No unpublished changes';
  const mainRects = eng.mainIds.map((id) => blocks.find((b) => b.id === id)).filter(Boolean) as BlockRect[];

  return (
    <div className="vb-shell" style={{
      position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary)', color: 'var(--text-primary)', ...scopeStyle,
      ['--vb-accent' as string]: 'var(--verse-accent, var(--brand))',
      ['--vb-accent-text' as string]: 'var(--verse-accent-text, var(--accent-fg))',
    }}>
      {/* ---- slim top bar ---- */}
      <div style={{ height: TOP_BAR_H, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          {spaceName} <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>· Builder</span>
        </span>
        <Divider />
        <div role="group" aria-label="Preview device" style={{ display: 'inline-flex', gap: 2 }}>
          {(['desktop', 'tablet', 'phone'] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} aria-label={d} title={d[0]!.toUpperCase() + d.slice(1)} style={iconBtn(device === d)}><DeviceIcon device={d} /></button>
          ))}
        </div>
        <Divider />
        <div role="group" aria-label="History" style={{ display: 'inline-flex', gap: 2 }}>
          <button type="button" onClick={eng.undo} disabled={!eng.canUndo} aria-label="Undo" title="Undo" style={iconBtn(false, !eng.canUndo)}><UndoIcon flip={false} /></button>
          <button type="button" onClick={eng.redo} disabled={!eng.canRedo} aria-label="Redo" title="Redo" style={iconBtn(false, !eng.canRedo)}><UndoIcon flip /></button>
        </div>
        <span aria-live="polite" style={{ fontSize: 12, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{savedLabel}</span>
        <div style={{ flex: 1 }} />
        <a href={previewPath} target="_blank" rel="noreferrer" style={textBtn('secondary')}>Preview</a>
        <button type="button" onClick={doPublish} disabled={!hasDraftNow || publishing} title={hasDraftNow ? 'Publish your draft to the live page' : 'Nothing to publish yet'} style={textBtn(hasDraftNow && !publishing ? 'primary' : 'disabled')}>
          {publishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>

      {/* ---- canvas stage ---- */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', background: 'var(--surface-alt)' }}>
        <div style={{ position: 'relative', width: width ? `${width}px` : '100%', maxWidth: '100%', height: '100%', boxShadow: width ? '0 0 0 1px var(--border)' : 'none', background: 'var(--bg-primary)' }}>
          <iframe key={eng.reloadKey} ref={iframeRef} src={draftPath} title={`${spaceName} builder canvas`} onLoad={onLoad}
            style={{ width: '100%', height: '100%', border: 0, display: 'block', background: 'var(--bg-primary)' }} />

          {/* overlay: pointer-events:none so canvas clicks fall through; interactive
              affordances opt back in with pointer-events:auto. */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {focused ? <FocusRing rect={focused} /> : null}
            {selected ? (
              <Selection
                rect={selected}
                grabbing={grab?.id === selected.id}
                canDelete={eng.canDelete(selected.id)}
                onGripDragStart={() => setDragId(selected.id)}
                onGripDragEnd={() => setDragId(null)}
                onDuplicate={() => { const nid = eng.duplicate(selected.id); if (nid) { setSelectedId(nid); setFocusId(nid); } }}
                onDelete={() => doDelete(selected.id)}
                onInsertAbove={() => doInsert(selected.type ? (eng.zoneOf(selected.id) ?? 'main') : 'main', eng.indexInZone(selected.id))}
                onInsertBelow={() => doInsert(eng.zoneOf(selected.id) ?? 'main', eng.indexInZone(selected.id) + 1)}
              />
            ) : null}
            {/* drop seams shown while dragging a block */}
            {dragId ? <DropSeams rects={mainRects} dragId={dragId} onDrop={(beforeId) => { eng.reorderBefore(dragId, beforeId); setDragId(null); }} /> : null}
          </div>

          {/* status line */}
          <div role="status" aria-live="polite" style={{ position: 'absolute', left: 10, bottom: 10, pointerEvents: 'none', fontSize: 11, color: 'var(--text-tertiary)' }}>
            {grab ? `Moving ${labelFor(blocks.find((b) => b.id === grab.id)?.type ?? '')} · arrows move · Enter drop · Esc cancel`
              : selected ? `Selected: ${labelFor(selected.type)}`
              : blocks.length ? `${blocks.length} blocks · click one to select` : 'Loading canvas…'}
          </div>
        </div>
      </div>

      {/* ---- toasts ---- */}
      {eng.error ? <Toast tone="error" onClose={eng.clearError}>{eng.error}</Toast> : null}
      {deleted ? <Toast tone="neutral" onClose={() => setDeleted(null)} action={{ label: 'Undo', onClick: () => { eng.undo(); setDeleted(null); } }}>{deleted.label} deleted</Toast> : null}
      {publishMsg ? <Toast tone="neutral" onClose={() => setPublishMsg(null)}>{publishMsg}</Toast> : null}
    </div>
  );
}

// ---- overlay pieces (iframe-viewport coordinates) ----

function Selection({ rect, grabbing, canDelete, onGripDragStart, onGripDragEnd, onDuplicate, onDelete, onInsertAbove, onInsertBelow }: {
  rect: BlockRect; grabbing: boolean; canDelete: boolean;
  onGripDragStart: () => void; onGripDragEnd: () => void; onDuplicate: () => void; onDelete: () => void;
  onInsertAbove: () => void; onInsertBelow: () => void;
}): React.ReactElement {
  return (
    <>
      <Seam y={rect.top} left={rect.left} width={rect.width} onClick={onInsertAbove} />
      <Seam y={rect.top + rect.height} left={rect.left} width={rect.width} onClick={onInsertBelow} />
      <div style={{
        position: 'absolute', top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxSizing: 'border-box',
        border: `2px ${grabbing ? 'dashed' : 'solid'} var(--vb-accent)`, borderRadius: 8,
        boxShadow: grabbing ? '0 0 0 6px color-mix(in srgb, var(--vb-accent) 22%, transparent)' : '0 0 0 4px color-mix(in srgb, var(--vb-accent) 16%, transparent)',
      }} />
      <div style={{ position: 'absolute', top: Math.max(rect.top + 4, 4), left: rect.left + 4, display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: rect.width - 8, padding: '2px 8px', borderRadius: 6, background: 'var(--vb-accent)', color: 'var(--vb-accent-text)', fontSize: 11, fontWeight: 700, lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{labelFor(rect.type)}</div>
      <div style={{ position: 'absolute', top: Math.max(rect.top + 4, 4), left: rect.left + rect.width - (canDelete ? 82 : 56), display: 'inline-flex', gap: 4, pointerEvents: 'auto' }}>
        <button type="button" draggable onDragStart={onGripDragStart} onDragEnd={onGripDragEnd} title="Drag to reorder (or select + Enter to grab)" aria-label="Drag to reorder" style={handleBtn('grab')}><GripIcon /></button>
        <button type="button" onClick={onDuplicate} title="Duplicate" aria-label="Duplicate block" style={handleBtn()}><DupeIcon /></button>
        {canDelete ? <button type="button" onClick={onDelete} title="Delete" aria-label="Delete block" style={handleBtn()}><TrashIcon /></button> : null}
      </div>
    </>
  );
}

function FocusRing({ rect }: { rect: BlockRect }): React.ReactElement {
  return <div style={{ position: 'absolute', top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxSizing: 'border-box', border: '2px dashed color-mix(in srgb, var(--vb-accent) 60%, transparent)', borderRadius: 8 }} />;
}

function DropSeams({ rects, dragId, onDrop }: { rects: BlockRect[]; dragId: string; onDrop: (beforeId: string | null) => void }): React.ReactElement {
  // a drop zone before each main block + one after the last; beforeId = the block below.
  const zones: { y: number; left: number; width: number; beforeId: string | null }[] = [];
  rects.forEach((r) => zones.push({ y: r.top, left: r.left, width: r.width, beforeId: r.id }));
  const last = rects[rects.length - 1];
  if (last) zones.push({ y: last.top + last.height, left: last.left, width: last.width, beforeId: null });
  return (
    <>
      {zones.map((z, i) => (
        <div key={i} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }} onDrop={(e) => { e.preventDefault(); if (z.beforeId !== dragId) onDrop(z.beforeId); }}
          style={{ position: 'absolute', top: z.y - 12, left: z.left, width: z.width, height: 24, pointerEvents: 'auto', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'color-mix(in srgb, var(--vb-accent) 55%, transparent)' }} />
        </div>
      ))}
    </>
  );
}

function Seam({ y, left, width, onClick }: { y: number; left: number; width: number; onClick: () => void }): React.ReactElement {
  return (
    <div style={{ position: 'absolute', top: y - 9, left, width, height: 18, display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
      <div style={{ flex: 1, height: 2, background: 'color-mix(in srgb, var(--vb-accent) 45%, transparent)', borderRadius: 2 }} />
      <button type="button" onClick={onClick} title="Add a block here" aria-label="Add a block here" style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 7px', borderRadius: 999, background: 'var(--vb-accent)', color: 'var(--vb-accent-text)', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer' }}><PlusIcon /> add block</button>
      <div style={{ flex: 1, height: 2, background: 'color-mix(in srgb, var(--vb-accent) 45%, transparent)', borderRadius: 2 }} />
    </div>
  );
}

function Toast({ tone, onClose, action, children }: { tone: 'error' | 'neutral'; onClose: () => void; action?: { label: string; onClick: () => void }; children: React.ReactNode }): React.ReactElement {
  return (
    <div role="alert" style={{ position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 70, display: 'inline-flex', alignItems: 'center', gap: 12, maxWidth: 'min(92vw, 560px)', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--bg-surface)', border: `1px solid ${tone === 'error' ? 'color-mix(in srgb, red 40%, var(--border))' : 'var(--border)'}`, boxShadow: '0 8px 30px color-mix(in srgb, black 18%, transparent)' }}>
      <span style={{ color: tone === 'error' ? 'color-mix(in srgb, red 70%, var(--text-primary))' : 'var(--text-primary)' }}>{children}</span>
      {action ? <button type="button" onClick={action.onClick} style={{ border: 'none', background: 'transparent', color: 'var(--vb-accent)', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>{action.label}</button> : null}
      <button type="button" onClick={onClose} aria-label="Dismiss" style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ---- style helpers + icons ----
function Divider(): React.ReactElement { return <div style={{ width: 1, height: 22, background: 'var(--border)' }} aria-hidden />; }
function iconBtn(active: boolean, disabled = false): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, border: '1px solid ' + (active ? 'var(--vb-accent)' : 'transparent'), background: active ? 'color-mix(in srgb, var(--vb-accent) 14%, transparent)' : 'transparent', color: active ? 'var(--vb-accent)' : 'var(--text-secondary)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, padding: 0 };
}
function textBtn(kind: 'primary' | 'secondary' | 'disabled'): React.CSSProperties {
  const disabled = kind === 'disabled';
  return { display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 14px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', cursor: disabled ? 'not-allowed' : 'pointer', border: '1px solid ' + (kind === 'primary' ? 'transparent' : 'var(--border)'), background: kind === 'primary' ? 'var(--vb-accent)' : disabled ? 'var(--surface-alt)' : 'transparent', color: kind === 'primary' ? 'var(--vb-accent-text)' : disabled ? 'var(--text-tertiary)' : 'var(--text-primary)', opacity: disabled ? 0.7 : 1 };
}
function handleBtn(cursor: 'pointer' | 'grab' = 'pointer'): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 6, background: 'var(--bg-surface)', border: '1px solid var(--vb-accent)', color: 'var(--vb-accent)', cursor, padding: 0 };
}
function labelFor(type: string): string { return blockSpec(type)?.name ?? type; }
function relTime(iso: string | null): string {
  if (!iso) return 'recently';
  const t = new Date(iso).getTime(); if (Number.isNaN(t)) return 'recently';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 5) return 'just now'; if (s < 60) return `${s}s ago`;
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
function UndoIcon({ flip }: { flip: boolean }): React.ReactElement { return (<svg width={16} height={16} viewBox="0 0 24 24" {...S} style={flip ? { transform: 'scaleX(-1)' } : undefined}><path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-1" /></svg>); }
function GripIcon(): React.ReactElement { return (<svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>); }
function DupeIcon(): React.ReactElement { return (<svg width={14} height={14} viewBox="0 0 24 24" {...S}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>); }
function TrashIcon(): React.ReactElement { return (<svg width={14} height={14} viewBox="0 0 24 24" {...S}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>); }
function PlusIcon(): React.ReactElement { return (<svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>); }
