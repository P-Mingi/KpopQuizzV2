'use client';

// V-FOUNDATION F2 Phase 3 - THE WRITING SURFACE (locked prototype). Type-in-place blocks;
// Enter splits at the caret, Backspace merges up; markdown shortcuts; the slash palette
// (skeleton kinds, widgets locked); the floating selection toolbar; the [[ page picker
// (existing -> solid, unknown -> ghost, both feed page_links); the gutter (+ / grip) with the
// block menu (turn/duplicate/move/delete with a 6 s undo). Storage is always the run model
// (blocks.ts) - the DOM is only the live edit surface; autosave serializes DOM -> runs ->
// the F1 CRUD save rail (a revision per save, C3). The frame (TOC/meter/history/rail/publish)
// is Phase 4; this file is the editing core it wraps.
import { createElement, useCallback, useEffect, useRef, useState } from 'react';

import { htmlFromRuns, runsFromEl } from '@/lib/verse/tree/runs';
import type { Run } from '@/lib/verse/tree/blocks';

type Kind = 'paragraph' | 'heading' | 'list' | 'quote' | 'callout' | 'divider' | 'image' | 'table' | 'link';
interface EB { id: string; type: Kind; level?: 2 | 3; content?: Run[]; items?: Run[][]; cite?: string; icon?: string; path?: string; alt?: string; caption?: string; rows?: string[][]; to_slug?: string; label?: string }

let SEQ = 0;
const nid = (): string => `b${Date.now().toString(36)}${(SEQ += 1)}`;
const TEXT_KINDS: Kind[] = ['paragraph', 'heading', 'quote', 'callout'];
const isText = (t: Kind): boolean => TEXT_KINDS.includes(t);

const PALETTE: { t: Kind | 'x'; ic: string; l: string; d: string; lock?: boolean; level?: 2 | 3 }[] = [
  { t: 'paragraph', ic: '¶', l: 'Text', d: 'Body prose' },
  { t: 'heading', ic: 'H2', l: 'Section heading', d: 'Feeds the outline', level: 2 },
  { t: 'heading', ic: 'H3', l: 'Sub-heading', d: 'Level 3', level: 3 },
  { t: 'list', ic: '•', l: 'List', d: 'Bulleted' },
  { t: 'quote', ic: '“', l: 'Quote', d: 'With attribution' },
  { t: 'callout', ic: '\u{1F4A1}', l: 'Callout', d: 'A highlighted note' },
  { t: 'divider', ic: '─', l: 'Divider', d: 'A thin rule' },
  { t: 'image', ic: '\u{1F4F7}', l: 'Image', d: 'Via the moderated rail' },
  { t: 'table', ic: '⊞', l: 'Table', d: 'Simple data' },
  { t: 'link', ic: '[[', l: 'Page link', d: 'Existing or ghost' },
  { t: 'x', ic: '⏱', l: 'Timeline', d: 'soon', lock: true },
  { t: 'x', ic: '\u{1F310}', l: 'Atlas', d: 'soon', lock: true },
  { t: 'x', ic: '▪', l: 'Stickers', d: 'soon', lock: true },
  { t: 'x', ic: '\u{1F4CA}', l: 'Data block', d: 'soon', lock: true },
];

