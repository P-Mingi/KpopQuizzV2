'use client';

// V-BUILDER-2 step 3 - THE OPTIMISTIC STRUCTURAL-EDIT ENGINE.
// Holds the draft composition as client state and applies four ops (reorder,
// duplicate, delete, insert). Each op is OPTIMISTIC: it patches the same-origin
// iframe DOM instantly (~ms), updates client state, and schedules a background
// VALIDATED save on the existing draft rail (POST /api/verse/presentation). A
// validator rejection surfaces its human sentence and REVERTS to the last saved
// state (reloading the canvas = iframe-truth reconcile). Undo/redo covers every op.
// Ids are the persisted stable ids from 3.0; a new block mints crypto.randomUUID.
import { useCallback, useMemo, useRef, useState } from 'react';

import { compositionToPresentation } from '@/lib/verse/composition/convert';
import { blockSpec } from '@/lib/verse/composition/registry';
import { blockBoxStyle } from '@/lib/verse/composition/block-style';

import type { Composition, Block, BlockStyle } from '@/lib/verse/composition/types';

export interface StylePatch {
  frame?: string;
  background?: string | null;
  radius?: string;
  density?: string;
  accent?: string | null;
  textScale?: string | null;
  divider?: string;
}

type Zone = Block['zone'];
const HISTORY_MAX = 50;
const SAVE_DEBOUNCE_MS = 350;
const INSERT_TYPE = 'quote';           // step-4 library replaces this; a real renderer
const INSERT_PROPS = { text: 'New quote block' };

const flat = (c: Composition): Block[] => c.sections[0]?.blocks ?? [];
const withBlocks = (c: Composition, blocks: Block[]): Composition =>
  ({ ...c, sections: [{ ...(c.sections[0] ?? { id: 'home', width: 'wide' as const }), blocks }] });
const zoneBlocks = (blocks: Block[], zone: Zone) => blocks.filter((b) => b.zone === zone);
// rebuild the flat array so `zone`'s blocks follow newOrder, other zones untouched.
const rebuildZone = (blocks: Block[], zone: Zone, newOrder: Block[]): Block[] => {
  let i = 0;
  return blocks.map((b) => (b.zone === zone ? newOrder[i++]! : b));
};

// The OPTIMISTIC placeholder for a freshly inserted block: a labeled soft box that
// stands in until the reconcile reload renders the real module. Empty-source blocks
// stay a labeled strip in the builder (min-gated to nothing only at publish).
function buildPlaceholder(d: Document, id: string, type: string): HTMLElement {
  const wrap = d.createElement('div');
  wrap.setAttribute('data-block-id', id);
  wrap.setAttribute('data-block-type', type);
  wrap.className = 'vb-block vb-inserted';
  const name = blockSpec(type)?.name ?? type;
  const inner = d.createElement('div');
  inner.className = 'v-module';
  inner.style.cssText = 'min-height:2rem;opacity:.7;font-weight:600;padding:.4rem 0';
  inner.textContent = name;
  wrap.appendChild(inner);
  return wrap;
}

// Apply a block's per-block style to its canvas element OPTIMISTICALLY (on the outer
// handle; the reconcile reload places it exactly on the inner frame). Clears the last
// values first so a change back to default removes cleanly. Tokens only.
function applyBlockStyleToEl(e: HTMLElement, style: BlockStyle): void {
  e.style.removeProperty('--verse-accent');
  e.style.background = ''; e.style.borderRadius = ''; e.style.padding = ''; e.style.fontSize = '';
  const box = blockBoxStyle({ background: style.background, radius: style.radius, density: style.density, accent: style.accent, textScale: style.text?.size });
  for (const [k, v] of Object.entries(box)) {
    if (k.startsWith('--')) e.style.setProperty(k, v);
    else (e.style as unknown as Record<string, string>)[k] = v;
  }
  const base = e.className.split(/\s+/).filter((c) => c && !/^verse-frame/.test(c)).join(' ');
  e.className = style.frame && style.frame !== 'none' ? `${base} verse-frame verse-frame-${style.frame}` : base;
}