export function PageEditor({ groupId, pageId, initialBlocks, onBlocksChange }: {
  groupId: number; pageId: number; initialBlocks: EB[];
  onBlocksChange?: (blocks: EB[]) => void;   // Phase 4 frame subscribes (TOC / meter)
}): React.ReactElement {
  const [blocks, setBlocks] = useState<EB[]>(() => initialBlocks.length ? initialBlocks : [{ id: nid(), type: 'paragraph', content: [] }]);
  const els = useRef<Map<string, HTMLElement>>(new Map());
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [slash, setSlash] = useState<{ id: string; x: number; y: number; q: string; sel: number } | null>(null);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [picker, setPicker] = useState<{ id: string; x: number; y: number; q: string; hits: { slug: string; title: string }[] } | null>(null);
  const [toolbar, setToolbar] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [savedRev, setSavedRev] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // serialize the live DOM of every text block back into the block model.
  const serialize = useCallback((): EB[] => {
    return blocks.map((b) => {
      if (isText(b.type)) { const el = els.current.get(b.id); return el ? { ...b, content: runsFromEl(el) } : b; }
      if (b.type === 'list') { const el = els.current.get(b.id); if (el) return { ...b, items: Array.from(el.querySelectorAll('li')).map((li) => runsFromEl(li as HTMLElement)) }; }
      if (b.type === 'table') { const el = els.current.get(b.id); if (el) return { ...b, rows: Array.from(el.querySelectorAll('tr')).map((tr) => Array.from(tr.querySelectorAll('th,td')).map((c) => (c.textContent ?? '').slice(0, 300))) }; }
      return b;
    });
  }, [blocks]);

  const save = useCallback(async (bs: EB[]) => {
    setSaving(true);
    try {
      const r = await fetch('/api/verse/tree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_id: groupId, action: 'save', page_id: pageId, blocks: { version: 1, blocks: bs } }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.page) setSavedRev((prev) => (prev ?? 0) + 1);
    } finally { setSaving(false); }
  }, [groupId, pageId]);

  const scheduleSave = useCallback(() => {
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(() => { const bs = serialize(); onBlocksChange?.(bs); void save(bs); }, 900);
  }, [serialize, save, onBlocksChange]);

  // set a block's contenteditable initial HTML once per (id) mount.
  const bindEl = useCallback((id: string, kind: Kind, el: HTMLElement | null) => {
    if (!el) { els.current.delete(id); return; }
    els.current.set(id, el);
    if (el.dataset.init === '1') return;
    el.dataset.init = '1';
    const b = blocks.find((x) => x.id === id);
    if (b && isText(kind)) el.innerHTML = htmlFromRuns(b.content);
  }, [blocks]);

  const focusBlock = useCallback((id: string, toEnd = true) => {
    requestAnimationFrame(() => {
      const el = els.current.get(id); if (!el) return;
      el.focus();
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(!toEnd ? true : false);
      const s = getSelection(); s?.removeAllRanges(); s?.addRange(r);
    });
  }, []);

  // structural op helper: serialize -> mutate -> setState -> save.
  const mutate = useCallback((fn: (bs: EB[]) => EB[], focusId?: string) => {
    const next = fn(serialize());
    setBlocks(next); onBlocksChange?.(next);
    if (saveT.current) clearTimeout(saveT.current); saveT.current = setTimeout(() => void save(next), 700);
    if (focusId) focusBlock(focusId);
  }, [serialize, save, focusBlock, onBlocksChange]);

  const insertAfter = useCallback((afterId: string | null, kind: Kind, level?: 2 | 3) => {
    const nb: EB = { id: nid(), type: kind, ...(kind === 'heading' ? { level: level ?? 2 } : {}), ...(isText(kind) ? { content: [] } : {}), ...(kind === 'list' ? { items: [[]] } : {}), ...(kind === 'callout' ? { icon: '\u{1F4A1}' } : {}), ...(kind === 'table' ? { rows: [['', ''], ['', '']] } : {}) };
    mutate((bs) => { const i = afterId ? bs.findIndex((b) => b.id === afterId) : bs.length - 1; return [...bs.slice(0, i + 1), nb, ...bs.slice(i + 1)]; }, isText(kind) || kind === 'list' ? nb.id : undefined);
    return nb.id;
  }, [mutate]);

  const turnInto = useCallback((id: string, kind: Kind, level?: 2 | 3) => {
    mutate((bs) => bs.map((b) => {
      if (b.id !== id) return b;
      const { level: _drop, ...rest } = b;
      return kind === 'heading' ? { ...rest, type: kind, level: level ?? 2 } : { ...rest, type: kind };
    }), id);
    const el = els.current.get(id); if (el) el.dataset.init = '';   // force re-init to the new tag
  }, [mutate]);

  const removeBlock = useCallback((id: string) => {
    const snapshot = serialize();
    const idx = snapshot.findIndex((b) => b.id === id);
    const label = snapshot[idx]?.type ?? 'block';
    mutate((bs) => bs.length > 1 ? bs.filter((b) => b.id !== id) : bs);
    const prev = snapshot[idx - 1]; if (prev) focusBlock(prev.id);
    setToast({ msg: `${label} deleted`, undo: () => { setBlocks(snapshot); onBlocksChange?.(snapshot); void save(snapshot); setToast(null); } });
    setTimeout(() => setToast((t) => (t && t.msg.startsWith(label)) ? null : t), 6000);
  }, [serialize, mutate, focusBlock, save, onBlocksChange]);

  const moveBlock = useCallback((id: string, dir: -1 | 1) => {
    mutate((bs) => { const i = bs.findIndex((b) => b.id === id); const j = i + dir; if (j < 0 || j >= bs.length) return bs; const n = [...bs]; [n[i], n[j]] = [n[j]!, n[i]!]; return n; });
  }, [mutate]);
  const duplicateBlock = useCallback((id: string) => {
    mutate((bs) => { const i = bs.findIndex((b) => b.id === id); if (i < 0) return bs; return [...bs.slice(0, i + 1), { ...structuredClone(bs[i]!), id: nid() }, ...bs.slice(i + 1)]; });
  }, [mutate]);

  // ---- key handling inside a text block ----
  const caretAtStart = (el: HTMLElement): boolean => {
    const s = getSelection(); if (!s || s.rangeCount === 0) return false;
    const r = s.getRangeAt(0).cloneRange(); r.selectNodeContents(el); r.setEnd(s.getRangeAt(0).startContainer, s.getRangeAt(0).startOffset);
    return r.toString().length === 0;
  };
  const onKeyDown = useCallback((e: React.KeyboardEvent, b: EB) => {
    const el = e.currentTarget as HTMLElement;
    if (slash) return;   // the palette owns the keyboard while open
    if (e.key === 'Enter' && !e.shiftKey && b.type !== 'list') {
      e.preventDefault();
      // split at caret: text after the caret moves to a new paragraph below.
      const sel = getSelection(); const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
      let tailRuns: Run[] = [];
      if (range) { const after = range.cloneRange(); after.setEndAfter(el.lastChild ?? el); after.setStart(range.endContainer, range.endOffset); const frag = document.createElement('div'); frag.appendChild(after.extractContents()); tailRuns = runsFromEl(frag); }
      const headRuns = runsFromEl(el);
      const newId = nid();
      mutate((bs) => bs.map((x) => x.id === b.id ? { ...x, content: headRuns } : x).flatMap((x) => x.id === b.id ? [x, { id: newId, type: 'paragraph' as Kind, content: tailRuns }] : [x]), newId);
      els.current.get(b.id)!.dataset.init = '';
      return;
    }
    if (e.key === 'Backspace' && caretAtStart(el)) {
      const idx = blocks.findIndex((x) => x.id === b.id);
      const prev = blocks[idx - 1];
      if (prev && isText(prev.type)) {
        e.preventDefault();
        const cur = runsFromEl(el); const prevRuns = runsFromEl(els.current.get(prev.id)!);
        mutate((bs) => bs.filter((x) => x.id !== b.id).map((x) => x.id === prev.id ? { ...x, content: [...prevRuns, ...cur] } : x));
        els.current.get(prev.id)!.dataset.init = ''; focusBlock(prev.id);
        return;
      }
    }
    if (e.key === '/' && (el.textContent ?? '').trim() === '') {
      const rect = el.getBoundingClientRect();
      setSlash({ id: b.id, x: rect.left, y: rect.bottom + 4, q: '', sel: 0 });
    }
    // Cmd/Ctrl formatting inside a block
    if ((e.metaKey || e.ctrlKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
      e.preventDefault(); document.execCommand(e.key.toLowerCase() === 'b' ? 'bold' : e.key.toLowerCase() === 'i' ? 'italic' : 'underline'); scheduleSave();
    }
  }, [slash, blocks, mutate, focusBlock, scheduleSave]);

  // markdown shortcuts on input (## , ### , - , > , ---)
  const onInput = useCallback((b: EB) => {
    const el = els.current.get(b.id); if (!el) return;
    const t = el.textContent ?? '';
    const md: [RegExp, () => void][] = [
      [/^## $/, () => turnInto(b.id, 'heading', 2)],
      [/^### $/, () => turnInto(b.id, 'heading', 3)],
      [/^- $/, () => turnInto(b.id, 'list')],
      [/^> $/, () => turnInto(b.id, 'quote')],
      [/^---$/, () => { turnInto(b.id, 'divider'); insertAfter(b.id, 'paragraph'); }],
    ];
    for (const [re, act] of md) { if (b.type === 'paragraph' && re.test(t)) { el.innerHTML = ''; act(); return; } }
    if (slash && slash.id === b.id) { const q = t.replace(/^\//, ''); setSlash({ ...slash, q, sel: 0 }); }
    scheduleSave();
  }, [turnInto, insertAfter, slash, scheduleSave]);

  // selection toolbar position
  useEffect(() => {
    const onSel = (): void => {
      const s = getSelection();
      if (!s || s.isCollapsed || s.rangeCount === 0) { setToolbar(null); return; }
      const el = s.anchorNode?.parentElement?.closest('[data-eb]'); if (!el) { setToolbar(null); return; }
      const r = s.getRangeAt(0).getBoundingClientRect();
      setToolbar({ x: r.left + r.width / 2, y: r.top - 44 });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  const fmt = (cmd: 'bold' | 'italic' | 'underline' | 'hl'): void => {
    if (cmd === 'hl') { document.execCommand('insertHTML', false, `<mark>${getSelection()?.toString() ?? ''}</mark>`); }
    else document.execCommand(cmd);
    scheduleSave();
  };
  const openPageLink = (): void => {
    const s = getSelection(); if (!s || s.rangeCount === 0) return;
    const r = s.getRangeAt(0).getBoundingClientRect();
    setPicker({ id: '', x: r.left, y: r.bottom + 6, q: s.toString(), hits: [] });
  };

  // page picker search
  useEffect(() => {
    if (!picker) return;
    const t = setTimeout(() => {
      if (!picker.q.trim()) { setPicker((p) => p ? { ...p, hits: [] } : p); return; }
      fetch(`/api/verse/tree?group_id=${groupId}&kind=search&q=${encodeURIComponent(picker.q)}`).then((r) => r.ok ? r.json() : { results: [] }).then((d) => setPicker((p) => p ? { ...p, hits: d.results ?? [] } : p)).catch(() => {});
    }, 220);
    return () => clearTimeout(t);
  }, [picker?.q, groupId]);

  const applyPageLink = (slug: string, label: string): void => {
    document.execCommand('insertHTML', false, `<a data-slug="${slug}" class="ed-link">${label}</a>`);
    setPicker(null); scheduleSave();
  };

  // slash palette filtered items
  const slashItems = slash ? PALETTE.filter((it) => it.l.toLowerCase().includes(slash.q.toLowerCase())) : [];
  const runSlash = useCallback((it: typeof PALETTE[number]) => {
    if (!slash || it.lock || it.t === 'x') return;
    const el = els.current.get(slash.id); if (el) el.innerHTML = '';
    if (it.t === 'paragraph' || (it.t === 'heading' && el)) turnInto(slash.id, it.t as Kind, it.level);
    else if (isText(it.t as Kind) || it.t === 'list') turnInto(slash.id, it.t as Kind, it.level);
    else { insertAfter(slash.id, it.t as Kind); }
    setSlash(null);
  }, [slash, turnInto, insertAfter]);

  useEffect(() => {
    if (!slash) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { setSlash(null); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlash((s) => s ? { ...s, sel: Math.min(slashItems.length - 1, s.sel + 1) } : s); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSlash((s) => s ? { ...s, sel: Math.max(0, s.sel - 1) } : s); }
      else if (e.key === 'Enter') { e.preventDefault(); const it = slashItems[slash.sel]; if (it) runSlash(it); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [slash, slashItems, runSlash]);

  return (
    <div className="ped">
      <div id="ped-blocks">
        {blocks.map((b) => (
          <BlockRow key={b.id} b={b} bindEl={bindEl} onKeyDown={onKeyDown} onInput={onInput}
            onGrip={(x, y) => setMenu({ id: b.id, x, y })} onAdd={() => { const id = insertAfter(b.id, 'paragraph'); const el = els.current.get(id); if (el) { const rect = el.getBoundingClientRect(); setSlash({ id, x: rect.left, y: rect.bottom + 4, q: '', sel: 0 }); } }}
            groupId={groupId} onImagePath={(path) => mutate((bs) => bs.map((x) => x.id === b.id ? { ...x, path } : x))} />
        ))}
      </div>

      {/* selection toolbar */}
      {toolbar ? (
        <div className="ped-tb" style={{ left: toolbar.x, top: toolbar.y }} onMouseDown={(e) => e.preventDefault()}>
          <button onClick={() => fmt('bold')} title="Bold"><b>B</b></button>
          <button onClick={() => fmt('italic')} title="Italic"><i>I</i></button>
          <button onClick={() => fmt('underline')} title="Underline"><u>U</u></button>
          <button onClick={() => fmt('hl')} title="Highlight">{'✎'}</button>
          <span className="sep" />
          <button className="txt" onClick={() => { const url = prompt('Link URL (https or /path):'); if (url) { document.execCommand('createLink', false, url); scheduleSave(); } }}>{'\u{1F517}'} Link</button>
          <button className="txt" onClick={openPageLink}>[[ Page</button>
        </div>
      ) : null}

      {/* slash palette */}
      {slash ? (
        <div className="ped-slash" style={{ left: slash.x, top: slash.y }} onMouseDown={(e) => e.preventDefault()}>
          <div className="hd">/ <b>{slash.q}</b><span>type to filter</span></div>
          <div className="lst">
            {slashItems.length === 0 ? <div className="none">No block</div> : slashItems.map((it, i) => (
              <button key={it.l} className={`it${i === slash.sel ? ' on' : ''}${it.lock ? ' lock' : ''}`} onClick={() => runSlash(it)} disabled={!!it.lock}>
                <span className="ic">{it.ic}</span><span className="lb"><b>{it.l}</b><span>{it.d}</span></span>{it.lock ? <span className="soon">soon</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* block menu (grip) */}
      {menu ? (
        <>
          <div className="ped-scrim" onClick={() => setMenu(null)} />
          <div className="ped-menu" style={{ left: menu.x, top: menu.y }}>
            <div className="sh">Turn into</div>
            <div className="turn">
              {([['paragraph', '¶'], ['heading', 'H2'], ['heading3', 'H3'], ['list', '•'], ['quote', '“']] as const).map(([k, ic]) => (
                <button key={k} onClick={() => { turnInto(menu.id, k === 'heading3' ? 'heading' : k as Kind, k === 'heading' ? 2 : k === 'heading3' ? 3 : undefined); setMenu(null); }}>{ic}</button>
              ))}
            </div>
            <hr />
            <button className="mi" onClick={() => { duplicateBlock(menu.id); setMenu(null); }}>{'⎘'} Duplicate</button>
            <button className="mi" onClick={() => { moveBlock(menu.id, -1); setMenu(null); }}>{'↑'} Move up</button>
            <button className="mi" onClick={() => { moveBlock(menu.id, 1); setMenu(null); }}>{'↓'} Move down</button>
            <hr />
            <button className="mi danger" onClick={() => { removeBlock(menu.id); setMenu(null); }}>{'\u{1F5D1}'} Delete <span className="kbd">undo 6 s</span></button>
          </div>
        </>
      ) : null}

      {/* page picker */}
      {picker ? (
        <>
          <div className="ped-scrim" onClick={() => setPicker(null)} />
          <div className="ped-pick" style={{ left: picker.x, top: picker.y }}>
            <input autoFocus value={picker.q} placeholder="Link a page..." onChange={(e) => setPicker({ ...picker, q: e.target.value })} />
            <div className="lst">
              {picker.hits.map((h) => <button key={h.slug} onClick={() => applyPageLink(h.slug, picker.q || h.title)}>{h.title} <span>{h.slug}</span></button>)}
              {picker.q.trim() ? <button className="ghost" onClick={() => applyPageLink(picker.q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), picker.q)}>+ Ghost link &ldquo;{picker.q}&rdquo; (creates the page later)</button> : null}
            </div>
          </div>
        </>
      ) : null}

      {toast ? (
        <div className="ped-toast">{toast.msg}{toast.undo ? <button onClick={toast.undo}>Undo</button> : null}</div>
      ) : null}
      <div className="ped-savechip" aria-live="polite">{saving ? 'saving...' : savedRev != null ? 'saved' : ''}</div>
    </div>
  );
}

// one block row: gutter (+ / grip) + the block element.
function BlockRow({ b, bindEl, onKeyDown, onInput, onGrip, onAdd, groupId, onImagePath }: {
  b: EB; bindEl: (id: string, k: Kind, el: HTMLElement | null) => void;
  onKeyDown: (e: React.KeyboardEvent, b: EB) => void; onInput: (b: EB) => void;
  onGrip: (x: number, y: number) => void; onAdd: () => void; groupId: number; onImagePath: (p: string) => void;
}): React.ReactElement {
  const ph = b.type === 'heading' ? (b.level === 3 ? 'Sub-heading' : 'Section heading') : b.type === 'quote' ? 'Quote...' : b.type === 'callout' ? 'Highlighted note...' : 'Write, or press "/" for a block...';
  const ce = (tag: 'p' | 'h2' | 'h3' | 'blockquote' | 'div'): React.ReactElement => createElement(tag, {
    'data-eb': b.id, ref: (el: HTMLElement | null) => bindEl(b.id, b.type, el), className: 'ped-body',
    contentEditable: true, suppressContentEditableWarning: true, spellCheck: false, 'data-ph': ph,
    onKeyDown: (e: React.KeyboardEvent) => onKeyDown(e, b), onInput: () => onInput(b),
  });
  return (
    <div className="ped-blk" data-type={b.type}>
      <div className="ped-gut">
        <button className="add" title="Add a block below" onClick={onAdd}>+</button>
        <button className="grip" title="Block menu" draggable onClick={(e) => onGrip(e.clientX, e.clientY)}>{'⠇'}</button>
      </div>
      {b.type === 'paragraph' ? ce('p')
        : b.type === 'heading' ? ce(b.level === 3 ? 'h3' : 'h2')
        : b.type === 'quote' ? ce('blockquote')
        : b.type === 'callout' ? <div className="ped-callout"><span className="ic">{b.icon ?? '\u{1F4A1}'}</span>{ce('div')}</div>
        : b.type === 'list' ? <ul data-eb={b.id} ref={(el) => bindEl(b.id, 'list', el)} className="ped-body ped-ul" contentEditable suppressContentEditableWarning onKeyDown={(e) => onKeyDown(e, b)} onInput={() => onInput(b)} dangerouslySetInnerHTML={{ __html: (b.items && b.items.length ? b.items : [[]]).map((it) => `<li>${htmlFromRuns(it)}</li>`).join('') }} />
        : b.type === 'divider' ? <hr className="ped-hr" />
        : b.type === 'table' ? <table data-eb={b.id} ref={(el) => bindEl(b.id, 'table', el)} className="ped-tbl" onInput={() => onInput(b)}><tbody dangerouslySetInnerHTML={{ __html: (b.rows && b.rows.length ? b.rows : [['', ''], ['', '']]).map((r, ri) => `<tr>${r.map((c) => `<${ri === 0 ? 'th' : 'td'} contenteditable="true">${c.replace(/</g, '&lt;')}</${ri === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('') }} /></table>
        : b.type === 'image' ? <ImageBlock groupId={groupId} path={b.path} onPick={onImagePath} />
        : b.type === 'link' ? <div className="ped-linkblk">{b.to_slug ? <span>[[ {b.label ?? b.to_slug}</span> : <span className="dim">Empty page link</span>}</div>
        : null}
    </div>
  );
}

function ImageBlock({ groupId, path, onPick }: { groupId: number; path?: string | undefined; onPick: (p: string) => void }): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement | null>(null);
  const upload = async (file: File): Promise<void> => {
    setBusy(true);
    try { const fd = new FormData(); fd.set('file', file); fd.set('group_id', String(groupId)); const r = await fetch('/api/verse/space-image', { method: 'POST', body: fd }); const d = await r.json().catch(() => ({})); if (r.ok && d.path) onPick(d.path); } finally { setBusy(false); }
  };
  if (path) return <div className="ped-imgblk"><img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/verse-space-assets/${path}`} alt="" /></div>;
  return (
    <div className="ped-imgph">
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
      <button onClick={() => ref.current?.click()} disabled={busy}>{busy ? 'Uploading...' : 'Choose via the moderated rail'}</button>
    </div>
  );
}