export interface BuilderEngine {
  composition: Composition;
  mainIds: string[];
  zoneOf: (id: string) => Zone | null;
  indexInZone: (id: string) => number;
  canDelete: (id: string) => boolean;
  reorderBefore: (id: string, beforeId: string | null) => void;
  duplicate: (id: string) => string | null;
  remove: (id: string) => void;
  insertAt: (zone: Zone, index: number, type?: string, props?: Record<string, unknown>) => string | null;
  insertBlocks: (zone: Zone, index: number, specs: { type: string; props?: Record<string, unknown> }[]) => string[];
  setStyle: (id: string, patch: StylePatch) => void;
  styleOf: (id: string) => BlockStyle;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  savedAt: number | null;
  error: string | null;
  clearError: () => void;
  lastOpMs: number | null;
  reloadKey: number;
}

export function useBuilderComposition({ groupId, initial, iframeRef, onDom }: {
  groupId: number;
  initial: Composition;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onDom: () => void;
}): BuilderEngine {
  const [composition, setComposition] = useState<Composition>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastOpMs, setLastOpMs] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [, forceHist] = useState(0);

  const pastRef = useRef<Composition[]>([]);
  const futureRef = useRef<Composition[]>([]);
  const savedRef = useRef<Composition>(initial);
  // The live composition, updated SYNCHRONOUSLY on every op so rapid successive edits
  // (e.g. clicking several style controls fast) each build on the previous one instead
  // of a stale render-time closure. Kept in sync with the `composition` state.
  const liveRef = useRef<Composition>(initial);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Composition | null>(null);
  const bump = () => forceHist((n) => n + 1);
  const reload = () => setReloadKey((k) => k + 1);
  // Cancel any in-flight debounced save. Undo/redo + revert commit their OWN target
  // immediately, so a stale debounced save from the op being undone must not fire
  // afterwards and clobber it (that race left an undone delete looking un-undone).
  const cancelPendingSave = useCallback(() => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    pendingRef.current = null;
  }, []);

  // ---- iframe DOM helpers (same-origin; the optimistic layer) ----
  const doc = () => iframeRef.current?.contentDocument ?? null;
  const el = (id: string) => doc()?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"]`) ?? null;
  const zoneContainer = (zone: Zone): HTMLElement | null => {
    const d = doc(); if (!d) return null;
    // main blocks live in .lg:col-span-2, side blocks in the aside's sticky column.
    return zone === 'side'
      ? d.querySelector<HTMLElement>('aside .lg\\:sticky') ?? d.querySelector<HTMLElement>('aside')
      : d.querySelector<HTMLElement>('.lg\\:col-span-2');
  };

  // ---- the save rail (validated draft persistence) ----
  const commit = useCallback(async (comp: Composition): Promise<boolean> => {
    setSaving(true);
    try {
      const presentation = compositionToPresentation(comp);
      const r = await fetch('/api/verse/presentation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, presentation }),
      });
      if (r.ok) { savedRef.current = comp; setSavedAt(Date.now()); setError(null); return true; }
      const body = (await r.json().catch(() => ({}))) as { errors?: string[] };
      setError(body.errors?.[0] ?? `Save failed (${r.status}). The change was reverted.`);
      return false;
    } catch {
      setError('Could not reach the server. The change was reverted.');
      return false;
    } finally { setSaving(false); }
  }, [groupId]);

  // revert the optimistic change: restore the last SAVED state + reconcile the iframe.
  const hardReset = useCallback(() => {
    cancelPendingSave();
    liveRef.current = savedRef.current;
    setComposition(savedRef.current);
    pastRef.current = []; futureRef.current = []; bump();
    reload();
  }, [cancelPendingSave]);

  const flushSave = useCallback(async () => {
    const comp = pendingRef.current; pendingRef.current = null;
    if (!comp) return;
    const ok = await commit(comp);
    if (!ok) hardReset();
  }, [commit, hardReset]);

  const scheduleSave = useCallback((next: Composition) => {
    pendingRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flushSave(); }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  // ---- apply one optimistic op: history -> DOM patch (timed) -> state -> save ----
  const applyOp = useCallback((next: Composition, domPatch: () => void) => {
    pastRef.current.push(liveRef.current);
    if (pastRef.current.length > HISTORY_MAX) pastRef.current.shift();
    liveRef.current = next;
    setComposition(next);
    futureRef.current = [];
    const t0 = performance.now();
    try { domPatch(); } catch { /* reconcile-on-reload heals any DOM slip */ }
    const ms = Math.round((performance.now() - t0) * 1000) / 1000;
    setLastOpMs(ms);
    // op-latency telemetry (the optimistic DOM patch; save is async + off this path).
    if (typeof console !== 'undefined') console.log(`[vb] structural DOM patch ${ms}ms`);
    bump();
    onDom();
    scheduleSave(next);
  }, [onDom, scheduleSave]);

  // ---- the four ops ----
  // Reorder `id` to sit just before `beforeId` in its zone (null = end of zone). One
  // primitive drives both the seam drop targets and the keyboard grab mode, so there
  // is no off-by-one between the client array and the iframe DOM.
  const reorderBefore = useCallback((id: string, beforeId: string | null) => {
    if (id === beforeId) return;
    const blocks = flat(liveRef.current);
    const block = blocks.find((b) => b.id === id); if (!block) return;
    const others = zoneBlocks(blocks, block.zone).filter((b) => b.id !== id);
    let at = beforeId ? others.findIndex((b) => b.id === beforeId) : others.length;
    if (at < 0) at = others.length;
    others.splice(at, 0, block);
    const next = withBlocks(liveRef.current, rebuildZone(blocks, block.zone, others));
    applyOp(next, () => {
      const e = el(id); if (!e || !e.parentElement) return;
      const beforeEl = beforeId ? el(beforeId) : null;
      e.parentElement.insertBefore(e, beforeEl && beforeEl.parentElement === e.parentElement ? beforeEl : null);
    });
  }, [composition, applyOp]);

  const duplicate = useCallback((id: string): string | null => {
    const blocks = flat(liveRef.current);
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return null;
    const newId = crypto.randomUUID();
    const clone: Block = { ...structuredClone(blocks[idx]!), id: newId };
    const next = withBlocks(liveRef.current, [...blocks.slice(0, idx + 1), clone, ...blocks.slice(idx + 1)]);
    applyOp(next, () => {
      const e = el(id); if (!e || !e.parentElement) return;
      const c = e.cloneNode(true) as HTMLElement;
      c.setAttribute('data-block-id', newId);
      e.parentElement.insertBefore(c, e.nextSibling);
    });
    return newId;
  }, [composition, applyOp]);

  const remove = useCallback((id: string) => {
    const blocks = flat(liveRef.current);
    const block = blocks.find((b) => b.id === id); if (!block) return;
    if (blockSpec(block.type)?.seoCritical) return; // core content is not deletable
    const next = withBlocks(liveRef.current, blocks.filter((b) => b.id !== id));
    applyOp(next, () => { el(id)?.remove(); });
  }, [composition, applyOp]);

  // Style op (step 5): merge a token-governed patch into the block's style, apply it to
  // the canvas optimistically, and save through the same validated rail. A rejection
  // reverts (hardReset) + surfaces the sentence, exactly like a structural op.
  const setStyle = useCallback((id: string, patch: StylePatch) => {
    const blocks = flat(liveRef.current);
    const idx = blocks.findIndex((b) => b.id === id); if (idx < 0) return;
    const cur: BlockStyle = blocks[idx]!.style ?? {};
    const style: BlockStyle = { ...cur };
    if (patch.frame !== undefined) style.frame = patch.frame as NonNullable<BlockStyle['frame']>;
    if (patch.background !== undefined) style.background = patch.background;
    if (patch.radius !== undefined) style.radius = patch.radius as NonNullable<BlockStyle['radius']>;
    if (patch.density !== undefined) style.density = patch.density as NonNullable<BlockStyle['density']>;
    if (patch.accent !== undefined) style.accent = patch.accent;
    if (patch.textScale !== undefined) { if (patch.textScale) style.text = { ...(cur.text ?? {}), size: patch.textScale as 'S' | 'M' | 'L' }; else delete style.text; }
    if (patch.divider !== undefined) style.divider = patch.divider as NonNullable<BlockStyle['divider']>;
    const next = withBlocks(liveRef.current, blocks.map((b, i) => (i === idx ? { ...b, style } : b)));
    applyOp(next, () => { const e = el(id); if (e) applyBlockStyleToEl(e, style); });
  }, [composition, applyOp]);

  // Insert one or more fresh blocks at a zone index. A PATTERN insert is just many
  // specs: each block gets its OWN crypto.randomUUID + is placed independently, so the
  // group DISSOLVES on arrival - every inserted block is selectable/movable/deletable.
  const insertBlocks = useCallback((zone: Zone, index: number, specs: { type: string; props?: Record<string, unknown> }[]): string[] => {
    if (!specs.length) return [];
    const blocks = flat(liveRef.current);
    const made: Block[] = specs.map((s) => (s.props ? { id: crypto.randomUUID(), type: s.type, zone, props: s.props } : { id: crypto.randomUUID(), type: s.type, zone }));
    const z = zoneBlocks(blocks, zone);
    const anchor = z[index] ?? null;
    let arr: Block[];
    if (anchor) { const ai = blocks.indexOf(anchor); arr = [...blocks.slice(0, ai), ...made, ...blocks.slice(ai)]; }
    else if (z.length) { const li = blocks.indexOf(z[z.length - 1]!); arr = [...blocks.slice(0, li + 1), ...made, ...blocks.slice(li + 1)]; }
    else arr = [...blocks, ...made];
    const next = withBlocks(liveRef.current, arr);
    applyOp(next, () => {
      const d = doc(); if (!d) return;
      const anchorEl = anchor ? el(anchor.id) : null;
      const parent = anchorEl?.parentElement ?? zoneContainer(zone);
      for (const b of made) {
        const ph = buildPlaceholder(d, b.id, b.type);
        if (anchorEl && parent && parent === anchorEl.parentElement) parent.insertBefore(ph, anchorEl);
        else parent?.appendChild(ph);
      }
    });
    return made.map((b) => b.id);
  }, [composition, applyOp]);

  const insertAt = useCallback((zone: Zone, index: number, type: string = INSERT_TYPE, props: Record<string, unknown> = { ...INSERT_PROPS }): string | null =>
    insertBlocks(zone, index, [{ type, props }])[0] ?? null,
  [insertBlocks]);

  // ---- undo / redo (structure changes -> reconcile via reload after the save) ----
  const undo = useCallback(() => {
    const prev = pastRef.current.pop(); if (!prev) return;
    cancelPendingSave();
    futureRef.current.push(liveRef.current); bump();
    liveRef.current = prev;
    setComposition(prev);
    void commit(prev).then((ok) => (ok ? reload() : hardReset()));
  }, [commit, hardReset, cancelPendingSave]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop(); if (!next) return;
    cancelPendingSave();
    pastRef.current.push(liveRef.current); bump();
    liveRef.current = next;
    setComposition(next);
    void commit(next).then((ok) => (ok ? reload() : hardReset()));
  }, [commit, hardReset, cancelPendingSave]);

  // ---- derived ----
  const mainIds = useMemo(() => zoneBlocks(flat(liveRef.current), 'main').map((b) => b.id), [composition]);
  const zoneOf = useCallback((id: string) => flat(liveRef.current).find((b) => b.id === id)?.zone ?? null, [composition]);
  const indexInZone = useCallback((id: string) => {
    const b = flat(liveRef.current).find((x) => x.id === id); if (!b) return -1;
    return zoneBlocks(flat(liveRef.current), b.zone).findIndex((x) => x.id === id);
  }, [composition]);
  const canDelete = useCallback((id: string) => {
    const b = flat(liveRef.current).find((x) => x.id === id);
    return !!b && !blockSpec(b.type)?.seoCritical;
  }, [composition]);
  const styleOf = useCallback((id: string): BlockStyle => flat(liveRef.current).find((b) => b.id === id)?.style ?? {}, [composition]);

  return {
    composition, mainIds, zoneOf, indexInZone, canDelete, styleOf,
    reorderBefore, duplicate, remove, insertAt, insertBlocks, setStyle,
    undo, redo, canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0,
    saving, savedAt, error, clearError: () => setError(null), lastOpMs, reloadKey,
  };
}
